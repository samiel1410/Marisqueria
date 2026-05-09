<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Persistence\Database;
use PDO;

class CustomerController {

    public function lookup(): void {
        AuthMiddleware::handle();
        $identification = $_GET['identification'] ?? null;
        
        if (!$identification) {
            http_response_code(400);
            echo json_encode(['error' => 'Identification required']);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM customers WHERE identification = ?");
        $stmt->execute([$identification]);
        $customer = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($customer) {
            echo json_encode($customer);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Customer not found']);
        }
    }

    public function store(): void {
        AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['identification']) || empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Identification and name are required']);
            return;
        }

        $db = Database::getConnection();
        
        // Check if exists
        $stmt = $db->prepare("SELECT id FROM customers WHERE identification = ?");
        $stmt->execute([$data['identification']]);
        $existing = $stmt->fetch();

        if ($existing) {
            // Update
            $stmt = $db->prepare("UPDATE customers SET name = ?, email = ?, phone = ? WHERE id = ?");
            $stmt->execute([
                $data['name'],
                $data['email'] ?? null,
                $data['phone'] ?? null,
                $existing['id']
            ]);
            $customerId = $existing['id'];
        } else {
            // Insert
            $stmt = $db->prepare("INSERT INTO customers (identification, name, email, phone) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $data['identification'],
                $data['name'],
                $data['email'] ?? null,
                $data['phone'] ?? null
            ]);
            $customerId = $db->lastInsertId();
        }

        echo json_encode(['message' => 'Customer saved', 'id' => $customerId]);
    }
    
    public function index(): void {
        AuthMiddleware::handle();
        $search = $_GET['search'] ?? null;
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);
        $offset = ($page - 1) * $limit;

        $db = Database::getConnection();
        
        $sql = "SELECT * FROM customers WHERE 1=1";
        $params = [];

        if ($search) {
            $sql .= " AND (name LIKE ? OR identification LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        // Get total for pagination
        $countSql = str_replace("SELECT * FROM customers", "SELECT COUNT(*) FROM customers", $sql);
        $stmtCount = $db->prepare($countSql);
        $stmtCount->execute($params);
        $total = $stmtCount->fetchColumn();

        $sql .= " ORDER BY name ASC LIMIT $limit OFFSET $offset";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'data' => $customers,
            'total' => (int)$total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit)
        ]);
    }
}
