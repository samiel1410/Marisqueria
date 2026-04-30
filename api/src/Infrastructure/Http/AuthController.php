<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Persistence\Database;
use Firebase\JWT\JWT;
use PDO;

class AuthController {

    public function me(): void {
        $user = AuthMiddleware::handle();
        echo json_encode(['user' => (array)$user]);
    }

    public function login(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['username']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Username and password required']);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$data['username']]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(401);
            $dbName = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? 'unknown');
            echo json_encode(['error' => "Usuario '{$data['username']}' no encontrado en la base de datos '$dbName'"]);
            return;
        }

        if (password_verify($data['password'], $user['password'])) {
            $key = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? 'default_secret';
            $payload = [
                'iss' => 'marisqueria-pos',
                'aud' => 'marisqueria-users',
                'iat' => time(),
                'exp' => time() + (60 * 60 * 8), // 8 hours
                'data' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'branch_id' => $user['branch_id'] ?? null
                ]
            ];

            $jwt = JWT::encode($payload, $key, 'HS256');

            echo json_encode([
                'message' => 'Login successful',
                'token' => $jwt,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'branch_id' => $user['branch_id'] ?? null
                ]
            ]);
        } else {
            http_response_code(401);
            $hashHint = substr($user['password'], 0, 10) . '...';
            echo json_encode(['error' => "Contraseña incorrecta. El hash guardado empieza por: $hashHint"]);
        }
    }
}
