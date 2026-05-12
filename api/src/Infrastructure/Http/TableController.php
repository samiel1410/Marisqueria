<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Persistence\Database;
use PDO;

class TableController {
    
    public function index(): void {
        AuthMiddleware::handle(); // Protect route
        
        $db = Database::getConnection();
        try {
            $sql = "SELECT t.*, 
                    (SELECT status FROM orders WHERE table_id = t.id AND status NOT IN ('cobrado', 'cancelado') ORDER BY created_at DESC LIMIT 1) as order_status,
                    (SELECT id FROM orders WHERE table_id = t.id AND status NOT IN ('cobrado', 'cancelado') ORDER BY created_at DESC LIMIT 1) as order_id
                    FROM restaurant_tables t
                    ORDER BY t.number ASC";
            $stmt = $db->query($sql);
            $tables = $stmt->fetchAll();
        } catch (\PDOException $e) {
            // If columns don't exist yet, fall back to basic select
            $stmt = $db->query("SELECT id, number, status FROM restaurant_tables ORDER BY number ASC");
            $rows = $stmt->fetchAll();
            $tables = array_map(function($r) {
                return array_merge($r, ['pos_x' => 0, 'pos_y' => 0, 'width' => 1, 'height' => 1, 'shape' => 'square', 'seats' => 4, 'order_status' => null]);
            }, $rows);
        }

        echo json_encode($tables);
    }
    
    public function store(): void {
        AuthMiddleware::handle(); // Protect route
        
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['number'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Table number is required']);
            return;
        }
        $posX   = $data['pos_x']  ?? 0;
        $posY   = $data['pos_y']  ?? 0;
        $width  = $data['width']  ?? 1;
        $height = $data['height'] ?? 1;
        $shape  = $data['shape']  ?? 'square';
        $seats  = $data['seats']  ?? 4;

        $db = Database::getConnection();
        $insertSql = "INSERT INTO restaurant_tables (number, status, pos_x, pos_y, width, height, shape, seats) VALUES (?, 'disponible', ?, ?, ?, ?, ?, ?)";
        try {
            $stmt = $db->prepare($insertSql);
            $stmt->execute([$data['number'], $posX, $posY, $width, $height, $shape, $seats]);
            http_response_code(201);
            echo json_encode(['message' => 'Table created', 'id' => $db->lastInsertId()]);
        } catch (\PDOException $e) {
            // If columns are missing, attempt to add them (helps when migrations haven't been applied)
            $msg = $e->getMessage();
            if (strpos($msg, 'Unknown column') !== false || $e->getCode() === '42S22') {
                try {
                    // Add missing columns one-by-one checking information_schema (safer across MySQL/MariaDB versions)
                    $checkStmt = $db->prepare("SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restaurant_tables' AND COLUMN_NAME = ?");
                    $cols = [
                        ['pos_x', "ALTER TABLE restaurant_tables ADD COLUMN pos_x INT DEFAULT 0"],
                        ['pos_y', "ALTER TABLE restaurant_tables ADD COLUMN pos_y INT DEFAULT 0"],
                        ['width', "ALTER TABLE restaurant_tables ADD COLUMN width INT DEFAULT 1"],
                        ['height', "ALTER TABLE restaurant_tables ADD COLUMN height INT DEFAULT 1"],
                    ];
                    foreach ($cols as [$col, $sql]) {
                        $checkStmt->execute([$col]);
                        $row = $checkStmt->fetch();
                        if (isset($row['c']) && intval($row['c']) === 0) {
                            $db->exec($sql);
                        }
                    }
                } catch (\PDOException $inner) {
                    http_response_code(500);
                    echo json_encode(['error' => 'Migration failed: ' . $inner->getMessage()]);
                    return;
                }

                // Retry insert once
                try {
                    $stmt = $db->prepare($insertSql);
                    $stmt->execute([$data['number'], $posX, $posY, $width, $height]);
                    http_response_code(201);
                    echo json_encode(['message' => 'Table created', 'id' => $db->lastInsertId()]);
                    return;
                } catch (\PDOException $e2) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Could not create table after migration: ' . $e2->getMessage()]);
                    return;
                }
            }

            http_response_code(400);
            echo json_encode(['error' => 'Could not create table. Maybe number already exists.']);
        }
    }

    public function delete(): void {
        AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID required']); return; }
        $db = Database::getConnection();
        $db->prepare("DELETE FROM restaurant_tables WHERE id=?")->execute([$id]);
        echo json_encode(['message' => 'Table deleted']);
    }

    public function updatePositions(): void {
        $user = AuthMiddleware::handle();
        if ($user->role !== 'admin') {
            $this->sendError('Permission denied', 403);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data) || !is_array($data['positions'])) {
            $this->sendError('Positions array is required', 400);
            return;
        }
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE restaurant_tables SET pos_x = ?, pos_y = ?, width = ?, height = ?, shape = ?, seats = ? WHERE id = ?");
        try {
            foreach ($data['positions'] as $p) {
                $stmt->execute([
                    $p['pos_x']  ?? 0,
                    $p['pos_y']  ?? 0,
                    $p['width']  ?? 1,
                    $p['height'] ?? 1,
                    $p['shape']  ?? 'square',
                    $p['seats']  ?? 4,
                    $p['id']
                ]);
            }
            $this->sendSuccess([], 'Positions updated');
        } catch (\PDOException $e) {
            $this->sendError('Error updating positions: ' . $e->getMessage(), 500);
        }
    }
}
