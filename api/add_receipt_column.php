<?php
require __DIR__ . '/src/Infrastructure/Persistence/Database.php';
try {
    $db = \App\Infrastructure\Persistence\Database::getConnection();
    // Check if column exists first
    $stmt = $db->query("DESCRIBE order_payments");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('receipt_path', $columns)) {
        $db->exec("ALTER TABLE order_payments ADD COLUMN receipt_path VARCHAR(255) NULL AFTER bank_account_id");
        echo "Column receipt_path added to order_payments\n";
    } else {
        echo "Column receipt_path already exists\n";
    }
} catch (Exception $e) {
    echo $e->getMessage();
}
