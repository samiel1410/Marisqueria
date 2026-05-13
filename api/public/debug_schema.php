<?php
require 'web/api/vendor/autoload.php';
if (file_exists('web/api/.env')) {
    Dotenv\Dotenv::createImmutable('web/api')->load();
}
try {
    $db = App\Infrastructure\Persistence\Database::getConnection();
    $res = $db->query("DESCRIBE order_payments");
    $cols = $res->fetchAll(PDO::FETCH_ASSOC);
    header('Content-Type: application/json');
    echo json_encode($cols);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
