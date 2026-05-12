<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    echo "Connected\n";
    $currentDay = strtolower(date('l'));
    $sql = "
        SELECT p.*, c.name as category_name, br.name as brand_name,
               (CASE WHEN ps.{$currentDay} = 1 THEN 1 ELSE 0 END) as is_daily
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands br ON p.brand_id = br.id
        LEFT JOIN product_schedules ps ON p.id = ps.product_id
        LIMIT 1
    ";
    $stmt = $db->query($sql);
    $res = $stmt->fetch();
    echo "Query OK\n";
    print_r($res);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
