<?php
require_once __DIR__ . '/../src/Infrastructure/Persistence/Database.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    $stmt = $db->query("DESCRIBE categories");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($columns, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
