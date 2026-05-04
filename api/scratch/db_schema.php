<?php
require 'src/Infrastructure/Persistence/Database.php';
use App\Infrastructure\Persistence\Database;

$db = Database::getConnection();
$tables = ['order_items', 'orders', 'products'];
foreach ($tables as $t) {
    echo "\nTable: $t\n";
    $stmt = $db->query("DESCRIBE $t");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
}
