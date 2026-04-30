<?php
require 'vendor/autoload.php';
$db = App\Infrastructure\Persistence\Database::getConnection();
foreach(['orders','cash_movements','cash_sessions'] as $t) {
    echo "\nTable: $t\n";
    $s = $db->query("DESCRIBE $t");
    print_r($s->fetchAll(PDO::FETCH_ASSOC));
}
