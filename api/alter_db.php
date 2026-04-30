<?php
require 'vendor/autoload.php';

use App\Infrastructure\Persistence\Database;

$db = Database::getConnection();

try {
    $db->exec("ALTER TABLE products ADD COLUMN manages_inventory TINYINT(1) DEFAULT 1;");
    echo "Columna manages_inventory agregada con exito.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
