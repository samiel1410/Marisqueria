<?php
require 'vendor/autoload.php';
$db = App\Infrastructure\Persistence\Database::getConnection();
try {
    $db->exec("ALTER TABLE cash_sessions ADD COLUMN expected_balance DECIMAL(10,2) DEFAULT 0.00 AFTER closing_breakdown");
    echo "Added expected_balance\n";
} catch (Exception $e) {
    echo "Error adding expected_balance: " . $e->getMessage() . "\n";
}
try {
    $db->exec("ALTER TABLE cash_sessions ADD COLUMN difference DECIMAL(10,2) DEFAULT 0.00 AFTER expected_balance");
    echo "Added difference\n";
} catch (Exception $e) {
    echo "Error adding difference: " . $e->getMessage() . "\n";
}
