<?php
namespace App\Infrastructure\Http;
use App\Infrastructure\Persistence\Database;
use PDO;

class ProductController extends BaseController {

    public function index(): void {
        error_log("ProductController::index started");
        $sql = "";
        $execParams = [];
        $currentDay = strtolower(date('l'));
        
        try {
            $db = Database::getConnection();
            error_log("ProductController::index - DB connected");
            
            $dayParam = isset($_GET['day']) ? strtolower($_GET['day']) : $currentDay;
            $allowedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            $currentDay = in_array($dayParam, $allowedDays) ? $dayParam : $currentDay;
            
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            if ($page < 1) $page = 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
            $offset = ($page - 1) * $limit;
            
            $search = $_GET['search'] ?? '';
            $categoryId = $_GET['category_id'] ?? null;
            $branchId = $_GET['branch_id'] ?? null;
            
            $where = [];
            $params = [];
            
            if (!empty($search)) {
                $where[] = "(p.name LIKE ? OR c.name LIKE ? OR br.name LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            
            if (!empty($categoryId)) {
                $where[] = "p.category_id = ?";
                $params[] = $categoryId;
            }

            if (!empty($branchId)) {
                $where[] = "EXISTS (SELECT 1 FROM product_branch_stock pbs2 WHERE pbs2.product_id = p.id AND pbs2.branch_id = ?)";
                $params[] = $branchId;
            }
            
            $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
            
            // Count total
            $countSql = "SELECT COUNT(*) FROM products p 
                        LEFT JOIN categories c ON p.category_id = c.id
                        LEFT JOIN brands br ON p.brand_id = br.id
                        $whereSql";
            $stmtCount = $db->prepare($countSql);
            $stmtCount->execute($params);
            $total = (int)$stmtCount->fetchColumn();
            
            // Subquery approach to avoid GROUP BY issues and ANY_VALUE compatibility
            $sql = "
                SELECT p.*, c.name as category_name, br.name as brand_name,
                    (SELECT 1 FROM product_schedules ps WHERE ps.product_id = p.id AND ps.{$currentDay} = 1 LIMIT 1) as is_daily,
                    (SELECT COALESCE(SUM(pbs.stock), p.stock) FROM product_branch_stock pbs WHERE pbs.product_id = p.id " . ($branchId ? " AND pbs.branch_id = ?" : "") . ") as current_stock
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN brands br ON p.brand_id = br.id
                $whereSql
                ORDER BY category_name ASC, p.name ASC
                LIMIT $limit OFFSET $offset
            ";
            
            $stmt = $db->prepare($sql);
            
            if ($branchId) {
                // The placeholder for branch_id is in the subquery, which comes BEFORE the WHERE placeholders
                $execParams = array_merge([$branchId], $params);
            } else {
                $execParams = $params;
            }

            $stmt->execute($execParams);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($results as &$r) {
                $r['stock'] = $r['current_stock'] ?? $r['stock'] ?? 0;
                $r['is_daily'] = (int)($r['is_daily'] ?? 0);
            }

            $this->sendJson([
                'data' => $results,
                'pagination' => [
                    'total' => $total,
                    'page' => $page,
                    'limit' => $limit,
                    'pages' => ceil($total / $limit)
                ],
                'total' => $total,
                'page' => $page,
                'limit' => $limit
            ]);
        } catch (\Exception $e) {
            $this->sendError('Error al obtener productos: ' . $e->getMessage(), 500, [
                'sql' => $sql,
                'params' => $execParams,
                'trace' => $e->getTraceAsString()
            ]);
        }
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
        try {
            $isMultipart = isset($_POST['name']);
            if ($isMultipart) {
                $data = $_POST;
            } else {
                $data = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            if (empty($data['name']) || empty($data['price']) || empty($data['category_id'])) {
                $this->sendError('name, price and category_id are required', 400);
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

            if (!empty($data['branch_stocks'])) {
                $branchStocks = is_string($data['branch_stocks']) ? json_decode($data['branch_stocks'], true) : $data['branch_stocks'];
                $this->saveBranchStocks($db, $productId, $branchStocks);
            }

            $this->sendJson(['message' => 'Product created', 'id' => $productId], 201);
        } catch (\Exception $e) {
            $this->sendError('Error al crear producto: ' . $e->getMessage(), 500);
        }
    }

    public function update(): void {
        try {
            $isMultipart = isset($_POST['id']);
            if ($isMultipart) {
                $data = $_POST;
            } else {
                $data = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = $data['id'] ?? null;
            if (!$id) { $this->sendError('ID required', 400); return; }

            $db = Database::getConnection();
            $imagePath = $data['image_path'] ?? null;
            if (!empty($_FILES['image']['tmp_name'])) {
                $imagePath = $this->uploadImage($_FILES['image']);
            }

            $fields = [];
            $params = [];
            foreach (['name','price','stock','min_stock','unit','category_id','brand_id', 'manages_inventory', 'is_takeaway', 'takeaway_surcharge'] as $f) {
                if (isset($data[$f])) {
                    $fields[] = "$f = ?";
                    $params[] = ($data[$f] !== '' && $data[$f] !== null) ? $data[$f] : null;
                }
            }
            if ($imagePath !== null) {
                $fields[] = "image_path = ?";
                $params[] = $imagePath;
            }
            
            if (!empty($fields)) {
                $params[] = $id;
                $db->prepare("UPDATE products SET " . implode(', ', $fields) . " WHERE id=?")->execute($params);
            }

            if (isset($data['branch_stocks'])) {
                $branchStocks = is_string($data['branch_stocks']) ? json_decode($data['branch_stocks'], true) : $data['branch_stocks'];
                if (is_array($branchStocks)) {
                    $this->saveBranchStocks($db, $id, $branchStocks);
                }
            }

            $this->sendSuccess([], 'Product updated');
        } catch (\Exception $e) {
            $this->sendError('Error al actualizar producto: ' . $e->getMessage(), 500);
        }
    }

    public function delete(): void {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $id = $data['id'] ?? null;
            if (!$id) { $this->sendError('ID required', 400); return; }
            $db = Database::getConnection();
            $db->prepare("DELETE FROM products WHERE id=?")->execute([$id]);
            $this->sendSuccess([], 'Product deleted');
        } catch (\Exception $e) {
            $this->sendError('Error al eliminar producto: ' . $e->getMessage(), 500);
        }
    }

    private function saveBranchStocks($db, $productId, $branchStocks): void {
        foreach ($branchStocks as $bs) {
            if (empty($bs['branch_id'])) continue;
            $stmt = $db->prepare("INSERT INTO product_branch_stock (product_id, branch_id, stock) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE stock = ?");
            $stmt->execute([$productId, $bs['branch_id'], $bs['stock'] ?? 0, $bs['stock'] ?? 0]);
        }
    }

    private function uploadImage(array $file): ?string {
        $uploadDir = __DIR__ . '/../../public/uploads/products/';
        $isVercel = strpos(__DIR__, '/var/task') !== false;
        if ($isVercel || (!is_dir($uploadDir) && !@mkdir($uploadDir, 0755, true)) || !@is_writable($uploadDir)) {
            $type = pathinfo($file['name'], PATHINFO_EXTENSION);
            $data = file_get_contents($file['tmp_name']);
            return 'data:image/' . $type . ';base64,' . base64_encode($data);
        }

        $filename = uniqid() . '-' . basename($file['name']);
        $targetPath = $uploadDir . $filename;
        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            return '/uploads/products/' . $filename;
        }
        return null;
    }
}
