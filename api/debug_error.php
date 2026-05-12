<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    
    $currentDay = strtolower(date('l'));
    $limit = 100;
    $offset = 0;
    
    $sql = "
        SELECT p.*, c.name as category_name, br.name as brand_name,
               (CASE WHEN ps.{$currentDay} = 1 THEN 1 ELSE 0 END) as is_daily,
               COALESCE(SUM(pbs.stock), p.stock) as current_stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands br ON p.brand_id = br.id
        LEFT JOIN product_schedules ps ON p.id = ps.product_id
        LEFT JOIN product_branch_stock pbs ON p.id = pbs.product_id
        GROUP BY p.id
        ORDER BY c.name ASC, p.name ASC
        LIMIT $limit OFFSET $offset
    ";
    
    $stmt = $db->query($sql);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "SUCCESS: " . count($results) . " products found.\n";
    
} catch (Exception $e) {
    echo "ERROR_MESSAGE: " . $e->getMessage() . "\n";
    echo "ERROR_CODE: " . $e->getCode() . "\n";
}
