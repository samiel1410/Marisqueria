<?php
require_once __DIR__ . '/vendor/autoload.php';
use Dotenv\Dotenv;
use App\Infrastructure\Persistence\Database;

if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/../');
    $dotenv->load();
}

echo "Using DB: " . (getenv('DB_NAME') ?: 'marisqueria') . "\n";

try {
    $db = Database::getConnection();
    echo "Products: " . $db->query("SELECT COUNT(*) FROM products")->fetchColumn() . "\n";
    echo "Branches: " . $db->query("SELECT COUNT(*) FROM branches")->fetchColumn() . "\n";
    echo "Stock records: " . $db->query("SELECT COUNT(*) FROM product_branch_stock")->fetchColumn() . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
