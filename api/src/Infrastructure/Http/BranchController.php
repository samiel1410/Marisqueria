<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Persistence\Database;

class BranchController extends BaseController {
    public function index(): void {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT id, name, address, created_at FROM branches ORDER BY id DESC");
        $branches = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $this->sendJson(['branches' => $branches]);
    }

    public function show(): void {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            $this->sendError('Branch id is required', 400);
            return;
        }
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT id, name, address, created_at FROM branches WHERE id = ?");
        $stmt->execute([$id]);
        $branch = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$branch) {
            $this->sendError('Branch not found', 404);
            return;
        }
        $this->sendJson(['branch' => $branch]);
    }

    public function store(): void {
        $user = AuthMiddleware::handle();
        // Only admins can create branches — allow if role is admin
        if ($user->role !== 'admin') {
            $this->sendError('Permission denied', 403);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $name = $data['name'] ?? null;
        $address = $data['address'] ?? null;

        if (!$name) {
            $this->sendError('Branch name is required', 400);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO branches (name, address) VALUES (?, ?)");
        $stmt->execute([$name, $address]);
        $id = $db->lastInsertId();
        $this->sendJson(['branch' => ['id' => (int)$id, 'name' => $name, 'address' => $address]], 201);
    }

    public function update(): void {
        $user = AuthMiddleware::handle();
        if ($user->role !== 'admin') {
            $this->sendError('Permission denied', 403);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        $name = $data['name'] ?? null;
        $address = $data['address'] ?? null;

        if (!$id || !$name) {
            $this->sendError('Branch id and name are required', 400);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE branches SET name = ?, address = ? WHERE id = ?");
        $stmt->execute([$name, $address, $id]);
        $this->sendJson(['branch' => ['id' => (int)$id, 'name' => $name, 'address' => $address]]);
    }

    public function delete(): void {
        $user = AuthMiddleware::handle();
        if ($user->role !== 'admin') {
            $this->sendError('Permission denied', 403);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if (!$id) {
            $this->sendError('Branch id is required', 400);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM branches WHERE id = ?");
        $stmt->execute([$id]);
        $this->sendSuccess([], 'Branch deleted');
    }
}
