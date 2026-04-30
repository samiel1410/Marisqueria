<?php
require_once __DIR__ . '/vendor/autoload.php';
use Dotenv\Dotenv;
use App\Infrastructure\Persistence\Database;

if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

$db = Database::getConnection();

try {
    // 1. Crear tabla de pagos
    $db->exec("CREATE TABLE IF NOT EXISTS order_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method TEXT NOT NULL, -- 'efectivo', 'transferencia'
        bank_account_id INTEGER NULL,
        receipt_image TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
    )");

    // 2. Migrar datos existentes (opcional pero recomendado)
    // Buscamos órdenes que tengan cash_amount o transfer_amount y creamos registros en order_payments
    $orders = $db->query("SELECT id, cash_amount, transfer_amount, payment_method, bank_account_id, user_id, created_at FROM orders WHERE status = 'cobrado'")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($orders as $order) {
        if ($order['payment_method'] === 'efectivo') {
            $stmt = $db->prepare("INSERT INTO order_payments (order_id, amount, payment_method, user_id, created_at) SELECT id, total, 'efectivo', user_id, created_at FROM orders WHERE id = ?");
            $stmt->execute([$order['id']]);
        } else if ($order['payment_method'] === 'transferencia') {
            $stmt = $db->prepare("INSERT INTO order_payments (order_id, amount, payment_method, bank_account_id, user_id, created_at) SELECT id, total, 'transferencia', bank_account_id, user_id, created_at FROM orders WHERE id = ?");
            $stmt->execute([$order['id']]);
        } else if ($order['payment_method'] === 'mixto') {
            if ($order['cash_amount'] > 0) {
                $db->prepare("INSERT INTO order_payments (order_id, amount, payment_method, user_id, created_at) VALUES (?, ?, 'efectivo', ?, ?)")
                   ->execute([$order['id'], $order['cash_amount'], $order['user_id'], $order['created_at']]);
            }
            if ($order['transfer_amount'] > 0) {
                $db->prepare("INSERT INTO order_payments (order_id, amount, payment_method, bank_account_id, user_id, created_at) VALUES (?, ?, 'transferencia', ?, ?, ?)")
                   ->execute([$order['id'], $order['transfer_amount'], $order['bank_account_id'], $order['user_id'], $order['created_at']]);
            }
        }
    }

    echo "Migración migrate_012 completada con éxito. Tabla order_payments creada y datos migrados.\n";
} catch (Exception $e) {
    echo "Error en la migración: " . $e->getMessage() . "\n";
}
