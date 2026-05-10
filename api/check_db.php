<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    echo "Driver: " . $driver . "\n";
    
    if ($driver === 'sqlite') {
        echo "SQLite detected!\n";
    } else {
        echo "MySQL detected!\n";
    }

    $tables = [];
    if ($driver === 'sqlite') {
        $stmt = $db->query("SELECT name FROM sqlite_master WHERE type='table'");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    } else {
        $stmt = $db->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    echo "Tables: " . implode(", ", $tables) . "\n";

    if (in_array('product_branch_stock', $tables)) {
        echo "Schema for product_branch_stock:\n";
        if ($driver === 'sqlite') {
            $stmt = $db->query("PRAGMA table_info(product_branch_stock)");
            print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
        } else {
            $stmt = $db->query("DESCRIBE product_branch_stock");
            print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
