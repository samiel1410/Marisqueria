<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;
$db = Database::getConnection();
echo "Branches: " . $db->query("SELECT COUNT(*) FROM branches")->fetchColumn() . "\n";
$rows = $db->query("SELECT * FROM branches")->fetchAll(PDO::FETCH_ASSOC);
print_r($rows);
