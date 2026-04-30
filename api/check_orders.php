<?php
$pdo = new PDO("mysql:host=localhost;dbname=marisqueria", "root", "");
$stmt = $pdo->query("SELECT id, user_id, status FROM orders ORDER BY id DESC LIMIT 5");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT);
