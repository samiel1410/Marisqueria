<?php

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use App\Infrastructure\Persistence\Database;

// Load environment variables
if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

try {
    $db = Database::getConnection();
} catch (Exception $e) {
    die("Database connection failed: " . $e->getMessage() . "\n");
}

// Delete the migration record
try {
    $stmt = $db->prepare("DELETE FROM migrations WHERE migration_name = ?");
    $stmt->execute(['003_add_branches_and_user_branch.sql']);
    echo "Migration record deleted successfully.\n";
} catch (Exception $e) {
    echo "Error deleting migration record: " . $e->getMessage() . "\n";
}
