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
    $db->beginTransaction();
    
    // 1) Crear tabla de sucursales
    $db->exec("CREATE TABLE IF NOT EXISTS branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        address VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    // 2) Agregar columna branch_id a users (si no existe)
    $stmt = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'branch_id'");
    $columnExists = $stmt->fetchColumn() > 0;
    
    if (!$columnExists) {
        $db->exec("ALTER TABLE users ADD COLUMN branch_id INT NULL AFTER password");
        echo "Added branch_id column\n";
    } else {
        echo "branch_id column already exists\n";
    }
    
    // 3) Modificar role enum
    $stmt = $db->query("SELECT column_type FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'role'");
    $columnType = $stmt->fetchColumn();
    
    if (strpos($columnType, 'empleado') === false) {
        $db->exec("ALTER TABLE users MODIFY COLUMN role ENUM('admin','empleado','cajero','mesero','cocina') NOT NULL DEFAULT 'empleado'");
        echo "Modified role enum\n";
    } else {
        echo "role enum already updated\n";
    }
    
    // 4) Añadir FK a branches (si no existe)
    $stmt = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE table_name = 'users' AND constraint_name = 'fk_users_branch'");
    $fkExists = $stmt->fetchColumn() > 0;
    
    if (!$fkExists) {
        $db->exec("ALTER TABLE users ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL");
        echo "Added foreign key\n";
    } else {
        echo "Foreign key already exists\n";
    }
    
    // 5) Insertar sucursal por defecto y asignarla al usuario admin si existe
    $db->exec("INSERT IGNORE INTO branches (name, address) VALUES ('Sucursal Principal', 'Dirección principal')");
    $db->exec("UPDATE users SET branch_id = 1 WHERE username = 'admin'");
    
    // Mark migration as executed
    $stmt = $db->prepare("INSERT INTO migrations (migration_name) VALUES (?) ON DUPLICATE KEY UPDATE migration_name = migration_name");
    $stmt->execute(['003_add_branches_and_user_branch.sql']);
    
    echo "Migration 003 completed successfully.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
