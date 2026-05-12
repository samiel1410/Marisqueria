<?php
require_once __DIR__ . '/../src/Infrastructure/Persistence/Database.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    $db->exec("ALTER TABLE categories ADD COLUMN type ENUM('alimento', 'bebida') DEFAULT 'alimento' AFTER name");
    echo "Column 'type' added to categories table successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
