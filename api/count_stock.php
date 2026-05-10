<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;
$db = Database::getConnection();
echo "Count: " . $db->query("SELECT COUNT(*) FROM product_branch_stock")->fetchColumn() . "\n";
