<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Persistence\Database;
use App\Infrastructure\Services\NotificationService;
use PDO;
use Exception;
use Throwable;

class OrderController extends BaseController
{

    public function store(): void
    {
        $db = null;
        try {
            $user = AuthMiddleware::handle();
            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['table_id']) || empty($data['items']) || !is_array($data['items'])) {
                $this->sendError('table_id and items array are required', 400);
                return;
            }

            $db = Database::getConnection();

            // Check if there is an open cash session
            $stmtSession = $db->query("SELECT id FROM cash_sessions WHERE status = 'open' LIMIT 1");
            if (!$stmtSession->fetch()) {
                $this->sendError('Debe abrir una caja antes de poder registrar pedidos.', 403);
                return;
            }

            $db->beginTransaction();

            // Check for existing active order
            $existingOrder = null;
            if ($data['table_id'] !== null) {
                $stmtExist = $db->prepare("SELECT id, total, user_id, daily_number FROM orders WHERE table_id = ? AND status NOT IN ('cobrado', 'cancelado') ORDER BY created_at DESC LIMIT 1");
                $stmtExist->execute([$data['table_id']]);
                $existingOrder = $stmtExist->fetch(PDO::FETCH_ASSOC);
            }

            $newItemsTotal = 0;
            foreach ($data['items'] as $item) {
                $stmt = $db->prepare("SELECT price, is_takeaway, takeaway_surcharge FROM products WHERE id = ?");
                $stmt->execute([$item['product_id']]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($product) {
                    $itemPrice = (float) $product['price'];
                    $isTakeawayOrder = ($data['table_id'] === null);
                    if ($isTakeawayOrder && ($product['is_takeaway'] == 1)) {
                        $itemPrice += (float) ($product['takeaway_surcharge'] ?? 0);
                    }
                    $newItemsTotal += $itemPrice * $item['quantity'];
                } else {
                    throw new Exception("Product ID {$item['product_id']} not found");
                }
            }

            if ($existingOrder) {
                $orderId = $existingOrder['id'];
                $newTotal = $existingOrder['total'] + $newItemsTotal;
                $db->prepare("UPDATE orders SET total = ?, updated_by = ? WHERE id = ?")->execute([$newTotal, $user->id, $orderId]);
            } else {
                $stmtNum = $db->prepare("SELECT COALESCE(MAX(daily_number), 0) FROM orders WHERE DATE(created_at) = CURRENT_DATE");
                $stmtNum->execute();
                $nextDailyNum = (int) $stmtNum->fetchColumn() + 1;

                $stmt = $db->prepare("INSERT INTO orders (table_id, user_id, total, status, daily_number) VALUES (?, ?, ?, 'pendiente', ?)");
                $stmt->execute([$data['table_id'], $user->id, $newItemsTotal, $nextDailyNum]);
                $orderId = $db->lastInsertId();
            }

            $stmtItem = $db->prepare("INSERT INTO order_items (order_id, product_id, quantity, price, notes) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['items'] as $item) {
                $stmtPrice = $db->prepare("SELECT price, is_takeaway, takeaway_surcharge FROM products WHERE id = ?");
                $stmtPrice->execute([$item['product_id']]);
                $product = $stmtPrice->fetch(PDO::FETCH_ASSOC);

                $price = (float) $product['price'];
                $isTakeawayOrder = ($data['table_id'] === null);
                if ($isTakeawayOrder && ($product['is_takeaway'] == 1)) {
                    $price += (float) ($product['takeaway_surcharge'] ?? 0);
                }
                $stmtItem->execute([$orderId, $item['product_id'], $item['quantity'], $price, $item['notes'] ?? null]);
            }

            if ($data['table_id'] !== null) {
                $db->prepare("UPDATE restaurant_tables SET status = 'ocupada' WHERE id = ?")->execute([$data['table_id']]);
            }

            $db->commit();

            NotificationService::sendToTopic('new_orders', $existingOrder ? 'Orden Actualizada' : 'Nueva Orden', 'Actualizando...', [
                'order_id' => (string) $orderId,
                'type' => 'print_kitchen_request'
            ]);

            $this->sendJson(['order_id' => $orderId], 201);
        } catch (Exception $e) {
            if ($db && $db->inTransaction())
                $db->rollBack();
            $this->sendError('Failed to process order: ' . $e->getMessage(), 500);
        }
    }

    public function index(): void
    {
        AuthMiddleware::handle();
        $db = Database::getConnection();

        $userId = $_GET['user_id'] ?? null;
        $customerId = $_GET['customer_id'] ?? null;

        $sql = "
            SELECT o.*, t.number as table_number, u.username as waiter_name, up.username as updated_by_name,
                   (SELECT COALESCE(SUM(amount), 0) FROM order_payments WHERE order_id = o.id) as total_paid,
                   (SELECT cr.name 
                    FROM cash_sessions cs 
                    JOIN cash_registers cr ON cs.register_id = cr.id 
                    WHERE o.created_at >= cs.opened_at 
                      AND (cs.closed_at IS NULL OR o.created_at <= cs.closed_at)
                    LIMIT 1) as register_name
            FROM orders o
            LEFT JOIN restaurant_tables t ON o.table_id = t.id
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN users up ON o.updated_by = up.id
        ";
        $params = [];
        $where = [];

        if ($userId) {
            $where[] = "o.user_id = ?";
            $params[] = $userId;
        }

        if ($customerId) {
            $where[] = "o.customer_id = ?";
            $params[] = $customerId;
        }

        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }

        $sql .= " ORDER BY o.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

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
        $this->sendJson($orders);
    }

    public function getActiveOrders(): void
    {
        AuthMiddleware::handle();

        $db = Database::getConnection();
        $stmt = $db->query("
            SELECT o.*, t.number as table_number, u.username as waiter_name, up.username as updated_by_name,
                   (SELECT cr.name 
                    FROM cash_sessions cs 
                    JOIN cash_registers cr ON cs.register_id = cr.id 
                    WHERE o.created_at >= cs.opened_at 
                      AND (cs.closed_at IS NULL OR o.created_at <= cs.closed_at)
                    LIMIT 1) as register_name
            FROM orders o
            LEFT JOIN restaurant_tables t ON o.table_id = t.id
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN users up ON o.updated_by = up.id
            WHERE o.status NOT IN ('cobrado', 'cancelado') 

            ORDER BY o.created_at DESC
        ");

        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

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
        $this->sendJson($orders);
    }

    public function getKitchenOrders(): void
    {
        try {
            AuthMiddleware::handle();
            $db = Database::getConnection();

            $stmt = $db->query("
                SELECT o.*, t.number as table_number, u.username as waiter_name
                FROM orders o
                LEFT JOIN restaurant_tables t ON o.table_id = t.id
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.status IN ('pendiente', 'en cocina')
                ORDER BY o.created_at ASC
            ");

            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

            $this->sendJson($orders);
        } catch (Exception $e) {
            $this->sendError('Error fetching kitchen orders: ' . $e->getMessage(), 500);
        }
    }

    public function getByTable(): void
    {
        AuthMiddleware::handle();
        $tableId = $_GET['table_id'] ?? null;

        if (!$tableId) {
            http_response_code(400);
            echo json_encode(['error' => 'table_id is required']);
            return;
        }

        $db = Database::getConnection();

        // Find active order for this table
        $stmt = $db->prepare("
            SELECT id, daily_number, total, status, created_at 
            FROM orders 
            WHERE table_id = ? AND status != 'cobrado' 
            ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->execute([$tableId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            echo json_encode(['order' => null]);
            return;
        }

        // Get items
        $stmtItems = $db->prepare("
            SELECT oi.*, p.name as product_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        ");
        $stmtItems->execute([$order['id']]);
        $order['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['order' => $order]);
    }

    public function getDetails(): void
    {
        AuthMiddleware::handle();
        $orderId = $_GET['order_id'] ?? null;
        if (!$orderId) {
            http_response_code(400);
            echo json_encode(['error' => 'order_id is required']);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT o.*, 
                   t.number as table_number, 
                   u.username as waiter_name,
                   c.name as customer_name,
                   c.identification as customer_id_number,
                   b.bank_name,
                   b.account_number,
                   b.owner_name
            FROM orders o
            LEFT JOIN restaurant_tables t ON o.table_id = t.id
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN bank_accounts b ON o.bank_account_id = b.id
            WHERE o.id = ?
        ");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            http_response_code(404);
            echo json_encode(['error' => 'Order not found']);
            return;
        }

        // Obtener historial de pagos
        $stmtPayments = $db->prepare("
            SELECT p.*, b.bank_name, b.account_number 
            FROM order_payments p
            LEFT JOIN bank_accounts b ON p.bank_account_id = b.id
            WHERE p.order_id = ?
            ORDER BY p.created_at ASC
        ");
        $stmtPayments->execute([$orderId]);
        $order['payments'] = $stmtPayments->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($order);
    }

    public function updateStatus(): void
    {
        $storageDir = NotificationService::getStoragePath();
        $logFile = $storageDir . '/qz_debug.log';
        @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: updateStatus() called\n", FILE_APPEND);

        $user = AuthMiddleware::handle();

        $contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
        if (strpos($contentType, 'application/json') !== false) {
            $data = json_decode(file_get_contents('php://input'), true);
        } else {
            $data = $_POST;
        }

        if (empty($data['order_id']) || empty($data['status'])) {
            @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: updateStatus() failed - missing order_id or status\n", FILE_APPEND);
            http_response_code(400);
            echo json_encode(['error' => 'order_id and status are required']);
            return;
        }

        $db = Database::getConnection();
        try {
            $db->beginTransaction();

            // Handle receipt upload
            $receiptBlob = null;
            if (isset($_FILES['receipt']) && $_FILES['receipt']['error'] === UPLOAD_ERR_OK) {
                // If image is very small (< 100KB), don't even try to compress to save time
                if ($_FILES['receipt']['size'] < 102400) {
                    $receiptData = @file_get_contents($_FILES['receipt']['tmp_name']);
                    if ($receiptData) {
                        $mimeType = function_exists('mime_content_type') ? @mime_content_type($_FILES['receipt']['tmp_name']) : 'image/jpeg';
                        $receiptBlob = 'data:' . ($mimeType ?: 'image/jpeg') . ';base64,' . base64_encode($receiptData);
                    }
                } else {
                    $tempFile = tempnam(sys_get_temp_dir(), 'rcpt_');
                    $mimeType = 'image/jpeg';
                    if (function_exists('mime_content_type')) {
                        $mimeType = @mime_content_type($_FILES['receipt']['tmp_name']) ?: 'image/jpeg';
                    }
                    
                    if ($this->compressImage($_FILES['receipt']['tmp_name'], $tempFile, 60)) {
                        $receiptData = @file_get_contents($tempFile);
                        if ($receiptData) {
                            $receiptBlob = 'data:' . $mimeType . ';base64,' . base64_encode($receiptData);
                        }
                        @unlink($tempFile);
                    } else {
                        $receiptData = @file_get_contents($_FILES['receipt']['tmp_name']);
                        if ($receiptData) {
                            $receiptBlob = 'data:' . $mimeType . ';base64,' . base64_encode($receiptData);
                        }
                    }
                }
            }

            $stmt = $db->prepare("SELECT * FROM orders WHERE id = ?");
            $stmt->execute([$data['order_id']]);
            $orderDataFull = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$orderDataFull)
                throw new Exception("Order #{$data['order_id']} not found");

            $currentStatus = $orderDataFull['status'];
            file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: Order #{$data['order_id']} moving from $currentStatus to {$data['status']}\n", FILE_APPEND);

            // If moving to 'en cocina', notify the kitchen
            if ($data['status'] === 'en cocina' && $currentStatus === 'pendiente') {
                NotificationService::sendToTopic('kitchen_orders', 'Nuevo Pedido', "Nuevo pedido listo para preparar", ['order_id' => (string) $data['order_id'], 'type' => 'new_order']);

                // Also notify the waiter
                $stmtWaiter = $db->prepare("SELECT user_id, table_id FROM orders WHERE id = ?");
                $stmtWaiter->execute([$data['order_id']]);
                $orderData = $stmtWaiter->fetch();

                if ($orderData && $orderData['user_id']) {
                    $stmtTableNum = $db->prepare("SELECT number FROM restaurant_tables WHERE id = ?");
                    $stmtTableNum->execute([$orderData['table_id']]);
                    $tableNum = $stmtTableNum->fetchColumn();

                    NotificationService::sendToTopic(
                        'waiter_' . $orderData['user_id'],
                        'Preparando Orden',
                        "El pedido de Mesa " . ($tableNum ?? '??') . " está en la cocina",
                        ['order_id' => (string) $data['order_id'], 'type' => 'order_ready']
                    );
                }
            }

            // If 'cancelado', revert stock
            if ($data['status'] === 'cancelado' && in_array($currentStatus, ['en cocina', 'entregado'])) {
                $stmtItems = $db->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
                $stmtItems->execute([$data['order_id']]);
                $items = $stmtItems->fetchAll();
                foreach ($items as $item) {
                    $db->prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND manages_inventory = 1")
                        ->execute([$item['quantity'], $item['product_id']]);
                }
            }

            // Update status and payments
            $newStatus = $data['status'];
            if ($newStatus === 'cobrado') {
                $paymentMethod = $data['payment_method'] ?? 'efectivo';
                $bankId = $data['bank_account_id'] ?? null;
                $cashAmount = (float) ($data['cash_amount'] ?? 0);
                $transferAmount = (float) ($data['transfer_amount'] ?? 0);

                $customerId = $data['customer_id'] ?? null;
                $amountPaidThisTime = (float) ($data['amount'] ?? 0);

                file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: Processing payment for #{$data['order_id']} ($paymentMethod)\n", FILE_APPEND);

                if ($paymentMethod === 'mixto') {
                    if ($cashAmount > 0) {
                        $db->prepare("INSERT INTO order_payments (order_id, amount, payment_method, user_id) VALUES (?, ?, 'efectivo', ?)")
                            ->execute([$data['order_id'], $cashAmount, $user->id]);
                    }
                    if ($transferAmount > 0) {
                        $db->prepare("INSERT INTO order_payments (order_id, amount, payment_method, bank_account_id, receipt_image, user_id) VALUES (?, ?, 'transferencia', ?, ?, ?)")
                            ->execute([$data['order_id'], $transferAmount, $bankId, $receiptBlob, $user->id]);
                    }
                } else {
                    $amount = $amountPaidThisTime > 0 ? $amountPaidThisTime : (float) $orderDataFull['total'];
                    if ($paymentMethod === 'efectivo') {
                        $db->prepare("INSERT INTO order_payments (order_id, amount, payment_method, user_id) VALUES (?, ?, 'efectivo', ?)")
                            ->execute([$data['order_id'], $amount, $user->id]);
                    } else {
                        $db->prepare("INSERT INTO order_payments (order_id, amount, payment_method, bank_account_id, receipt_image, user_id) VALUES (?, ?, 'transferencia', ?, ?, ?)")
                            ->execute([$data['order_id'], $amount, $bankId, $receiptBlob, $user->id]);
                    }
                }

                $stmtSum = $db->prepare("SELECT COALESCE(SUM(amount), 0) FROM order_payments WHERE order_id = ?");
                $stmtSum->execute([$data['order_id']]);
                $totalPaid = (float) $stmtSum->fetchColumn();

                $orderTotal = (float) $orderDataFull['total'];
                $newStatus = ($totalPaid < $orderTotal - 0.01) ? 'parcial' : 'cobrado';

                file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: Order #{$data['order_id']} final status: $newStatus (Paid: $totalPaid / Total: $orderTotal)\n", FILE_APPEND);

                $db->prepare("UPDATE orders SET status = ?, payment_method = ?, customer_id = ?, bank_account_id = ?, cash_amount = ?, transfer_amount = ?, updated_by = ? WHERE id = ?")
                    ->execute([$newStatus, $paymentMethod, $customerId, $bankId, $cashAmount, $transferAmount, $user->id, $data['order_id']]);
            } else {
                $db->prepare("UPDATE orders SET status = ?, updated_by = ? WHERE id = ?")->execute([$newStatus, $user->id, $data['order_id']]);
            }

            // Liberar mesa
            if ($newStatus === 'cobrado' || $newStatus === 'cancelado') {
                if ($orderDataFull['table_id']) {
                    $db->prepare("UPDATE restaurant_tables SET status = 'disponible' WHERE id = ?")->execute([$orderDataFull['table_id']]);
                }
                NotificationService::sendToTopic('new_orders', 'Pedido Finalizado', "Actualizando datos...", [
                    'order_id' => (string) $data['order_id'],
                    'type' => 'table_available' // Keeping type for compatibility with existing mobile listener
                ]);
            }

            // Impresión automática al cobrar
            if ($newStatus === 'cobrado') {
                PrintQueueController::addJob('print_request', ['order_id' => (string) $data['order_id']]);
                NotificationService::sendToTopic('new_orders', 'Imprimir Nota', "Imprimiendo nota de venta...", ['order_id' => (string) $data['order_id'], 'type' => 'print_request']);
            }

            // Notificar al mesero si está listo
            if ($data['status'] === 'entregado') {
                $stmtWaiter = $db->prepare("SELECT user_id, table_id FROM orders WHERE id = ?");
                $stmtWaiter->execute([$data['order_id']]);
                $orderData = $stmtWaiter->fetch();
                if ($orderData && $orderData['user_id']) {
                    $stmtTableNum = $db->prepare("SELECT number FROM restaurant_tables WHERE id = ?");
                    $stmtTableNum->execute([$orderData['table_id']]);
                    $tableNum = $stmtTableNum->fetchColumn();
                    NotificationService::sendToTopic('waiter_' . $orderData['user_id'], 'Orden lista', "Llevar a Mesa " . ($tableNum ?? '??'), ['order_id' => (string) $data['order_id'], 'type' => 'order_ready']);
                }
            }

            $db->commit();
            file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: updateStatus() success for #{$data['order_id']}\n", FILE_APPEND);
            echo json_encode(['message' => 'Order status updated successfully']);

        } catch (Throwable $e) {
            if (isset($db) && $db->inTransaction())
                $db->rollBack();
            if (isset($logFile))
                @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: updateStatus() ERROR: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine() . "\n", FILE_APPEND);
            http_response_code(500);
            echo json_encode(['error' => 'Update failed', 'details' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
        }
    }

    public function getPrintData(): void
    {
        AuthMiddleware::handle();
        $orderId = $_GET['order_id'] ?? null;

        if (!$orderId) {
            http_response_code(400);
            echo json_encode(['error' => 'order_id required']);
            return;
        }

        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT o.*, t.number as table_number, u.username as waiter_name,
                   c.name as customer_name, c.identification as customer_id_number, c.email as customer_email, c.phone as customer_phone
            FROM orders o
            LEFT JOIN restaurant_tables t ON o.table_id = t.id
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        ");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            http_response_code(404);
            echo json_encode(['error' => 'Order not found']);
            return;
        }

        // Get items
        $stmtItems = $db->prepare("
            SELECT oi.*, p.name as product_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        ");
        $stmtItems->execute([$orderId]);
        $order['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        // Get payments
        $stmtPayments = $db->prepare("
            SELECT op.id, op.amount, op.payment_method, op.receipt_image, op.created_at, b.bank_name, b.account_number 
            FROM order_payments op
            LEFT JOIN bank_accounts b ON op.bank_account_id = b.id
            WHERE op.order_id = ?
        ");
        $stmtPayments->execute([$orderId]);
        $order['payments'] = $stmtPayments->fetchAll(PDO::FETCH_ASSOC);

        if ((isset($_GET['download']) && $_GET['download'] == 1) || (isset($_GET['view']) && $_GET['view'] == 1)) {
            $paymentMethodLabel = ucfirst($order['payment_method'] ?? 'Pendiente');

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
                    .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                    .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
                    .header p { margin: 2px 0; font-size: 11px; }
                    .info { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                    .info p { margin: 2px 0; }
                    .table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                    .table th { border-bottom: 1px dashed #000; padding: 4px 0; text-align: left; font-size: 11px; }
                    .table td { padding: 4px 0; text-align: left; vertical-align: top; font-size: 11px; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .total-row { border-top: 1px dashed #000; font-weight: bold; font-size: 14px; }
                    .total-row td { padding-top: 10px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                </style>
            </head>
            <body>
                <div class='header'>
                    <h2>KRUSTACIO KASCARUDO</h2>
                    <p>Pedido #{$order['daily_number']}</p>
                    <p>{$order['created_at']}</p>
                </div>
                <div class='info'>
                    <p><strong>Mesa:</strong> {$order['table_number']} &nbsp;|&nbsp; <strong>Mesero:</strong> {$order['waiter_name']}</p>
                    <p><strong>Cliente:</strong> " . ($order['customer_name'] ?? 'CONSUMIDOR FINAL') . "</p>
                    <p><strong>Cédula/RUC:</strong> " . ($order['customer_id_number'] ?? '9999999999') . "</p>
                    <p><strong>Método de Pago:</strong> {$paymentMethodLabel}</p>
                </div>
                <table class='table'>
                    <tr>
                        <th>Cant</th>
                        <th>Descripción</th>
                        <th class='text-right'>Total</th>
                    </tr>";

            foreach ($order['items'] as $item) {
                $subtotal = number_format($item['quantity'] * $item['price'], 2);
                $html .= "<tr>
                            <td>{$item['quantity']}</td>
                            <td>{$item['product_name']}</td>
                            <td class='text-right'>\${$subtotal}</td>
                          </tr>";
            }

            $html .= "
                <tr class='total-row'>
                    <td colspan='2' class='text-right'>TOTAL</td>
                    <td class='text-right'>$" . number_format($order['total'], 2) . "</td>
                </tr>
            </table>";

            if (!empty($order['payments'])) {
                $html .= "<div style='margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px;'>
                            <p style='margin: 0 0 5px 0; font-weight: bold; font-size: 11px;'>MÉTODOS DE PAGO:</p>";
                foreach ($order['payments'] as $p) {
                    $method = strtoupper($p['payment_method']);
                    if ($p['bank_name']) {
                        $method .= " (" . $p['bank_name'] . ")";
                    }
                    $html .= "<div style='display: flex; justify-content: space-between; font-size: 11px;'>
                                <span>" . $method . "</span>
                                <span>$" . number_format($p['amount'], 2) . "</span>
                              </div>";
                }
                $html .= "</div>";
            } else {
                $html .= "<div style='margin-top: 10px; text-align: center; font-weight: bold; font-size: 12px; border: 1px solid #000; padding: 2px;'>
                            PENDIENTE DE PAGO
                          </div>";
            }

            $html .= "<div class='footer'>
                <p>¡Gracias por su preferencia!</p>
            </div>
            </body>
            </html>";

            $dompdf = new \Dompdf\Dompdf();
            $dompdf->loadHtml($html);
            // 58mm is approx 164.41 points.
            $dompdf->setPaper(array(0, 0, 164.41, 800));
            $dompdf->render();

            $disposition = (isset($_GET['download']) && $_GET['download'] == 1) ? 'attachment' : 'inline';

            header("Content-Type: application/pdf");
            header("Content-Disposition: {$disposition}; filename=\"orden_{$order['id']}.pdf\"");
            echo $dompdf->output();
            exit;
        }

        echo json_encode($order);
    }

    public function update(): void
    {
        $storageDir = NotificationService::getStoragePath();
        $logFile = $storageDir . '/qz_debug.log';

        @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: Order update() called\n", FILE_APPEND);

        $user = AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);

        $orderId = $data['order_id'] ?? null;
        if (!$orderId) {
            @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: update() failed - order_id missing\n", FILE_APPEND);
            http_response_code(400);
            echo json_encode(['error' => 'order_id is required']);
            return;
        }

        $db = Database::getConnection();

        try {
            $db->beginTransaction();

            // Get current order
            $stmt = $db->prepare("SELECT status, table_id FROM orders WHERE id = ?");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order)
                throw new Exception("Order not found");
            if ($order['status'] === 'cobrado')
                throw new Exception("Cannot edit a paid order");

            // Update items if provided
            if (isset($data['items']) && is_array($data['items'])) {
                file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: Updating items for order $orderId\n", FILE_APPEND);
                // Delete existing items
                $db->prepare("DELETE FROM order_items WHERE order_id = ?")->execute([$orderId]);

                $newTotal = 0;
                $stmtItem = $db->prepare("INSERT INTO order_items (order_id, product_id, quantity, price, notes) VALUES (?, ?, ?, ?, ?)");

                foreach ($data['items'] as $item) {
                    $stmtPrice = $db->prepare("SELECT price, is_takeaway, takeaway_surcharge FROM products WHERE id = ?");
                    $stmtPrice->execute([$item['product_id']]);
                    $product = $stmtPrice->fetch(PDO::FETCH_ASSOC);

                    if ($product === false)
                        throw new Exception("Product ID {$item['product_id']} not found");

                    $price = (float) $product['price'];
                    $finalTableId = array_key_exists('table_id', $data) ? $data['table_id'] : $order['table_id'];
                    $isTakeawayOrder = ($finalTableId === null);

                    if ($isTakeawayOrder && ($product['is_takeaway'] == 1)) {
                        $price += (float) ($product['takeaway_surcharge'] ?? 0);
                    }

                    $subtotal = $price * $item['quantity'];
                    $newTotal += $subtotal;

                    $stmtItem->execute([$orderId, $item['product_id'], $item['quantity'], $price, $item['notes'] ?? null]);
                }

                // Update order total
                $db->prepare("UPDATE orders SET total = ?, updated_by = ? WHERE id = ?")->execute([$newTotal, $user->id, $orderId]);
            }

            // Update table_id if provided
            if (array_key_exists('table_id', $data)) {
                $newTableId = $data['table_id'];
                if ($newTableId != $order['table_id']) {
                    file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: Changing table for order $orderId from {$order['table_id']} to $newTableId\n", FILE_APPEND);
                    // Free old table
                    if ($order['table_id']) {
                        $db->prepare("UPDATE restaurant_tables SET status = 'disponible' WHERE id = ?")->execute([$order['table_id']]);
                    }
                    // Occupy new table
                    if ($newTableId) {
                        $db->prepare("UPDATE restaurant_tables SET status = 'ocupada' WHERE id = ?")->execute([$newTableId]);
                    }
                    $db->prepare("UPDATE orders SET table_id = ? WHERE id = ?")->execute([$newTableId, $orderId]);
                }
            }

            $db->commit();
            @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: Order $orderId updated successfully in DB\n", FILE_APPEND);

            // Notificar a todos que hubo una actualización
            NotificationService::sendToTopic('new_orders', 'Pedido Actualizado', "El pedido #$orderId ha sido modificado.", [
                'order_id' => (string) $orderId,
                'type' => 'refresh'
            ]);

            echo json_encode(['message' => 'Order updated successfully']);

        } catch (Exception $e) {
            if ($db->inTransaction())
                $db->rollBack();
            @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: update() ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
            http_response_code(500);
            echo json_encode(['error' => 'Update failed', 'details' => $e->getMessage()]);
        }
    }

    /**
     * Compress an image file before storing it as a receipt blob.
     * Supports JPEG, PNG, and WebP. Returns true on success, false otherwise.
     */
    private function compressImage(string $sourcePath, string $destPath, int $quality = 60): bool
    {
        // Verify source exists
        if (!file_exists($sourcePath)) {
            return false;
        }
        $info = getimagesize($sourcePath);
        if ($info === false) {
            return false;
        }
        $mime = $info['mime'] ?? '';
        switch ($mime) {
            case 'image/jpeg':
                $image = imagecreatefromjpeg($sourcePath);
                break;
            case 'image/png':
                $image = imagecreatefrompng($sourcePath);
                break;
            case 'image/webp':
                if (function_exists('imagecreatefromwebp')) {
                    $image = imagecreatefromwebp($sourcePath);
                } else {
                    $image = false;
                }
                break;
            default:
                return false;
        }
        if ($image === false) {
            return false;
        }
        // Save as JPEG with given quality
        $result = imagejpeg($image, $destPath, $quality);
        imagedestroy($image);
        return $result;
    }

    public function requestRemotePrint(): void
    {
        AuthMiddleware::handle();
        $orderId = $_GET['order_id'] ?? null;
        if (!$orderId) {
            http_response_code(400);
            echo json_encode(['error' => 'order_id required']);
            return;
        }

        PrintQueueController::addJob('print_request', [
            'order_id' => (string) $orderId
        ]);

        NotificationService::sendToTopic('new_orders', 'Imprimir Nota', "Re-imprimiendo nota de venta...", [
            'order_id' => (string) $orderId,
            'type' => 'print_request'
        ]);

        echo json_encode(['message' => 'Print request sent']);
    }

    public function requestRemoteKitchenPrint(): void
    {
        $storageDir = NotificationService::getStoragePath();
        $logFile = $storageDir . '/qz_debug.log';

        @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: requestRemoteKitchenPrint called\n", FILE_APPEND);
        AuthMiddleware::handle();
        $orderId = $_GET['order_id'] ?? null;
        if (!$orderId) {
            @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: requestRemoteKitchenPrint failed - order_id required\n", FILE_APPEND);
            http_response_code(400);
            echo json_encode(['error' => 'order_id required']);
            return;
        }

        @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: adding job for order $orderId\n", FILE_APPEND);
        PrintQueueController::addJob('print_kitchen_request', [
            'order_id' => (string) $orderId
        ]);

        @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: Sending FCM notification for kitchen print order $orderId\n", FILE_APPEND);
        $fcmResult = NotificationService::sendToTopic('new_orders', 'Imprimir Comanda', "Imprimiendo comanda de cocina...", [
            'order_id' => (string) $orderId,
            'type' => 'print_kitchen_request'
        ]);
        @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: FCM result: " . ($fcmResult ? 'SUCCESS' : 'FAILED') . "\n", FILE_APPEND);

        echo json_encode(['message' => 'Kitchen print request sent']);
    }

    public function getKitchenPrintData(): void
    {
        AuthMiddleware::handle();
        $orderId = $_GET['order_id'] ?? null;

        if (!$orderId) {
            http_response_code(400);
            echo json_encode(['error' => 'order_id required']);
            return;
        }

        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT o.*, t.number as table_number
            FROM orders o
            LEFT JOIN restaurant_tables t ON o.table_id = t.id
            WHERE o.id = ?
        ");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            http_response_code(404);
            echo json_encode(['error' => 'Order not found']);
            return;
        }

        $stmtItems = $db->prepare("
            SELECT oi.*, p.name as product_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        ");
        $stmtItems->execute([$orderId]);
        $order['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        if (isset($_GET['raw_html']) && $_GET['raw_html'] == 1) {
            $isTakeaway = is_null($order['table_number']);
            $location = $isTakeaway ? "PARA LLEVAR" : "MESA {$order['table_number']}";

            $html = "
            <html>
            <head>
                <style>
                    @page { margin: 0; }
                    * { box-sizing: border-box; }
                    body { 
                        font-family: 'Courier New', Courier, monospace; 
                        font-size: 12px; 
                        color: #000; 
                        margin: 0; 
                        width: 48mm; 
                        padding: 0 1mm 0 3mm; 
                    }
                    .header { text-align: center; margin-bottom: 10px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                    .header h2 { margin: 0; font-size: 18px; font-weight: bold; }
                    .header h3 { margin: 5px 0; font-size: 20px; font-weight: bold; }
                    .header p { margin: 2px 0; font-size: 12px; }
                    .info { margin-bottom: 10px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                    .info p { margin: 4px 0; font-size: 14px; font-weight: bold;}
                    .table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                    .table td { padding: 6px 0; text-align: left; vertical-align: top; font-size: 16px; font-weight: bold; border-bottom: 1px dashed #ccc;}
                    .notes { margin-top: 10px; padding-top: 10px; border-top: 2px dashed #000; }
                    .notes h4 { margin: 0 0 5px 0; font-size: 14px; }
                    .notes p { margin: 0; font-size: 14px; font-style: italic; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class='header'>
                    <h2>COMANDA COCINA</h2>
                    <h3>{$location}</h3>
                    <p>Orden #" . ($order['daily_number'] ?? $order['id']) . "</p>
                    <p>Fecha: " . explode('.', $order['created_at'])[0] . "</p>
                </div>
                <div class='info'>
                    <p>DETALLE DEL PEDIDO:</p>
                </div>
                <table class='table'>";

            foreach ($order['items'] as $item) {
                $html .= "<tr>
                            <td style='width: 20%;'>{$item['quantity']}x</td>
                            <td style='width: 80%;'>{$item['product_name']}";
                if (!empty($item['notes'])) {
                    $html .= "<br><span style='font-size: 12px; font-weight: normal; font-style: italic;'>OBS: {$item['notes']}</span>";
                }
                $html .= "  </td>
                          </tr>";
            }

            $html .= "</table>";

            if (!empty($order['notes'])) {
                $html .= "<div class='notes'>
                            <h4>NOTAS GENERALES:</h4>
                            <p>{$order['notes']}</p>
                          </div>";
            }

            $html .= "<div class='footer'>
                <p>------ FIN DE COMANDA ------</p>
            </div>
            </body>
            </html>";

            header("Content-Type: text/html");
            echo $html;
            exit;
        }

        echo json_encode($order);
    }

    public function cancel(): void
    {
        $user = AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);

        $orderId = $data['order_id'] ?? null;
        if (!$orderId) {
            http_response_code(400);
            echo json_encode(['error' => 'order_id is required']);
            return;
        }

        $db = Database::getConnection();
        try {
            $db->beginTransaction();

            $stmt = $db->prepare("SELECT status, table_id FROM orders WHERE id = ?");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order)
                throw new Exception("Order not found");
            if ($order['status'] === 'cancelado')
                throw new Exception("Order is already cancelled");

            // 1. Revert stock if it was discounted
            if (in_array($order['status'], ['en cocina', 'entregado', 'cobrado', 'parcial'])) {
                $stmtItems = $db->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
                $stmtItems->execute([$orderId]);
                $items = $stmtItems->fetchAll();
                foreach ($items as $item) {
                    $db->prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND manages_inventory = 1")
                        ->execute([$item['quantity'], $item['product_id']]);
                }
            }

            // 2. Delete payments
            $db->prepare("DELETE FROM order_payments WHERE order_id = ?")->execute([$orderId]);

            // 3. Update order status
            $db->prepare("UPDATE orders SET status = 'cancelado', updated_by = ? WHERE id = ?")
                ->execute([$user->id, $orderId]);

            // 4. Free table
            if ($order['table_id']) {
                $db->prepare("UPDATE restaurant_tables SET status = 'disponible' WHERE id = ?")
                    ->execute([$order['table_id']]);
            }

            $db->commit();
            $this->sendJson(['message' => 'Order cancelled successfully']);
        } catch (Exception $e) {
            if ($db->inTransaction())
                $db->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Cancellation failed', 'details' => $e->getMessage()]);
        }
    }
    public function getTransfers(): void
    {
        $user = AuthMiddleware::handle();
        if ($user->role !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $date = $_GET['date'] ?? date('Y-m-d');
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT p.*, o.daily_number, o.table_id, t.number as table_number, 
                   u.username as cashier_name, b.bank_name
            FROM order_payments p
            JOIN orders o ON p.order_id = o.id
            LEFT JOIN restaurant_tables t ON o.table_id = t.id
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN bank_accounts b ON p.bank_account_id = b.id
            WHERE p.payment_method = 'transferencia' 
            AND DATE(p.created_at) = ?
            ORDER BY p.created_at DESC
        ");
        $stmt->execute([$date]);
        $transfers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtTotal = $db->prepare("
            SELECT COALESCE(SUM(amount), 0) as total
            FROM order_payments
            WHERE payment_method = 'transferencia'
            AND DATE(created_at) = ?
        ");
        $stmtTotal->execute([$date]);
        $total = $stmtTotal->fetchColumn();

        echo json_encode([
            'date' => $date,
            'total' => (float) $total,
            'transfers' => $transfers
        ]);
    }
}

