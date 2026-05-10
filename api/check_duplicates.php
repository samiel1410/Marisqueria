<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    $stmt = $db->query("
        SELECT product_id, branch_id, COUNT(*) as cnt 
        FROM product_branch_stock 
        GROUP BY product_id, branch_id 
        HAVING cnt > 1
    ");
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($duplicates) . " duplicate combinations.\n";
    print_r($duplicates);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
