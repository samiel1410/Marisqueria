<?php
require_once __DIR__ . '/src/Infrastructure/Persistence/Database.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    $db->exec("ALTER TABLE orders ADD COLUMN bank_account_id INT NULL");
    echo "Column bank_account_id added successfully\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
