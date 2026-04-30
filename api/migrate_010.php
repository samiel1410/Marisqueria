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
    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='orders' AND column_name='bank_account_id'")->fetchColumn();
    if (!$col) {
        $db->exec("ALTER TABLE orders ADD COLUMN bank_account_id INT NULL");
        $db->exec("ALTER TABLE orders ADD CONSTRAINT fk_order_bank FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL");
        echo "bank_account_id column added to orders table\n";
    } else {
        echo "bank_account_id already exists\n";
    }

    $stmt = $db->prepare("INSERT INTO migrations (migration_name) VALUES (?) ON DUPLICATE KEY UPDATE migration_name=migration_name");
    $stmt->execute(['010_add_bank_to_orders.sql']);
    echo "Migration 010 done.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
