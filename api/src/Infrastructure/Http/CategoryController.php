<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Persistence\Database;
use PDO;

class CategoryController {
    
    public function index(): void {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM categories ORDER BY name ASC");
        $categories = $stmt->fetchAll();
        
        echo json_encode($categories);
    }
    
    public function store(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Name is required']);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO categories (name) VALUES (?)");
        $stmt->execute([$data['name']]);
        
        http_response_code(201);
        echo json_encode(['message' => 'Category created', 'id' => $db->lastInsertId()]);
    }

    public function delete(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required']);
            return;
        }
        $db = Database::getConnection();
        $db->prepare("DELETE FROM categories WHERE id = ?")->execute([$id]);
        echo json_encode(['message' => 'Category deleted']);
    }

    public function update(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = $data['id'] ?? null;
        $name = trim($data['name'] ?? '');
        if (!$id || !$name) {
            http_response_code(400);
            echo json_encode(['error' => 'ID and name required']);
            return;
        }
        $db = Database::getConnection();
        $db->prepare("UPDATE categories SET name=? WHERE id=?")->execute([$name, $id]);
        echo json_encode(['message' => 'Category updated']);
    }
}
