<?php
$pdo = new PDO("mysql:host=localhost;dbname=marisqueria", "root", "");
$stmt = $pdo->query("DESCRIBE users");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
