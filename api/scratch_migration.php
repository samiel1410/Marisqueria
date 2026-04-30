<?php
require_once __DIR__ . '/src/Infrastructure/Persistence/Database.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    $sql = "CREATE TABLE IF NOT EXISTS product_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        monday TINYINT(1) DEFAULT 0,
        tuesday TINYINT(1) DEFAULT 0,
        wednesday TINYINT(1) DEFAULT 0,
        thursday TINYINT(1) DEFAULT 0,
        friday TINYINT(1) DEFAULT 0,
        saturday TINYINT(1) DEFAULT 0,
        sunday TINYINT(1) DEFAULT 0,
        UNIQUE(product_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )";
    $db->exec($sql);
    echo "Tabla product_schedules creada con éxito\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
