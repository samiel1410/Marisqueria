<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Persistence\Database;

class UserController extends BaseController {
    public function index(): void {
        $user = AuthMiddleware::handle();
        // Only admins can list users
        if ($user->role !== 'admin') {
            $this->sendError('Permission denied', 403);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->query("SELECT id, username, role, branch_id, created_at FROM users ORDER BY id DESC");
        $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $this->sendJson(['users' => $users]);
    }

    public function show(): void {
        $user = AuthMiddleware::handle();
        if ($user->role !== 'admin') {
            $this->sendError('Permission denied', 403);
            return;
        }
        $id = $_GET['id'] ?? null;
        if (!$id) {
            $this->sendError('User id is required', 400);
            return;
        }
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT id, username, role, branch_id, created_at FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $u = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$u) {
            $this->sendError('User not found', 404);
            return;
        }
        $this->sendJson(['user' => $u]);
    }

    public function store(): void {
        $user = AuthMiddleware::handle();
        if ($user->role !== 'admin') {
            $this->sendError('Permission denied', 403);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $username = $data['username'] ?? null;
        $password = $data['password'] ?? null;
        $role = $data['role'] ?? 'empleado';
        $branch_id = $data['branch_id'] ?? null;

        if (!$username || !$password) {
            $this->sendError('Username and password are required', 400);
            return;
        }

        // Validate role
        $allowedRoles = ['admin','empleado','cajero','mesero','cocina'];
        if (!in_array($role, $allowedRoles)) {
            $this->sendError('Invalid role', 400);
            return;
        }

        $db = Database::getConnection();

        // validate branch if provided
        if ($branch_id) {
            $stmt = $db->prepare("SELECT id FROM branches WHERE id = ?");
            $stmt->execute([$branch_id]);
            if (!$stmt->fetch()) {
                $this->sendError('Branch not found', 400);
                return;
            }
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $db->prepare("INSERT INTO users (username, password, role, branch_id) VALUES (?, ?, ?, ?)");
        try {
            $stmt->execute([$username, $passwordHash, $role, $branch_id]);
            $id = $db->lastInsertId();
            $this->sendJson(['user' => ['id' => (int)$id, 'username' => $username, 'role' => $role, 'branch_id' => $branch_id]], 201);
        } catch (\PDOException $e) {
            $this->sendError('Error creating user: ' . $e->getMessage(), 500);
        }
    }

    public function update(): void {
        $user = AuthMiddleware::handle();
        if ($user->role !== 'admin') {
            $this->sendError('Permission denied', 403);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        $username = $data['username'] ?? null;
        $password = $data['password'] ?? null;
        $role = $data['role'] ?? null;
        $branch_id = $data['branch_id'] ?? null;

        if (!$id || !$username) {
            $this->sendError('User id and username are required', 400);
            return;
        }

        $allowedRoles = ['admin','empleado','cajero','mesero','cocina'];
        if ($role && !in_array($role, $allowedRoles)) {
            $this->sendError('Invalid role', 400);
            return;
        }

        $db = Database::getConnection();

        if ($branch_id) {
            $stmt = $db->prepare("SELECT id FROM branches WHERE id = ?");
            $stmt->execute([$branch_id]);
            if (!$stmt->fetch()) {
                $this->sendError('Branch not found', 400);
                return;
            }
        }

        $fields = [];
        $params = [];
        $fields[] = 'username = ?'; $params[] = $username;
        if ($password) { $fields[] = 'password = ?'; $params[] = password_hash($password, PASSWORD_BCRYPT); }
        if ($role) { $fields[] = 'role = ?'; $params[] = $role; }
        $fields[] = 'branch_id = ?'; $params[] = $branch_id;
        $params[] = $id;

        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        try {
            $stmt->execute($params);
            $this->sendJson(['user' => ['id' => (int)$id, 'username' => $username, 'role' => $role, 'branch_id' => $branch_id]]);
        } catch (\PDOException $e) {
            $this->sendError('Error updating user: ' . $e->getMessage(), 500);
        }
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
            $this->sendError('User id is required', 400);
            return;
        }
        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $this->sendSuccess([], 'User deleted');
    }
}
