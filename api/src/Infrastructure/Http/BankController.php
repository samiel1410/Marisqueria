<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Persistence\Database;
use PDO;
use Exception;

class BankController {

    public function index(): void {
        AuthMiddleware::handle();
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM bank_accounts WHERE is_active = 1 ORDER BY bank_name ASC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function store(): void {
        AuthMiddleware::handle();
        
        // Try JSON first, fallback to $_POST (FormData)
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data)) {
            $data = $_POST;
        }

        if (empty($data['bank_name']) || empty($data['account_number'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Bank name and account number required', 'received' => $data]);
            return;
        }

        $db = Database::getConnection();
        if (!empty($data['id'])) {
            $stmt = $db->prepare("UPDATE bank_accounts SET bank_name = ?, account_number = ?, account_type = ?, owner_name = ?, owner_id = ? WHERE id = ?");
            $stmt->execute([
                $data['bank_name'],
                $data['account_number'],
                $data['account_type'] ?? '',
                $data['owner_name'] ?? '',
                $data['owner_id'] ?? '',
                $data['id']
            ]);
            $id = $data['id'];
        } else {
            $stmt = $db->prepare("INSERT INTO bank_accounts (bank_name, account_number, account_type, owner_name, owner_id) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['bank_name'],
                $data['account_number'],
                $data['account_type'] ?? '',
                $data['owner_name'] ?? '',
                $data['owner_id'] ?? ''
            ]);
            $id = $db->lastInsertId();
        }

        // Handle QR Upload if present in the same request
        if (isset($_FILES['qr']) && $id) {
            $path = $this->uploadQrFile($_FILES['qr'], $id);
            if ($path) {
                $db->prepare("UPDATE bank_accounts SET qr_path = ? WHERE id = ?")->execute([$path, $id]);
            }
        }

        echo json_encode(['message' => 'Bank account saved', 'id' => $id]);
    }

    public function delete(): void {
        AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required']);
            return;
        }
        $db = Database::getConnection();
        $db->prepare("UPDATE bank_accounts SET is_active = 0 WHERE id = ?")->execute([$data['id']]);
        echo json_encode(['message' => 'Bank account deactivated']);
    }

    public function uploadQr(): void {
        AuthMiddleware::handle();
        if (!isset($_FILES['qr']) || !isset($_POST['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'QR image and account ID required']);
            return;
        }

        $id = $_POST['id'];
        $path = $this->uploadQrFile($_FILES['qr'], $id);

        if ($path) {
            $db = Database::getConnection();
            $db->prepare("UPDATE bank_accounts SET qr_path = ? WHERE id = ?")->execute([$path, $id]);
            echo json_encode(['message' => 'QR uploaded', 'path' => $path]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to process QR upload']);
        }
    }

    private function uploadQrFile(array $file, $id): ?string {
        $uploadDir = __DIR__ . "/../../../public/uploads/qrs/";
        
        // Fallback to Base64 if not writable or on Vercel
        $isVercel = strpos(__DIR__, '/var/task') !== false;
        if ($isVercel || (!is_dir($uploadDir) && !@mkdir($uploadDir, 0777, true)) || !@is_writable($uploadDir)) {
            $imageData = file_get_contents($file['tmp_name']);
            $mimeType = mime_content_type($file['tmp_name']);
            return 'data:' . $mimeType . ';base64,' . base64_encode($imageData);
        }

        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = "qr_bank_" . $id . "_" . time() . "." . $ext;
        
        if (move_uploaded_file($file['tmp_name'], $uploadDir . $fileName)) {
            return "/uploads/qrs/" . $fileName;
        }
        return null;
    }
}
