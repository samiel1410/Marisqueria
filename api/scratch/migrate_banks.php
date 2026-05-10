<?php
require_once __DIR__ . '/../src/Infrastructure/Persistence/Database.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    $db->exec("ALTER TABLE bank_accounts MODIFY qr_path LONGTEXT");
    echo "SUCCESS: Column qr_path modified to LONGTEXT\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
