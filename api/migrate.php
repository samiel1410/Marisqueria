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

// Create migrations table if it doesn't exist
$db->exec("
    CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
");

$migrationsDir = __DIR__ . '/migrations';
$files = glob($migrationsDir . '/*.sql');
sort($files);

$executedMigrations = $db->query("SELECT migration_name FROM migrations")->fetchAll(PDO::FETCH_COLUMN);

$pendingMigrations = [];
foreach ($files as $file) {
    $migrationName = basename($file);
    if (!in_array($migrationName, $executedMigrations)) {
        $pendingMigrations[] = $file;
    }
}

if (empty($pendingMigrations)) {
    echo "No pending migrations to run.\n";
    exit;
}

foreach ($pendingMigrations as $file) {
    $migrationName = basename($file);
    echo "Running migration: $migrationName ... ";
    
    // Special handling for migration 003 and 004
    if ($migrationName === '003_add_branches_and_user_branch.sql') {
        try {
            exec("php " . escapeshellarg(__DIR__ . "/migrate_003.php"), $output, $returnVar);
            if ($returnVar === 0) {
                echo "SUCCESS\n";
            } else {
                echo "FAILED\n";
                echo "Error: Migration script returned non-zero exit code\n";
                exit(1);
            }
        } catch (Exception $e) {
            echo "FAILED\n";
            echo "Error: " . $e->getMessage() . "\n";
            exit(1);
        }
        continue;
    }
    
    if ($migrationName === '004_table_positions.sql') {
        try {
            exec("php " . escapeshellarg(__DIR__ . "/migrate_004.php"), $output, $returnVar);
            if ($returnVar === 0) {
                echo "SUCCESS\n";
            } else {
                echo "FAILED\n";
                echo "Error: Migration script returned non-zero exit code\n";
                exit(1);
            }
        } catch (Exception $e) {
            echo "FAILED\n";
            echo "Error: " . $e->getMessage() . "\n";
            exit(1);
        }
        continue;
    }
    
    $sql = file_get_contents($file);
    
    try {
        $db->beginTransaction();
        
        // Split by semicolon and filter empty lines to execute one by one
        // This is more reliable for DDL statements
        $queries = array_filter(array_map('trim', explode(';', $sql)));
        foreach ($queries as $query) {
            if (!empty($query)) {
                $db->exec($query);
            }
        }
        
        $stmt = $db->prepare("INSERT INTO migrations (migration_name) VALUES (?)");
        $stmt->execute([$migrationName]);
        
        if ($db->inTransaction()) {
            $db->commit();
        }
        echo "SUCCESS\n";
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        echo "FAILED\n";
        echo "Error: " . $e->getMessage() . "\n";
        // If it fails because table already exists, we might want to continue, 
        // but for now let's stop to be safe.
        exit(1); 
    }
}

echo "All migrations completed successfully.\n";
