<?php
require __DIR__ . '/../src/Infrastructure/Persistence/Database.php';
header('Content-Type: application/json');

try {
    $db = \App\Infrastructure\Persistence\Database::getConnection();
    
    // Check if column exists
    $stmt = $db->query("DESCRIBE order_payments");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $results = [];
    if (!in_array('receipt_path', $columns)) {
        $db->exec("ALTER TABLE order_payments ADD COLUMN receipt_path VARCHAR(255) NULL AFTER bank_account_id");
        $results[] = "Column receipt_path added to order_payments";
    } else {
        $results[] = "Column receipt_path already exists";
    }
    
    echo json_encode(['status' => 'success', 'results' => $results]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
