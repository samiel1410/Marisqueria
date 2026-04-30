<?php
require 'vendor/autoload.php';

try {
    $db = new PDO('mysql:host=localhost;dbname=marisqueria;charset=utf8', 'root', '');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Starting data reset...\n";

    // Disable foreign key checks to allow truncation if needed, 
    // although we can just delete in order.
    $db->exec("SET FOREIGN_KEY_CHECKS = 0");

    echo "Cleaning order_items...\n";
    $db->exec("TRUNCATE TABLE order_items");

    echo "Cleaning order_payments...\n";
    $db->exec("TRUNCATE TABLE order_payments");

    echo "Cleaning orders...\n";
    $db->exec("TRUNCATE TABLE orders");

    echo "Cleaning cash_movements...\n";
    $db->exec("TRUNCATE TABLE cash_movements");

    echo "Cleaning cash_sessions...\n";
    $db->exec("TRUNCATE TABLE cash_sessions");

    echo "Resetting restaurant_tables status...\n";
    $db->exec("UPDATE restaurant_tables SET status = 'disponible'");

    $db->exec("SET FOREIGN_KEY_CHECKS = 1");

    echo "SUCCESS: All orders, payments, sessions and movements have been deleted.\n";
    echo "Tables have been reset to 'disponible'.\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
