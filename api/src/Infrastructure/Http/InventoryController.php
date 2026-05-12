<?php
namespace App\Infrastructure\Http;
use App\Infrastructure\Persistence\Database;

class InventoryController extends BaseController {

    // GET /inventory/movements?product_id=X
    public function movements(): void {
        try {
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
        } catch (\Exception $e) {
            $this->sendError('Error al obtener movimientos: ' . $e->getMessage(), 500);
        }
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

    // GET /inventory/report?filter=[all|manages|not_manages]&branch_id=X
    public function report(): void {
        try {
            AuthMiddleware::handle(); // Ensure user is logged in
            $db = Database::getConnection();
            
            $filter = $_GET['filter'] ?? 'all';
            $branchId = $_GET['branch_id'] ?? null;
            
            $where = [];
            $params = [];
            
            if ($filter === 'manages') {
                $where[] = "p.manages_inventory = 1";
            } elseif ($filter === 'not_manages') {
                $where[] = "p.manages_inventory = 0";
            }
            
            $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
            
            $sql = "
                SELECT 
                    p.id, p.name, p.price, p.unit, p.min_stock, p.manages_inventory,
                    ANY_VALUE(c.name) as category_name,
                    ANY_VALUE(br.name) as brand_name,
                    COALESCE(SUM(pbs.stock), p.stock) as current_stock
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN brands br ON p.brand_id = br.id
                LEFT JOIN product_branch_stock pbs ON p.id = pbs.product_id" . ($branchId ? " AND pbs.branch_id = ?" : "") . "
                $whereSql
                GROUP BY p.id
                ORDER BY category_name, p.name
            ";
            
            if ($branchId) {
                $params[] = $branchId;
            }
            
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $this->sendJson(['data' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Exception $e) {
            $this->sendError('Error en reporte de inventario: ' . $e->getMessage(), 500, ['sql' => $sql ?? null]);
        }
    }

    // GET /inventory/report-print?filter=[all|manages|not_manages]&branch_id=X&remote=1&raw_html=1
    public function reportPrint(): void {
        AuthMiddleware::handle();
        $db = Database::getConnection();
        
        $filter = $_GET['filter'] ?? 'all';
        $branchId = $_GET['branch_id'] ?? null;
        
        $where = [];
        if ($filter === 'manages') {
            $where[] = "p.manages_inventory = 1";
        } elseif ($filter === 'not_manages') {
            $where[] = "p.manages_inventory = 0";
        }
        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
        
        $sql = "
            SELECT 
                p.id, p.name, p.price, p.unit, p.min_stock, p.manages_inventory,
                ANY_VALUE(c.name) as category_name,
                COALESCE(SUM(pbs.stock), p.stock) as current_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_branch_stock pbs ON p.id = pbs.product_id" . ($branchId ? " AND pbs.branch_id = ?" : "") . "
            $whereSql
            GROUP BY p.id
            ORDER BY category_name, p.name
        ";
        
        $stmt = $db->prepare($sql);
        $params = $branchId ? [$branchId] : [];
        $stmt->execute($params);
        $data = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        if (isset($_GET['remote']) && $_GET['remote'] == 1) {
            // Registrar en la cola de impresión (Respaldo por si falla FCM)
            PrintQueueController::addJob('print_inventory_request', [
                'filter' => $filter,
                'branch_id' => (string)$branchId
            ]);

            // Si es impresión remota, enviar notificación (no verificar resultado — igual que en CashController)
            \App\Infrastructure\Services\NotificationService::sendToTopic('new_orders', 'Imprimir Inventario', "Imprimiendo reporte de inventario...", [
                'type' => 'print_inventory_request', 
                'filter' => $filter,
                'branch_id' => (string)$branchId
            ]);
            $this->sendJson(['success' => true]);
            return;
        }

        if (isset($_GET['raw_html']) && $_GET['raw_html'] == 1) {
            $branchName = "Consolidado";
            if ($branchId) {
                $stB = $db->prepare("SELECT name FROM branches WHERE id=?");
                $stB->execute([$branchId]);
                $branchName = $stB->fetchColumn() ?: "Sucursal #$branchId";
            }

            $dateStr = date('d/MM/Y H:i');
            $html = "
            <html>
            <head>
                <style>
                    @page { margin: 0; }
                    body { font-family: 'Courier New', Courier, monospace; font-size: 10px; width: 48mm; margin: 0; padding: 5px 1mm 5px 3mm; }
                    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px; }
                    .table { width: 100%; border-collapse: collapse; }
                    .table th { border-bottom: 1px solid #000; text-align: left; }
                    .text-right { text-align: right; }
                </style>
            </head>
            <body>
                <div class='header'>
                    <h2 style='margin:0;'>KRUSTACIO KASCARUDO</h2>
                    <p style='margin:2px 0;'>REPORTE DE INVENTARIO</p>
                    <p style='margin:2px 0; font-size:9px;'>$dateStr</p>
                </div>
                <div style='margin-bottom:8px;'>
                    <p style='margin:2px 0;'><strong>Sucursal:</strong> $branchName</p>
                    <p style='margin:2px 0;'><strong>Filtro:</strong> $filter</p>
                </div>
                <table class='table'>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th class='text-right'>Stock</th>
                        </tr>
                    </thead>
                    <tbody>";
            foreach ($data as $item) {
                $stock = $item['manages_inventory'] ? $item['current_stock'] . " " . $item['unit'] : "Ilimitado";
                $html .= "
                        <tr>
                            <td style='padding:4px 0;'>{$item['name']}<br><small style='color:#666;'>{$item['category_name']}</small></td>
                            <td class='text-right' style='padding:4px 0;'>$stock</td>
                        </tr>";
            }
            $html .= "
                    </tbody>
                </table>
                <div style='margin-top:15px; border-top:1px dashed #000; padding-top:5px; text-align:center;'>
                    Total productos: " . count($data) . "
                </div>
            </body>
            </html>";
            header("Content-Type: text/html; charset=UTF-8");
            echo $html;
            exit;
        }

        $this->sendJson(['data' => $data]);
    }
}
