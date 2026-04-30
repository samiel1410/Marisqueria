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
    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='restaurant_tables' AND column_name='shape'")->fetchColumn();
    if (!$col) {
        $db->exec("ALTER TABLE restaurant_tables ADD COLUMN shape ENUM('square','rectangle','circle') DEFAULT 'square'");
        echo "shape column added\n";
    } else { echo "shape exists\n"; }

    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='restaurant_tables' AND column_name='seats'")->fetchColumn();
    if (!$col) {
        $db->exec("ALTER TABLE restaurant_tables ADD COLUMN seats INT DEFAULT 4");
        echo "seats column added\n";
    } else { echo "seats exists\n"; }

    $stmt = $db->prepare("INSERT INTO migrations (migration_name) VALUES (?) ON DUPLICATE KEY UPDATE migration_name=migration_name");
    $stmt->execute(['006_table_shape_seats.sql']);
    echo "Migration 006 done.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
