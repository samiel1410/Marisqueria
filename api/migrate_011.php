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
    // Add cash_amount
    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='orders' AND column_name='cash_amount'")->fetchColumn();
    if (!$col) {
        $db->exec("ALTER TABLE orders ADD COLUMN cash_amount DECIMAL(10,2) NULL");
        echo "cash_amount column added\n";
    }

    // Add transfer_amount
    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='orders' AND column_name='transfer_amount'")->fetchColumn();
    if (!$col) {
        $db->exec("ALTER TABLE orders ADD COLUMN transfer_amount DECIMAL(10,2) NULL");
        echo "transfer_amount column added\n";
    }

    $stmt = $db->prepare("INSERT INTO migrations (migration_name) VALUES (?) ON DUPLICATE KEY UPDATE migration_name=migration_name");
    $stmt->execute(['011_mixed_payment_columns.sql']);
    echo "Migration 011 done.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
