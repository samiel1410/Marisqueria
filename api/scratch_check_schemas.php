<?php
require 'vendor/autoload.php';
$db = new PDO('mysql:host=localhost;dbname=marisqueria;charset=utf8', 'root', '');

function desc($table) {
    global $db;
    echo "\n--- Table: $table ---\n";
    $stmt = $db->query("DESCRIBE $table");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
}

desc('orders');
desc('order_payments');
desc('cash_sessions');
