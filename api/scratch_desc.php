<?php
require 'vendor/autoload.php';
$db = new PDO('mysql:host=localhost;dbname=marisqueria;charset=utf8', 'root', '');
$stmt = $db->query("SELECT p.id, p.name, p.is_daily, ps.sunday FROM products p LEFT JOIN product_schedules ps ON p.id = ps.product_id;");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
