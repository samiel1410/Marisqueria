<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;

try {
    $db = Database::getConnection();
    
    // Agregar columnas a la tabla products
    // is_takeaway: 1 si permite precio adicional por llevar, 0 si no
    // takeaway_surcharge: el valor a sumar al precio base
    
    $db->exec("ALTER TABLE products ADD COLUMN is_takeaway TINYINT(1) DEFAULT 0");
    $db->exec("ALTER TABLE products ADD COLUMN takeaway_surcharge DECIMAL(10,2) DEFAULT 0.00");
    
    echo "Columnas is_takeaway y takeaway_surcharge agregadas a la tabla products.\n";

} catch (Exception $e) {
    // Si ya existen, ignorar el error
    echo "Info/Error: " . $e->getMessage() . "\n";
}
