<?php
require 'src/Infrastructure/Persistence/Database.php';
$db = App\Infrastructure\Persistence\Database::getConnection();

try {
    $sql = "INSERT INTO product_schedules 
            (product_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday)
            VALUES (:pid, :mon, :tue, :wed, :thu, :fri, :sat, :sun)
            ON DUPLICATE KEY UPDATE 
            monday = VALUES(monday), 
            tuesday = VALUES(tuesday), 
            wednesday = VALUES(wednesday), 
            thursday = VALUES(thursday), 
            friday = VALUES(friday), 
            saturday = VALUES(saturday), 
            sunday = VALUES(sunday)";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':pid' => 1,
        ':mon' => 1,
        ':tue' => 0,
        ':wed' => 0,
        ':thu' => 0,
        ':fri' => 0,
        ':sat' => 0,
        ':sun' => 0
    ]);
    echo "Success!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
