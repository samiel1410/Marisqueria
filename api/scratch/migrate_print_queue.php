<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->load();

$db = App\Infrastructure\Persistence\Database::getConnection();

$db->exec("CREATE TABLE IF NOT EXISTS print_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    data JSON NOT NULL,
    status ENUM('pending','done','failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL
)");

echo "print_queue table created OK\n";
