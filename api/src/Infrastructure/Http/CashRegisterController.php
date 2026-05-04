<?php
namespace App\Infrastructure\Http;
use App\Infrastructure\Persistence\Database;
use PDO;

class CashRegisterController extends BaseController {

    // GET /cash-registers
    public function index(): void {
        AuthMiddleware::handle();
        $db = Database::getConnection();

        // Ensure table exists (migration fallback)
        $db->exec("CREATE TABLE IF NOT EXISTS cash_registers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            branch_id INT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT NULL,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $stmt = $db->query("
            SELECT cr.*,
                   b.name as branch_name,
                   (SELECT COUNT(*) FROM cash_sessions cs WHERE cs.register_id = cr.id) as total_sessions,
                   (SELECT COUNT(*) FROM cash_sessions cs WHERE cs.register_id = cr.id AND cs.status = 'open') as open_sessions,
                   (SELECT cs.id FROM cash_sessions cs WHERE cs.register_id = cr.id ORDER BY cs.opened_at DESC LIMIT 1) as last_session_id,
                   (SELECT cs.opened_at FROM cash_sessions cs WHERE cs.register_id = cr.id ORDER BY cs.opened_at DESC LIMIT 1) as last_opened_at,
                   (SELECT cs.closed_at FROM cash_sessions cs WHERE cs.register_id = cr.id ORDER BY cs.opened_at DESC LIMIT 1) as last_closed_at,
                   (SELECT cs.opening_balance FROM cash_sessions cs WHERE cs.register_id = cr.id ORDER BY cs.opened_at DESC LIMIT 1) as last_opening_balance,
                   (SELECT cs.closing_balance FROM cash_sessions cs WHERE cs.register_id = cr.id ORDER BY cs.opened_at DESC LIMIT 1) as last_closing_balance,
                   (SELECT cs.difference FROM cash_sessions cs WHERE cs.register_id = cr.id ORDER BY cs.opened_at DESC LIMIT 1) as last_difference,
                   (SELECT u.username FROM cash_sessions cs JOIN users u ON cs.user_id = u.id WHERE cs.register_id = cr.id AND cs.status = 'open' LIMIT 1) as open_by
            FROM cash_registers cr
            LEFT JOIN branches b ON cr.branch_id = b.id
            ORDER BY cr.id DESC
        ");
        $this->sendJson(['registers' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // POST /cash-registers
    public function store(): void {
        AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        
        $db = Database::getConnection();
        
        // Auto-generate name based on count
        $stmtCount = $db->query("SELECT COUNT(*) FROM cash_registers");
        $nextNum = (int)$stmtCount->fetchColumn() + 1;
        $name = "Caja " . $nextNum;

        $stmt = $db->prepare("INSERT INTO cash_registers (name, branch_id, description, status) VALUES (?,?,?,?)");
        $stmt->execute([
            $name,
            $data['branch_id'] ?? null,
            $data['description'] ?? null,
            $data['status'] ?? 'active',
        ]);
        $this->sendJson(['register' => ['id' => (int)$db->lastInsertId(), 'name' => $name]], 201);
    }

    // POST /cash-registers/update
    public function update(): void {
        AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = $data['id'] ?? null;
        $name = trim($data['name'] ?? '');
        if (!$id || !$name) { $this->sendError('ID and name required', 400); return; }

        $db = Database::getConnection();
        $db->prepare("UPDATE cash_registers SET name=?, branch_id=?, description=?, status=? WHERE id=?")
           ->execute([$name, $data['branch_id'] ?? null, $data['description'] ?? null, $data['status'] ?? 'active', $id]);
        $this->sendSuccess([], 'Register updated');
    }

    // POST /cash-registers/delete
    public function delete(): void {
        AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if (!$id) { $this->sendError('ID required', 400); return; }
        $db = Database::getConnection();
        // Check for open sessions
        $open = $db->prepare("SELECT COUNT(*) FROM cash_sessions WHERE register_id=? AND status='open'");
        $open->execute([$id]);
        if ($open->fetchColumn() > 0) {
            $this->sendError('No se puede eliminar una caja con sesión abierta', 400);
            return;
        }
        $db->prepare("DELETE FROM cash_registers WHERE id=?")->execute([$id]);
        $this->sendSuccess([], 'Register deleted');
    }

    // GET /cash-registers/sessions?register_id=X
    public function sessions(): void {
        AuthMiddleware::handle();
        $registerId = $_GET['register_id'] ?? null;
        if (!$registerId) { $this->sendError('register_id required', 400); return; }
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT cs.*, u.username
            FROM cash_sessions cs
            JOIN users u ON cs.user_id = u.id
            WHERE cs.register_id = ?
            ORDER BY cs.opened_at DESC
            LIMIT 30
        ");
        $stmt->execute([$registerId]);
        $this->sendJson(['sessions' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
}
