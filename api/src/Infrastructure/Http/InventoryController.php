<?php
namespace App\Infrastructure\Http;
use App\Infrastructure\Persistence\Database;

class InventoryController extends BaseController {

    // GET /inventory/movements?product_id=X
    public function movements(): void {
        $productId = $_GET['product_id'] ?? null;
        $db = Database::getConnection();
        
        $sql = "
            SELECT m.*, b.name as branch_name, u.username as user_name, p.name as product_name
            FROM inventory_movements m
            LEFT JOIN branches b ON m.branch_id = b.id
            LEFT JOIN users u ON m.user_id = u.id
            LEFT JOIN products p ON m.product_id = p.id
        ";
        $params = [];
        if ($productId) {
            $sql .= " WHERE m.product_id = ?";
            $params[] = $productId;
        }
        $sql .= " ORDER BY m.created_at DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $this->sendJson(['movements' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    // POST /inventory/movement  { product_id, branch_id, type, quantity, reason }
    public function addMovement(): void {
        $user = AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);

        $productId = $data['product_id'] ?? null;
        $branchId  = $data['branch_id'] ?? null;
        $type      = $data['type'] ?? null;
        $quantity  = (int)($data['quantity'] ?? 0);
        $reason    = $data['reason'] ?? null;

        if (!$productId || !$type || $quantity <= 0) {
            $this->sendError('product_id, type and quantity > 0 are required', 400);
            return;
        }
        if (!in_array($type, ['entrada', 'salida', 'ajuste'])) {
            $this->sendError('type must be entrada, salida or ajuste', 400);
            return;
        }

        $db = Database::getConnection();
        $db->beginTransaction();
        try {
            // Get current stock
            if ($branchId) {
                $stmt = $db->prepare("SELECT stock FROM product_branch_stock WHERE product_id=? AND branch_id=?");
                $stmt->execute([$productId, $branchId]);
                $row = $stmt->fetch(\PDO::FETCH_ASSOC);
                $prevStock = $row ? (int)$row['stock'] : 0;
            } else {
                $stmt = $db->prepare("SELECT stock FROM products WHERE id=?");
                $stmt->execute([$productId]);
                $row = $stmt->fetch(\PDO::FETCH_ASSOC);
                $prevStock = $row ? (int)$row['stock'] : 0;
            }

            // Calculate new stock
            if ($type === 'entrada') {
                $newStock = $prevStock + $quantity;
            } elseif ($type === 'salida') {
                $newStock = max(0, $prevStock - $quantity);
            } else { // ajuste
                $newStock = $quantity; // ajuste sets absolute value
            }

            // Update stock
            if ($branchId) {
                $db->prepare("INSERT INTO product_branch_stock (product_id, branch_id, stock) VALUES (?,?,?)
                    ON DUPLICATE KEY UPDATE stock=?")
                    ->execute([$productId, $branchId, $newStock, $newStock]);
            } else {
                $db->prepare("UPDATE products SET stock=? WHERE id=?")->execute([$newStock, $productId]);
            }

            // Record movement
            $db->prepare("INSERT INTO inventory_movements (product_id, branch_id, type, quantity, previous_stock, new_stock, reason, user_id)
                VALUES (?,?,?,?,?,?,?,?)")
                ->execute([$productId, $branchId, $type, $quantity, $prevStock, $newStock, $reason, $user->id]);

            $db->commit();
            $this->sendJson(['previous_stock' => $prevStock, 'new_stock' => $newStock], 201);
        } catch (\Exception $e) {
            $db->rollBack();
            $this->sendError('Error: ' . $e->getMessage(), 500);
        }
    }

    // GET /inventory/branch-stock?product_id=X
    public function branchStock(): void {
        $productId = $_GET['product_id'] ?? null;
        if (!$productId) { $this->sendError('product_id required', 400); return; }
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT pbs.*, b.name as branch_name
            FROM product_branch_stock pbs
            JOIN branches b ON pbs.branch_id = b.id
            WHERE pbs.product_id = ?
        ");
        $stmt->execute([$productId]);
        $this->sendJson(['branch_stock' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }
}
