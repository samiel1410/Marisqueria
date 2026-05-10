<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;
$db = Database::getConnection();
$stmt = $db->query("SELECT id, name, stock FROM products LIMIT 10");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
