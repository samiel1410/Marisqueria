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
    // Desglose de apertura (JSON con billetes/monedas)
    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='cash_sessions' AND column_name='opening_breakdown'")->fetchColumn();
    if (!$col) {
        $db->exec("ALTER TABLE cash_sessions ADD COLUMN opening_breakdown JSON NULL AFTER opening_balance");
        echo "opening_breakdown added\n";
    } else { echo "opening_breakdown exists\n"; }

    // Desglose de cierre
    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='cash_sessions' AND column_name='closing_breakdown'")->fetchColumn();
    if (!$col) {
        $db->exec("ALTER TABLE cash_sessions ADD COLUMN closing_breakdown JSON NULL AFTER closing_balance");
        echo "closing_breakdown added\n";
    } else { echo "closing_breakdown exists\n"; }

    $stmt = $db->prepare("INSERT INTO migrations (migration_name) VALUES (?) ON DUPLICATE KEY UPDATE migration_name=migration_name");
    $stmt->execute(['008_cash_breakdown.sql']);
    echo "Migration 008 done.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
