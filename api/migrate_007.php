<?php
require_once __DIR__ . '/vendor/autoload.php';
use Dotenv\Dotenv;
use App\Infrastructure\Persistence\Database;

if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

$db = Database::getConnection();

try {
    // Tabla de cajas registradoras
    $db->exec("CREATE TABLE IF NOT EXISTS cash_registers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        branch_id INT NULL,
        description VARCHAR(255) NULL,
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
    )");
    echo "cash_registers table OK\n";

    // Agregar register_id a cash_sessions
    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='cash_sessions' AND column_name='register_id'")->fetchColumn();
    if (!$col) {
        $db->exec("ALTER TABLE cash_sessions ADD COLUMN register_id INT NULL AFTER user_id");
        $db->exec("ALTER TABLE cash_sessions ADD CONSTRAINT fk_session_register FOREIGN KEY (register_id) REFERENCES cash_registers(id) ON DELETE SET NULL");
        echo "register_id added to cash_sessions\n";
    } else { echo "register_id exists\n"; }

    // Agregar notes a cash_sessions
    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='cash_sessions' AND column_name='notes'")->fetchColumn();
    if (!$col) {
        $db->exec("ALTER TABLE cash_sessions ADD COLUMN notes TEXT NULL");
        echo "notes added to cash_sessions\n";
    } else { echo "notes exists\n"; }

    $stmt = $db->prepare("INSERT INTO migrations (migration_name) VALUES (?) ON DUPLICATE KEY UPDATE migration_name=migration_name");
    $stmt->execute(['007_cash_registers.sql']);
    echo "Migration 007 done.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
