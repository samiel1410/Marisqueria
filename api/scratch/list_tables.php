<?php
require 'src/Infrastructure/Persistence/Database.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    $tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo implode("\n", $tables);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
