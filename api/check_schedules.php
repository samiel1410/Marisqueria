<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    echo "Schema for product_schedules:\n";
    $stmt = $db->query("DESCRIBE product_schedules");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
