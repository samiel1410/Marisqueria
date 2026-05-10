<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;
$db = Database::getConnection();
$stmt = $db->query("SHOW DATABASES");
print_r($stmt->fetchAll(PDO::FETCH_COLUMN));
