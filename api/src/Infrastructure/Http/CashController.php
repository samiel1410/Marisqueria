<?php
namespace App\Infrastructure\Http;
use App\Infrastructure\Persistence\Database;
use PDO;

class CashController extends BaseController {

    // GET /cash/status
    public function getCurrentStatus(): void {
        AuthMiddleware::handle();
        $db = Database::getConnection();
        $registerId = $_GET['register_id'] ?? null;

        $query = "
            SELECT cs.*, u.username, cr.name as register_name
            FROM cash_sessions cs
            JOIN users u ON cs.user_id = u.id
            LEFT JOIN cash_registers cr ON cs.register_id = cr.id
            WHERE cs.status = 'open'
        ";
        
        $params = [];
        if ($registerId) {
            $query .= " AND cs.register_id = ?";
            $params[] = $registerId;
        }
        $query .= " LIMIT 1";

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            $this->sendJson(['status' => 'closed']);
            return;
        }

        $stmtSales = $db->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN payment_method = 'efectivo' THEN amount ELSE 0 END), 0) as cash_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'transferencia' THEN amount ELSE 0 END), 0) as transfer_sales
            FROM order_payments 
            WHERE user_id = ? AND created_at >= ?
        ");
        $stmtSales->execute([$session['user_id'], $session['opened_at']]);
        $salesData = $stmtSales->fetch(PDO::FETCH_ASSOC);
        $currentCashSales = (float)$salesData['cash_sales'];
        $currentTransferSales = (float)$salesData['transfer_sales'];

        $stmtMov = $db->prepare("SELECT COALESCE(SUM(CASE WHEN type='ingreso' THEN amount ELSE -amount END),0) FROM cash_movements WHERE session_id=?");
        $stmtMov->execute([$session['id']]);
        $movBalance = (float)$stmtMov->fetchColumn();

        $this->sendJson([
            'status'           => 'open',
            'session'          => $session,
            'current_sales'    => $currentCashSales + $currentTransferSales,
            'cash_sales'       => $currentCashSales,
            'transfer_sales'   => $currentTransferSales,
            'movements_balance'=> $movBalance,
            'expected_balance' => $session['opening_balance'] + $currentCashSales + $movBalance,
        ]);
    }

    // GET /cash/sessions  — historial de sesiones
    public function sessions(): void {
        AuthMiddleware::handle();
        $db = Database::getConnection();
        $stmt = $db->query("
            SELECT cs.*, u.username
            FROM cash_sessions cs
            JOIN users u ON cs.user_id = u.id
            ORDER BY cs.opened_at DESC
            LIMIT 50
        ");
        $this->sendJson(['sessions' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // GET /cash/history — similar to sessions but with register_id and different response key
    public function history(): void {
        AuthMiddleware::handle();
        $registerId = $_GET['register_id'] ?? null;
        $limit = (int)($_GET['limit'] ?? 50);
        $db = Database::getConnection();
        
        $query = "
            SELECT cs.*, u.username
            FROM cash_sessions cs
            JOIN users u ON cs.user_id = u.id
        ";
        $params = [];
        if ($registerId) {
            $query .= " WHERE cs.register_id = ?";
            $params[] = $registerId;
        }
        $query .= " ORDER BY cs.opened_at DESC LIMIT $limit";

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $this->sendJson(['history' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // GET /cash/movements?session_id=X&register_id=Y
    public function movements(): void {
        AuthMiddleware::handle();
        $sessionId = $_GET['session_id'] ?? null;
        $registerId = $_GET['register_id'] ?? null;
        $db = Database::getConnection();

        if (!$sessionId && $registerId) {
            $stmt = $db->prepare("SELECT id FROM cash_sessions WHERE register_id=? AND status='open' LIMIT 1");
            $stmt->execute([$registerId]);
            $sessionId = $stmt->fetchColumn();
        }

        if (!$sessionId) {
            $this->sendJson(['movements' => []]); // Devolver vacío en lugar de error si no hay sesión abierta
            return;
        }
        
        $stmt = $db->prepare("SELECT * FROM cash_movements WHERE session_id=? ORDER BY created_at DESC");
        $stmt->execute([$sessionId]);
        $this->sendJson(['movements' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // POST /cash/open
    public function openSession(): void {
        $user = AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['opening_balance'])) {
            $this->sendError('Opening balance is required', 400);
            return;
        }

        $registerId = $data['register_id'] ?? null;
        $db = Database::getConnection();

        if (!$registerId) {
            // Check current registers count to generate next name
            $stmtCount = $db->query("SELECT COUNT(*) FROM cash_registers");
            $count = (int)$stmtCount->fetchColumn();
            $nextName = "Caja " . ($count + 1);
            
            $stmtNew = $db->prepare("INSERT INTO cash_registers (name, status) VALUES (?, 'active')");
            $stmtNew->execute([$nextName]);
            $registerId = $db->lastInsertId();
        }

        // Verificar si la caja específica ya tiene sesión abierta (por otro usuario)
        if ($registerId) {
            $stmt = $db->prepare("SELECT cs.id, u.username
                FROM cash_sessions cs
                JOIN users u ON cs.user_id = u.id
                WHERE cs.register_id = ? AND cs.status = 'open'
                LIMIT 1");
            $stmt->execute([$registerId]);
            $otherSession = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($otherSession) {
                $this->sendError("Esta caja ya está abierta por el usuario \"{$otherSession['username']}\".", 400);
                return;
            }
        }

        $stmt = $db->prepare("INSERT INTO cash_sessions (user_id, register_id, opening_balance, opening_breakdown, status, notes) VALUES (?, ?, ?, ?, 'open', ?)");
        $stmt->execute([
            $user->id,
            $registerId,
            $data['opening_balance'],
            isset($data['opening_breakdown']) ? json_encode($data['opening_breakdown']) : null,
            $data['notes'] ?? null,
        ]);
        $this->sendJson(['message' => 'Caja abierta', 'session_id' => (int)$db->lastInsertId()], 201);
    }

    // POST /cash/close
    public function closeSession(): void {
        AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        $db = Database::getConnection();
        $registerId = $data['register_id'] ?? null;

        if ($registerId) {
            $stmt = $db->prepare("SELECT * FROM cash_sessions WHERE register_id=? AND status='open' LIMIT 1");
            $stmt->execute([$registerId]);
        } else {
            $stmt = $db->query("SELECT * FROM cash_sessions WHERE status='open' LIMIT 1");
        }
        
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$session) { $this->sendError('No hay sesión abierta para esta caja', 404); return; }

        $stmtSales = $db->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN payment_method = 'efectivo' THEN amount ELSE 0 END), 0) as cash_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'transferencia' THEN amount ELSE 0 END), 0) as transfer_sales
            FROM order_payments 
            WHERE created_at >= ?
        ");
        $stmtSales->execute([$session['opened_at']]);
        $salesData = $stmtSales->fetch(PDO::FETCH_ASSOC);
        $totalCashSales = (float)$salesData['cash_sales'];
        $totalTransferSales = (float)$salesData['transfer_sales'];
        $totalSales = $totalCashSales + $totalTransferSales;

        $stmtMov = $db->prepare("SELECT COALESCE(SUM(CASE WHEN type='ingreso' THEN amount ELSE -amount END),0) FROM cash_movements WHERE session_id=?");
        $stmtMov->execute([$session['id']]);
        $movBalance = (float)$stmtMov->fetchColumn();

        $expectedBalance = $session['opening_balance'] + $totalCashSales + $movBalance;
        
        $closingBalance = $data['closing_balance'] ?? $expectedBalance;
        $closingBreakdown = isset($data['closing_breakdown']) ? json_encode($data['closing_breakdown']) : null;
        $difference = $closingBalance - $expectedBalance;

        $db->prepare("UPDATE cash_sessions SET status='closed', expected_balance=?, closing_balance=?, closing_breakdown=?, difference=?, total_sales=?, closed_at=CURRENT_TIMESTAMP WHERE id=?")
           ->execute([$expectedBalance, $closingBalance, $closingBreakdown, $difference, $totalSales, $session['id']]);

        $this->sendJson(['message' => 'Caja cerrada', 'summary' => [
            'opened_at'        => $session['opened_at'],
            'closed_at'        => date('Y-m-d H:i:s'),
            'opening_balance'  => (float)$session['opening_balance'],
            'total_sales'      => $totalSales,
            'movements'        => $movBalance,
            'expected_balance' => $expectedBalance,
            'closing_balance'  => (float)$closingBalance,
            'difference'       => (float)$difference
        ]]);
    }

    // POST /cash/movement/update
    public function updateMovement(): void {
        AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        $amount = (float)($data['amount'] ?? 0);
        $type = $data['type'] ?? null;
        $desc = $data['description'] ?? null;

        if (!$id || !in_array($type, ['ingreso','egreso']) || $amount <= 0) {
            $this->sendError('ID, type y amount > 0 son requeridos', 400);
            return;
        }

        $db = Database::getConnection();
        $db->prepare("UPDATE cash_movements SET type=?, amount=?, description=? WHERE id=?")
           ->execute([$type, $amount, $desc, $id]);

        $this->sendSuccess([], 'Movimiento actualizado');
    }

    // POST /cash/movement
    public function addMovement(): void {
        $user = AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);

        $type   = $data['type']   ?? null;
        $amount = (float)($data['amount'] ?? 0);
        $desc   = $data['description'] ?? null;

        if (!in_array($type, ['ingreso','egreso']) || $amount <= 0) {
            $this->sendError('type (ingreso|egreso) y amount > 0 son requeridos', 400);
            return;
        }

        $db = Database::getConnection();
        $registerId = $data['register_id'] ?? null;

        if ($registerId) {
            $stmt = $db->prepare("SELECT id FROM cash_sessions WHERE register_id=? AND status='open' LIMIT 1");
            $stmt->execute([$registerId]);
        } else {
            $stmt = $db->query("SELECT id FROM cash_sessions WHERE status='open' LIMIT 1");
        }
        
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$session) { $this->sendError('No hay sesión de caja abierta para esta caja', 400); return; }

        $db->prepare("INSERT INTO cash_movements (session_id, type, amount, description) VALUES (?,?,?,?)")
           ->execute([$session['id'], $type, $amount, $desc]);

        $this->sendJson(['message' => 'Movimiento registrado'], 201);
    }

    // DELETE /cash/movement  { id }
    public function deleteMovement(): void {
        AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if (!$id) { $this->sendError('ID required', 400); return; }
        $db = Database::getConnection();
        $db->prepare("DELETE FROM cash_movements WHERE id=?")->execute([$id]);
        $this->sendSuccess([], 'Movimiento eliminado');
    }

    // GET /cash/session-details?id=X
    public function sessionDetails(): void {
        AuthMiddleware::handle();
        $id = $_GET['id'] ?? null;
        if (!$id) { $this->sendError('ID required', 400); return; }
        $db = Database::getConnection();
        
        $stmt = $db->prepare("
            SELECT cs.*, u.username, cr.name as register_name
            FROM cash_sessions cs
            JOIN users u ON cs.user_id = u.id
            LEFT JOIN cash_registers cr ON cs.register_id = cr.id
            WHERE cs.id = ?
        ");
        $stmt->execute([$id]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$session) { $this->sendError('Session not found', 404); return; }

        $stmtMov = $db->prepare("SELECT * FROM cash_movements WHERE session_id=? ORDER BY created_at ASC");
        $stmtMov->execute([$id]);
        $movements = $stmtMov->fetchAll(PDO::FETCH_ASSOC);

        $start = $session['opened_at'];
        $end = $session['closed_at'] ?? date('Y-m-d H:i:s');

        $stmtOrders = $db->prepare("
            SELECT o.*, t.number as table_number 
            FROM orders o 
            LEFT JOIN restaurant_tables t ON o.table_id = t.id
            WHERE (o.status = 'cobrado' OR o.payment_method IS NOT NULL) AND o.created_at BETWEEN ? AND ?
            ORDER BY o.created_at ASC
        ");
        $stmtOrders->execute([$start, $end]);
        $orders = $stmtOrders->fetchAll(PDO::FETCH_ASSOC);

        foreach ($orders as &$order) {
            $stmtItems = $db->prepare("
                SELECT oi.*, p.name as product_name 
                FROM order_items oi 
                JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ?
            ");
            $stmtItems->execute([$order['id']]);
            $order['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
        }

        $this->sendJson([
            'session'   => $session,
            'movements' => $movements,
            'orders'    => $orders
        ]);
    }

    public function sessionPrintData(): void {
        AuthMiddleware::handle();
        $id = $_GET['id'] ?? null;
        if (!$id) { $this->sendError('ID required', 400); return; }
        $db = Database::getConnection();
        
        $stmt = $db->prepare("
            SELECT cs.*, u.username, cr.name as register_name
            FROM cash_sessions cs
            JOIN users u ON cs.user_id = u.id
            LEFT JOIN cash_registers cr ON cs.register_id = cr.id
            WHERE cs.id = ?
        ");
        $stmt->execute([$id]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$session) { $this->sendError('Session not found', 404); return; }

        $stmtMov = $db->prepare("SELECT * FROM cash_movements WHERE session_id=? ORDER BY created_at ASC");
        $stmtMov->execute([$id]);
        $movements = $stmtMov->fetchAll(PDO::FETCH_ASSOC);

        $start = $session['opened_at'];
        $end = $session['closed_at'] ?? date('Y-m-d H:i:s');

        $stmtOrders = $db->prepare("
            SELECT o.*, t.number as table_number 
            FROM orders o 
            LEFT JOIN restaurant_tables t ON o.table_id = t.id
            WHERE o.user_id = ? AND (o.status = 'cobrado' OR o.payment_method IS NOT NULL) AND o.created_at BETWEEN ? AND ?
            ORDER BY o.created_at ASC
        ");
        $stmtOrders->execute([$session['user_id'], $start, $end]);
        $orders = $stmtOrders->fetchAll(PDO::FETCH_ASSOC);

        foreach ($orders as &$order) {
            $stmtItems = $db->prepare("
                SELECT oi.*, p.name as product_name 
                FROM order_items oi 
                JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ?
            ");
            $stmtItems->execute([$order['id']]);
            $order['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
        }

        $stmtTotals = $db->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN payment_method = 'efectivo' THEN amount ELSE 0 END), 0) as cash_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'transferencia' THEN amount ELSE 0 END), 0) as transfer_sales
            FROM order_payments 
            WHERE user_id = ? AND created_at BETWEEN ? AND ?
        ");
        $stmtTotals->execute([$session['user_id'], $start, $end]);
        $totalsData = $stmtTotals->fetch(PDO::FETCH_ASSOC);
        $totalCashSales = (float)$totalsData['cash_sales'];
        $totalTransferSales = (float)$totalsData['transfer_sales'];

        if (isset($_GET['download']) && $_GET['download'] == 1) {
            $html = "
            <html>
            <head>
                <style>
                    @page { margin: 0; }
                    * { box-sizing: border-box; }
                    body { 
                        font-family: 'Courier New', Courier, monospace; 
                        font-size: 10px; 
                        color: #000; 
                        margin: 0;
                        width: 48mm;
                        padding: 0 1mm 0 3mm;
                    }
                    .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
                    .header h2 { margin: 0; font-size: 14px; }
                    .header p { margin: 2px 0; }
                    .info { margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
                    .section-title { font-weight: bold; margin-top: 8px; margin-bottom: 3px; text-decoration: underline; }
                    .table { width: 100%; border-collapse: collapse; }
                    .table td { padding: 2px 0; vertical-align: top; }
                    .text-right { text-align: right; }
                    .total-row { border-top: 1px solid #000; font-weight: bold; margin-top: 5px; padding-top: 5px; }
                    .summary-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                </style>
            </head>
            <body style='padding: 5px;'>
                <div class='header'>
                    <h2>KRUSTACIO KASCARUDO</h2>
                    <p>RESUMEN DE CAJA</p>
                    <p>#{$session['id']}</p>
                </div>
                <div class='info'>
                    <p><strong>Caja:</strong> {$session['register_name']}</p>
                    <p><strong>Cajero:</strong> {$session['username']}</p>
                    <p><strong>Apertura:</strong> {$session['opened_at']}</p>
                    <p><strong>Cierre:</strong> " . ($session['closed_at'] ?? 'SESIÓN ABIERTA') . "</p>
                </div>

                <div class='section-title'>BALANCES</div>
                <table class='table'>
                    <tr><td>(+) Saldo Inicial:</td><td class='text-right'>\$" . number_format($session['opening_balance'], 2) . "</td></tr>
                    <tr><td>(+) Ventas Efectivo:</td><td class='text-right'>\$" . number_format($totalCashSales ?? 0, 2) . "</td></tr>
                    <tr><td>(+) Ventas Transf:</td><td class='text-right'>\$" . number_format($totalTransferSales ?? 0, 2) . "</td></tr>";
            
            $movIn = 0; $movOut = 0;
            foreach ($movements as $m) {
                if ($m['type'] === 'ingreso') $movIn += $m['amount'];
                else $movOut += $m['amount'];
            }
            
            $difference = $session['difference'] ?? 0;
            $statusLabel = "CUADRADO";
            if ($difference > 0) $statusLabel = "SOBRANTE";
            if ($difference < 0) $statusLabel = "FALTANTE";

            $html .= "
                    <tr><td>(+) Ingresos Manuales:</td><td class='text-right'>\$" . number_format($movIn, 2) . "</td></tr>
                    <tr><td>(-) Egresos Manuales:</td><td class='text-right'>\$" . number_format($movOut, 2) . "</td></tr>
                    <tr class='total-row'><td>(=) TOTAL ESPERADO:</td><td class='text-right'>\$" . number_format($session['expected_balance'] ?? ($session['opening_balance'] + ($session['total_sales'] ?? 0) + ($movIn - $movOut)), 2) . "</td></tr>
                    <tr><td>(=) TOTAL REAL:</td><td class='text-right'>\$" . number_format($session['closing_balance'] ?? 0, 2) . "</td></tr>
                    <tr><td><strong>DIFERENCIA:</strong></td><td class='text-right'><strong>\$" . number_format($difference, 2) . "</strong></td></tr>
                    <tr><td colspan='2' style='text-align: center; padding-top: 10px; font-weight: bold; font-size: 14px;'>*** $statusLabel ***</td></tr>
                </table>";

            if (!empty($movements)) {
                $html .= "<div class='section-title'>MOVIMIENTOS MANUALES</div>
                <table class='table'>
                    <tr><th align='left'>Tipo</th><th align='left'>Desc.</th><th align='right'>Monto</th></tr>";
                foreach ($movements as $m) {
                    $html .= "<tr>
                        <td>" . ucfirst($m['type']) . "</td>
                        <td>" . ($m['description'] ?? '—') . "</td>
                        <td class='text-right'>" . ($m['type'] === 'ingreso' ? '+' : '-') . "\$" . number_format($m['amount'], 2) . "</td>
                    </tr>";
                }
                $html .= "</table>";
            }

            if (!empty($orders)) {
                $html .= "<div class='section-title'>DETALLE DE ÓRDENES</div>
                <table class='table'>
                    <tr><th align='left'>ID</th><th align='left'>Mesa</th><th align='right'>Total</th></tr>";
                foreach ($orders as $o) {
                    $html .= "<tr>
                        <td>#{$o['id']}</td>
                        <td>" . ($o['table_number'] ? "Mesa {$o['table_number']}" : "Para Llevar") . "</td>
                        <td class='text-right'>\$" . number_format($o['total'], 2) . "</td>
                    </tr>";
                }
                $html .= "</table>";
            }

            $html .= "
                <div style='margin-top: 30px; text-align: center; border-top: 1px solid #000; padding-top: 10px;'>
                    <p>Firma Cajero</p>
                    <br><br>
                    <p>_______________________</p>
                    <p>{$session['username']}</p>
                </div>
            </body>
            </html>";

            if (isset($_GET['remote']) && $_GET['remote'] == 1) {
                // Registrar en la cola de impresión (Respaldo por si falla FCM)
                PrintQueueController::addJob('print_cash_request', [
                    'session_id' => (string)$id
                ]);

                // If remote printing, send notification (DO NOT SEND HTML in payload, it exceeds 4KB limit)
                \App\Infrastructure\Services\NotificationService::sendToTopic('new_orders', 'Imprimir Caja', "Imprimiendo reporte de caja...", [
                    'type' => 'print_cash_request', 
                    'session_id' => (string)$id
                ]);
                $this->sendJson(['success' => true]);
                return;
            }

            if (isset($_GET['raw_html']) && $_GET['raw_html'] == 1) {
                // Web client fetches the raw HTML to print via QZ Tray
                header("Content-Type: text/html; charset=UTF-8");
                echo $html;
                exit;
            }

            $dompdf = new \Dompdf\Dompdf();
            $dompdf->loadHtml($html);
            // 58mm is approx 164.41 points.
            $dompdf->setPaper(array(0, 0, 164.41, 600)); 
            $dompdf->render();
            
            header("Content-Type: application/pdf");
            echo $dompdf->output();
            exit;
        }

        $this->sendJson([
            'session'   => $session,
            'movements' => $movements,
            'orders'    => $orders
        ]);
    }

    // POST /cash/update-breakdown
    public function updateBreakdowns(): void {
        AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if (!$id) { $this->sendError('ID required', 400); return; }

        $db = Database::getConnection();
        
        $openingBalance = (float)($data['opening_balance'] ?? 0);
        $openingBreakdown = isset($data['opening_breakdown']) ? json_encode($data['opening_breakdown']) : null;
        $closingBalance = (float)($data['closing_balance'] ?? 0);
        $closingBreakdown = isset($data['closing_breakdown']) ? json_encode($data['closing_breakdown']) : null;
        $expectedBalance = (float)($data['expected_balance'] ?? 0);
        $difference = $closingBalance - $expectedBalance;
        
        $openedAt = $data['opened_at'] ?? null;
        $closedAt = $data['closed_at'] ?? null;

        // Recalcular ventas en base al nuevo rango de fechas
        $endRange = $closedAt ?: date('Y-m-d H:i:s');
        $stmtSales = $db->prepare("SELECT COALESCE(SUM(total),0) FROM orders WHERE (status='cobrado' OR payment_method IS NOT NULL) AND created_at BETWEEN ? AND ?");
        $stmtSales->execute([$openedAt, $endRange]);
        $totalSales = (float)$stmtSales->fetchColumn();

        // Recalcular balance de movimientos (los movimientos están atados al session_id)
        $stmtMov = $db->prepare("SELECT COALESCE(SUM(CASE WHEN type='ingreso' THEN amount ELSE -amount END),0) FROM cash_movements WHERE session_id=?");
        $stmtMov->execute([$id]);
        $movBalance = (float)$stmtMov->fetchColumn();

        $expectedBalance = $openingBalance + $totalSales + $movBalance;
        $difference = $closingBalance - $expectedBalance;

        $stmt = $db->prepare("
            UPDATE cash_sessions 
            SET opening_balance = ?, 
                opening_breakdown = ?, 
                closing_balance = ?, 
                closing_breakdown = ?,
                expected_balance = ?,
                total_sales = ?,
                difference = ?,
                opened_at = ?,
                closed_at = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $openingBalance,
            $openingBreakdown,
            $closingBalance,
            $closingBreakdown,
            $expectedBalance,
            $totalSales,
            $difference,
            $openedAt,
            $closedAt,
            $id
        ]);

        $this->sendSuccess([], 'Sesión actualizada y recalculada correctamente');
    }
}
