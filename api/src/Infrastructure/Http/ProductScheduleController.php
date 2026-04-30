<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Persistence\Database;
use PDO;

class ProductScheduleController {

    public function index(): void {
        AuthMiddleware::handle();
        $db = Database::getConnection();
        
        // Obtener todos los productos con su planeación si existe
        $sql = "SELECT p.id as product_id, p.name, p.category_id,
                       c.name as category_name,
                       ps.monday, ps.tuesday, ps.wednesday, ps.thursday, 
                       ps.friday, ps.saturday, ps.sunday
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_schedules ps ON p.id = ps.product_id
                ORDER BY c.name, p.name";
        
        $stmt = $db->query($sql);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function save(): void {
        AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['product_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Product ID required']);
            return;
        }

        $db = Database::getConnection();
        
        $sql = "INSERT INTO product_schedules 
                (product_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday)
                VALUES (:pid, :mon, :tue, :wed, :thu, :fri, :sat, :sun)
                ON DUPLICATE KEY UPDATE 
                monday = :mon2, 
                tuesday = :tue2, 
                wednesday = :wed2, 
                thursday = :thu2, 
                friday = :fri2, 
                saturday = :sat2, 
                sunday = :sun2";

        $stmt = $db->prepare($sql);
        
        $mon = !empty($data['monday']) ? 1 : 0;
        $tue = !empty($data['tuesday']) ? 1 : 0;
        $wed = !empty($data['wednesday']) ? 1 : 0;
        $thu = !empty($data['thursday']) ? 1 : 0;
        $fri = !empty($data['friday']) ? 1 : 0;
        $sat = !empty($data['saturday']) ? 1 : 0;
        $sun = !empty($data['sunday']) ? 1 : 0;

        $stmt->execute([
            ':pid' => $data['product_id'],
            ':mon' => $mon, ':mon2' => $mon,
            ':tue' => $tue, ':tue2' => $tue,
            ':wed' => $wed, ':wed2' => $wed,
            ':thu' => $thu, ':thu2' => $thu,
            ':fri' => $fri, ':fri2' => $fri,
            ':sat' => $sat, ':sat2' => $sat,
            ':sun' => $sun, ':sun2' => $sun
        ]);

        echo json_encode(['message' => 'Planeación actualizada']);
    }
}
