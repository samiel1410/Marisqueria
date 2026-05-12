<?php
require __DIR__ . '/src/Infrastructure/Persistence/Database.php';
function tryConn($host) {
    try {
        $dsn = "mysql:host=$host;port=3306;dbname=marisqueria;charset=utf8mb4";
        $db = new PDO($dsn, 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        echo "Connected to $host\n";
        return $db;
    } catch (Exception $e) {
        echo "Failed to connect to $host: " . $e->getMessage() . "\n";
        return null;
    }
}

$db = tryConn('localhost') ?: tryConn('127.0.0.1');
if ($db) {
    $stmt = $db->query("DESCRIBE order_payments");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}
