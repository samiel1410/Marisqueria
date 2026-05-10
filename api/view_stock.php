<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    $stmt = $db->query("SELECT * FROM product_branch_stock LIMIT 50");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($rows);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
