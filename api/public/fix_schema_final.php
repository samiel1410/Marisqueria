<?php
require 'web/api/vendor/autoload.php';
if (file_exists('web/api/.env')) {
    Dotenv\Dotenv::createImmutable('web/api')->load();
}
try {
    $db = App\Infrastructure\Persistence\Database::getConnection();
    
    // 1. Ensure the column is named receipt_image and is LONGTEXT
    // First check if receipt_blob exists and rename it if so
    $res = $db->query("DESCRIBE order_payments");
    $cols = $res->fetchAll(PDO::FETCH_ASSOC);
    
    $hasImage = false;
    $hasBlob = false;
    foreach($cols as $c) {
        if ($c['Field'] == 'receipt_image') $hasImage = true;
        if ($c['Field'] == 'receipt_blob') $hasBlob = true;
    }
    
    if ($hasBlob && !$hasImage) {
        $db->exec("ALTER TABLE order_payments CHANGE receipt_blob receipt_image LONGTEXT");
        echo "Renamed receipt_blob to receipt_image and set to LONGTEXT.\n";
    } else if (!$hasImage) {
        $db->exec("ALTER TABLE order_payments ADD COLUMN receipt_image LONGTEXT AFTER bank_account_id");
        echo "Added receipt_image column as LONGTEXT.\n";
    } else {
        $db->exec("ALTER TABLE order_payments MODIFY COLUMN receipt_image LONGTEXT");
        echo "Updated receipt_image column to LONGTEXT.\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
