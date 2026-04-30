<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=marisqueria", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $sql = file_get_contents(__DIR__ . "/checkout_migration.sql");
    $pdo->exec($sql);
    echo "Migration successful\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
