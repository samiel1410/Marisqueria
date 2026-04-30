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

try {
    // 1) Agregar columnas de posición a restaurant_tables (si no existen)
    $columns = ['pos_x', 'pos_y', 'width', 'height'];
    
    foreach ($columns as $column) {
        $stmt = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'restaurant_tables' AND column_name = '$column'");
        $columnExists = $stmt->fetchColumn() > 0;
        
        if (!$columnExists) {
            $db->exec("ALTER TABLE restaurant_tables ADD COLUMN $column INT DEFAULT 0");
            echo "Added $column column\n";
        } else {
            echo "$column column already exists\n";
        }
    }
    
    // Mark migration as executed
    $stmt = $db->prepare("INSERT INTO migrations (migration_name) VALUES (?) ON DUPLICATE KEY UPDATE migration_name = migration_name");
    $stmt->execute(['004_table_positions.sql']);
    
    echo "Migration 004 completed successfully.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
