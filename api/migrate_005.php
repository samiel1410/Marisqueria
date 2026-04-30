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
    // brands
    $db->exec("CREATE TABLE IF NOT EXISTS brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    echo "brands table OK\n";

    // products: brand_id
    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='products' AND column_name='brand_id'")->fetchColumn();
    if (!$col) { $db->exec("ALTER TABLE products ADD COLUMN brand_id INT NULL"); echo "brand_id added\n"; } else echo "brand_id exists\n";

    // products: image_path
    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='products' AND column_name='image_path'")->fetchColumn();
    if (!$col) { $db->exec("ALTER TABLE products ADD COLUMN image_path VARCHAR(255) NULL"); echo "image_path added\n"; } else echo "image_path exists\n";

    // products: min_stock
    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='products' AND column_name='min_stock'")->fetchColumn();
    if (!$col) { $db->exec("ALTER TABLE products ADD COLUMN min_stock INT DEFAULT 5"); echo "min_stock added\n"; } else echo "min_stock exists\n";

    // products: unit
    $col = $db->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='products' AND column_name='unit'")->fetchColumn();
    if (!$col) { $db->exec("ALTER TABLE products ADD COLUMN unit VARCHAR(50) DEFAULT 'unidades'"); echo "unit added\n"; } else echo "unit exists\n";

    // product_branch_stock
    $db->exec("CREATE TABLE IF NOT EXISTS product_branch_stock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        branch_id INT NOT NULL,
        stock INT DEFAULT 0,
        UNIQUE KEY uq_product_branch (product_id, branch_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    )");
    echo "product_branch_stock table OK\n";

    // inventory_movements
    $db->exec("CREATE TABLE IF NOT EXISTS inventory_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        branch_id INT NULL,
        type ENUM('entrada','salida','ajuste') NOT NULL,
        quantity INT NOT NULL,
        previous_stock INT NOT NULL DEFAULT 0,
        new_stock INT NOT NULL DEFAULT 0,
        reason VARCHAR(255) NULL,
        user_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )");
    echo "inventory_movements table OK\n";

    $stmt = $db->prepare("INSERT INTO migrations (migration_name) VALUES (?) ON DUPLICATE KEY UPDATE migration_name=migration_name");
    $stmt->execute(['005_inventory_module.sql']);
    echo "Migration 005 completed.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
