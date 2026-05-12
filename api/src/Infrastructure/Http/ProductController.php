<?php
namespace App\Infrastructure\Http;
use App\Infrastructure\Persistence\Database;
use PDO;

class ProductController extends BaseController {

    public function index(): void {
        $db = Database::getConnection();
        
        $currentDay = isset($_GET['day']) ? strtolower($_GET['day']) : strtolower(date('l'));
        $allowedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        if (!in_array($currentDay, $allowedDays)) {
            $currentDay = strtolower(date('l'));
        }
        
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        if ($page < 1) $page = 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
        $search = $_GET['search'] ?? '';
        $branchId = $_GET['branch_id'] ?? null;
        
        $offset = ($page - 1) * $limit;
        
        $where = [];
        $params = [];
        
        if (!empty($search)) {
            $where[] = "(p.name LIKE ? OR c.name LIKE ? OR br.name LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        if (!empty($branchId)) {
             $where[] = "EXISTS (SELECT 1 FROM product_branch_stock pbs WHERE pbs.product_id = p.id AND pbs.branch_id = ?)";
             $params[] = $branchId;
        }
        
        $whereSql = '';
        if (!empty($where)) {
            $whereSql = "WHERE " . implode(" AND ", $where);
        }
        
        // Count total
        $countSql = "
            SELECT COUNT(*) 
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands br ON p.brand_id = br.id
            $whereSql
        ";
        $stmtCount = $db->prepare($countSql);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();
        
        $sql = "
            SELECT p.*, c.name as category_name, br.name as brand_name,
                   (CASE WHEN ps.{$currentDay} = 1 THEN 1 ELSE 0 END) as is_daily,
                   " . ($branchId ? "COALESCE(SUM(pbs.stock), 0)" : "COALESCE(SUM(pbs.stock), p.stock)") . " as current_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands br ON p.brand_id = br.id
            LEFT JOIN product_schedules ps ON p.id = ps.product_id
            LEFT JOIN product_branch_stock pbs ON p.id = pbs.product_id" . ($branchId ? " AND pbs.branch_id = ?" : "") . "
            $whereSql
            GROUP BY p.id
            ORDER BY c.name ASC, p.name ASC
            LIMIT $limit OFFSET $offset
        ";
        
        $stmt = $db->prepare($sql);
        
        $execParams = $params;
        if ($branchId) {
            // El placeholder de branch_id en el JOIN aparece antes que los del WHERE
            $execParams = array_merge([$branchId], $params);
        }
        
        $stmt->execute($execParams);
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // Map current_stock to stock for frontend compatibility
        foreach ($results as &$r) {
            $r['stock'] = $r['current_stock'];
        }
        
        echo json_encode([
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit
        ]);
    }

    public function show(): void {
        $id = $_GET['id'] ?? null;
        if (!$id) { $this->sendError('ID required', 400); return; }
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT p.*, c.name as category_name, br.name as brand_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands br ON p.brand_id = br.id
            WHERE p.id = ?
        ");
        $stmt->execute([$id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$product) { $this->sendError('Product not found', 404); return; }

        // Get branch stocks
        $stmt2 = $db->prepare("
            SELECT pbs.*, b.name as branch_name
            FROM product_branch_stock pbs
            JOIN branches b ON pbs.branch_id = b.id
            WHERE pbs.product_id = ?
        ");
        $stmt2->execute([$id]);
        $product['branch_stocks'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        $this->sendJson(['product' => $product]);
    }

    public function store(): void {
        // Handle multipart form (image upload) or JSON
        $isMultipart = isset($_POST['name']);
        if ($isMultipart) {
            $data = $_POST;
        } else {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
        }

        if (empty($data['name']) || empty($data['price']) || empty($data['category_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'name, price and category_id are required']);
            return;
        }

        $imagePath = null;
        if (!empty($_FILES['image']['tmp_name'])) {
            $imagePath = $this->uploadImage($_FILES['image']);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO products (category_id, brand_id, name, price, stock, min_stock, unit, image_path, manages_inventory, is_takeaway, takeaway_surcharge)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['category_id'],
            $data['brand_id'] ?? null,
            $data['name'],
            $data['price'],
            $data['stock'] ?? 0,
            $data['min_stock'] ?? 5,
            $data['unit'] ?? 'unidades',
            $imagePath,
            isset($data['manages_inventory']) ? $data['manages_inventory'] : 1,
            isset($data['is_takeaway']) ? $data['is_takeaway'] : 0,
            $data['takeaway_surcharge'] ?? 0,
        ]);
        $productId = (int)$db->lastInsertId();

        // Save branch stocks if provided
        if (!empty($data['branch_stocks'])) {
            $branchStocks = is_string($data['branch_stocks'])
                ? json_decode($data['branch_stocks'], true)
                : $data['branch_stocks'];
            $this->saveBranchStocks($db, $productId, $branchStocks);
        }

        http_response_code(201);
        echo json_encode(['message' => 'Product created', 'id' => $productId]);
    }

    public function update(): void {
        $isMultipart = isset($_POST['id']);
        if ($isMultipart) {
            $data = $_POST;
        } else {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
        }

        $id = $data['id'] ?? null;
        if (!$id) { $this->sendError('ID required', 400); return; }

        $db = Database::getConnection();

        // Handle image upload
        $imagePath = $data['image_path'] ?? null;
        if (!empty($_FILES['image']['tmp_name'])) {
            $imagePath = $this->uploadImage($_FILES['image']);
        }

        $fields = [];
        $params = [];
        foreach (['name','price','stock','min_stock','unit','category_id','brand_id', 'manages_inventory', 'is_takeaway', 'takeaway_surcharge'] as $f) {
            if (isset($data[$f])) {
                $fields[] = "$f = ?";
                $params[] = $data[$f] !== '' ? $data[$f] : null;
            }
        }
        if ($imagePath !== null) {
            $fields[] = "image_path = ?";
            $params[] = $imagePath;
        }
        if (empty($fields)) { $this->sendError('Nothing to update', 400); return; }
        $params[] = $id;

        $db->prepare("UPDATE products SET " . implode(', ', $fields) . " WHERE id=?")->execute($params);

        // Update branch stocks
        if (isset($data['branch_stocks'])) {
            $branchStocks = is_string($data['branch_stocks'])
                ? json_decode($data['branch_stocks'], true)
                : $data['branch_stocks'];
            if (is_array($branchStocks)) {
                $this->saveBranchStocks($db, $id, $branchStocks);
            }
        }

        $this->sendSuccess([], 'Product updated');
    }

    public function delete(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if (!$id) { $this->sendError('ID required', 400); return; }
        $db = Database::getConnection();
        $db->prepare("DELETE FROM products WHERE id=?")->execute([$id]);
        $this->sendSuccess([], 'Product deleted');
    }

    private function saveBranchStocks($db, int $productId, array $branchStocks): void {
        foreach ($branchStocks as $bs) {
            $branchId = $bs['branch_id'] ?? null;
            $stock    = (int)($bs['stock'] ?? 0);
            if (!$branchId) continue;
            $db->prepare("INSERT INTO product_branch_stock (product_id, branch_id, stock) VALUES (?,?,?)
                ON DUPLICATE KEY UPDATE stock=?")
                ->execute([$productId, $branchId, $stock, $stock]);
        }
    }

    private function uploadImage(array $file): ?string {
        $uploadDir = __DIR__ . '/../../public/uploads/products/';
        
        // Si estamos en Vercel o el directorio no es escribible, usamos Base64
        $isVercel = strpos(__DIR__, '/var/task') !== false;
        if ($isVercel || (!is_dir($uploadDir) && !@mkdir($uploadDir, 0755, true)) || !@is_writable($uploadDir)) {
            $imageData = file_get_contents($file['tmp_name']);
            $mimeType = mime_content_type($file['tmp_name']);
            return 'data:' . $mimeType . ';base64,' . base64_encode($imageData);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg','jpeg','png','webp','gif'];
        if (!in_array($ext, $allowed)) return null;

        $filename = uniqid('prod_') . '.' . $ext;
        if (move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            return '/uploads/products/' . $filename;
        }
        return null;
    }
}
