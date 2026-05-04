<?php
namespace App\Infrastructure\Http;

use App\Infrastructure\Persistence\Database;
use PDO;

class PrintQueueController extends BaseController {
    
    // GET /print-queue
    public function getPending(): void {
        AuthMiddleware::handle();
        $db = Database::getConnection();
        
        $stmt = $db->query("SELECT * FROM print_queue WHERE status = 'pending' ORDER BY created_at ASC");
        $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($jobs as &$job) {
            $job['data'] = json_decode($job['data'], true);
        }
        
        $this->sendJson(['jobs' => $jobs]);
    }
    
    // POST /print-queue/status
    public function updateStatus(): void {
        AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        $status = $data['status'] ?? 'done';
        
        if (!$id) {
            $this->sendError('Job ID is required', 400);
            return;
        }
        
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE print_queue SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$status, $id]);
        
        $this->sendJson(['message' => 'Job status updated']);
    }

    public static function addJob(string $type, array $data): bool {
        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO print_queue (type, data, status) VALUES (?, ?, 'pending')");
        return $stmt->execute([$type, json_encode($data)]);
    }
}
