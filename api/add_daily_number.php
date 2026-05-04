<?php
require 'vendor/autoload.php';
use App\Infrastructure\Persistence\Database;

$db = Database::getConnection();

try {
    // Add daily_number column to orders table
    $db->exec("ALTER TABLE orders ADD COLUMN daily_number INT DEFAULT 0;");
    echo "Columna daily_number agregada a la tabla orders.\n";
    
    // Optional: Populate existing orders with their IDs if needed, 
    // but for daily reset we start from now.
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
