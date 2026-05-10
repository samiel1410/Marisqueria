<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    
    // 1. Eliminar posibles duplicados antes de crear el indice unico
    // Nos quedamos con el registro con el ID mas alto (el mas reciente) para cada par (producto, sucursal)
    $db->exec("
        DELETE p1 FROM product_branch_stock p1
        INNER JOIN product_branch_stock p2 
        WHERE p1.id < p2.id 
        AND p1.product_id = p2.product_id 
        AND p1.branch_id = p2.branch_id
    ");
    
    echo "Duplicados eliminados.\n";

    // 2. Agregar el indice UNICO si no existe
    // Primero verificamos si ya existe
    $stmt = $db->query("SHOW INDEX FROM product_branch_stock WHERE Key_name = 'unique_product_branch'");
    if ($stmt->rowCount() === 0) {
        $db->exec("ALTER TABLE product_branch_stock ADD UNIQUE INDEX unique_product_branch (product_id, branch_id)");
        echo "Índice único agregado a product_branch_stock.\n";
    } else {
        echo "El índice único ya existe.\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
