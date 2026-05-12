<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Persistence\Database;
use PDO;

class CategoryController extends BaseController {
    
    public function index(): void {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM categories ORDER BY name ASC");
        $categories = $stmt->fetchAll();
        
        echo json_encode($categories);
    }
    
    public function store(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['name'])) {
            $this->sendError('Name is required', 400);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO categories (name, type) VALUES (?, ?)");
        $stmt->execute([$data['name'], $data['type'] ?? 'alimento']);
        
        $this->sendJson(['message' => 'Category created', 'id' => (int)$db->lastInsertId()], 201);
    }

    public function delete(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if (!$id) {
            $this->sendError('ID required', 400);
            return;
        }
        $db = Database::getConnection();
        $db->prepare("DELETE FROM categories WHERE id = ?")->execute([$id]);
        $this->sendSuccess([], 'Category deleted');
    }

    public function update(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = $data['id'] ?? null;
        $name = trim($data['name'] ?? '');
        $type = $data['type'] ?? 'alimento';
        
        if (!$id || !$name) {
            $this->sendError('ID and name required', 400);
            return;
        }
        $db = Database::getConnection();
        $db->prepare("UPDATE categories SET name=?, `type`=? WHERE id=?")->execute([$name, $type, $id]);
        
        $this->sendSuccess([], 'Categoría actualizada');
    }
}
