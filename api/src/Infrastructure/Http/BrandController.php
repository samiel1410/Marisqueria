<?php
namespace App\Infrastructure\Http;
use App\Infrastructure\Persistence\Database;

class BrandController extends BaseController {

    public function index(): void {
        $db = Database::getConnection();
        $brands = $db->query("SELECT * FROM brands ORDER BY name ASC")->fetchAll(\PDO::FETCH_ASSOC);
        $this->sendJson(['brands' => $brands]);
    }

    public function store(): void {
        $user = AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        $name = trim($data['name'] ?? '');
        if (!$name) { $this->sendError('Name is required', 400); return; }
        $db = Database::getConnection();
        try {
            $stmt = $db->prepare("INSERT INTO brands (name) VALUES (?)");
            $stmt->execute([$name]);
            $this->sendJson(['brand' => ['id' => (int)$db->lastInsertId(), 'name' => $name]], 201);
        } catch (\PDOException $e) {
            $this->sendError('Brand already exists', 409);
        }
    }

    public function delete(): void {
        $user = AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if (!$id) { $this->sendError('ID required', 400); return; }
        $db = Database::getConnection();
        $db->prepare("DELETE FROM brands WHERE id=?")->execute([$id]);
        $this->sendSuccess([], 'Brand deleted');
    }

    public function update(): void {
        $user = AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = $data['id'] ?? null;
        $name = trim($data['name'] ?? '');
        if (!$id || !$name) { $this->sendError('ID and name required', 400); return; }
        $db = Database::getConnection();
        $db->prepare("UPDATE brands SET name=? WHERE id=?")->execute([$name, $id]);
        $this->sendSuccess([], 'Brand updated');
    }
}
