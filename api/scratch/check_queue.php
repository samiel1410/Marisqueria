<?php
require_once __DIR__ . '/../vendor/autoload.php';
$db = App\Infrastructure\Persistence\Database::getConnection();
$stmt = $db->query("SELECT * FROM print_queue ORDER BY created_at DESC LIMIT 10");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows, JSON_PRETTY_PRINT);
