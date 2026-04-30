<?php
$pdo = new PDO("mysql:host=localhost;dbname=marisqueria", "root", "");
$stmt = $pdo->query("SHOW TABLES");
print_r($stmt->fetchAll(PDO::FETCH_COLUMN));

$tables = ['orders', 'order_items', 'restaurant_tables', 'users'];
foreach ($tables as $t) {
    echo "\n--- $t ---\n";
    $stmt = $pdo->query("DESCRIBE $t");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
}
