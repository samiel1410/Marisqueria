<?php
// CORS Headers
$allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
header("Access-Control-Allow-Origin: " . (in_array($origin, $allowedOrigins) ? $origin : "*"));
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");
header("Access-Control-Allow-Credentials: false");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';
use Dotenv\Dotenv;
use App\Infrastructure\Http\Router;

if (file_exists(__DIR__ . '/../../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/../../');
    $dotenv->load();
}

header('Content-Type: application/json; charset=utf-8');

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (strpos($uri, '/public') !== false) {
    $uri = substr($uri, strpos($uri, '/public') + 7);
} else if (strpos($uri, '/api') !== false) {
    $uri = substr($uri, strpos($uri, '/api') + 4);
}
if (empty($uri))
    $uri = '/';
if ($uri[0] !== '/')
    $uri = '/' . $uri;

$router = new Router();

$router->add('GET', '/', function () {
    echo json_encode(['message' => 'API is running']); });

// Auth
$router->add('POST', '/login', [\App\Infrastructure\Http\AuthController::class, 'login']);
$router->add('GET', '/me', [\App\Infrastructure\Http\AuthController::class, 'me']);

// Categories
$router->add('GET', '/categories', [\App\Infrastructure\Http\CategoryController::class, 'index']);
$router->add('POST', '/categories', [\App\Infrastructure\Http\CategoryController::class, 'store']);
$router->add('POST', '/categories/update', [\App\Infrastructure\Http\CategoryController::class, 'update']);
$router->add('POST', '/categories/delete', [\App\Infrastructure\Http\CategoryController::class, 'delete']);

// Products
$router->add('GET', '/products', [\App\Infrastructure\Http\ProductController::class, 'index']);
$router->add('POST', '/products', [\App\Infrastructure\Http\ProductController::class, 'store']);
$router->add('POST', '/products/update', [\App\Infrastructure\Http\ProductController::class, 'update']);
$router->add('POST', '/products/delete', [\App\Infrastructure\Http\ProductController::class, 'delete']);

// Brands
$router->add('GET', '/brands', [\App\Infrastructure\Http\BrandController::class, 'index']);
$router->add('POST', '/brands', [\App\Infrastructure\Http\BrandController::class, 'store']);
$router->add('POST', '/brands/update', [\App\Infrastructure\Http\BrandController::class, 'update']);
$router->add('POST', '/brands/delete', [\App\Infrastructure\Http\BrandController::class, 'delete']);

// Inventory
$router->add('GET', '/inventory', [\App\Infrastructure\Http\ProductController::class, 'index']);
$router->add('GET', '/inventory/movements', [\App\Infrastructure\Http\InventoryController::class, 'movements']);
$router->add('POST', '/inventory/movement', [\App\Infrastructure\Http\InventoryController::class, 'addMovement']);
$router->add('GET', '/inventory/branch-stock', [\App\Infrastructure\Http\InventoryController::class, 'branchStock']);

// Tables
$router->add('GET', '/tables', [\App\Infrastructure\Http\TableController::class, 'index']);
$router->add('POST', '/tables', [\App\Infrastructure\Http\TableController::class, 'store']);
$router->add('POST', '/tables/delete', [\App\Infrastructure\Http\TableController::class, 'delete']);
$router->add('POST', '/tables/update', [\App\Infrastructure\Http\TableController::class, 'updatePositions']);

// Cash Registers
$router->add('GET', '/cash-registers', [\App\Infrastructure\Http\CashRegisterController::class, 'index']);
$router->add('POST', '/cash-registers', [\App\Infrastructure\Http\CashRegisterController::class, 'store']);
$router->add('POST', '/cash-registers/update', [\App\Infrastructure\Http\CashRegisterController::class, 'update']);
$router->add('POST', '/cash-registers/delete', [\App\Infrastructure\Http\CashRegisterController::class, 'delete']);
$router->add('GET', '/cash-registers/sessions', [\App\Infrastructure\Http\CashRegisterController::class, 'sessions']);

// Cash
$router->add('GET', '/cash/status', [\App\Infrastructure\Http\CashController::class, 'getCurrentStatus']);
$router->add('GET', '/cash/sessions', [\App\Infrastructure\Http\CashController::class, 'sessions']);
$router->add('GET', '/cash/history', [\App\Infrastructure\Http\CashController::class, 'history']);
$router->add('GET', '/cash/movements', [\App\Infrastructure\Http\CashController::class, 'movements']);
$router->add('POST', '/cash/open', [\App\Infrastructure\Http\CashController::class, 'openSession']);
$router->add('POST', '/cash/close', [\App\Infrastructure\Http\CashController::class, 'closeSession']);
$router->add('POST', '/cash/movement', [\App\Infrastructure\Http\CashController::class, 'addMovement']);
$router->add('POST', '/cash/movement/delete', [\App\Infrastructure\Http\CashController::class, 'deleteMovement']);
$router->add('POST', '/cash/update-breakdown', [\App\Infrastructure\Http\CashController::class, 'updateBreakdowns']);
$router->add('GET', '/cash/session-details', [\App\Infrastructure\Http\CashController::class, 'sessionDetails']);
$router->add('GET', '/cash/session-print', [\App\Infrastructure\Http\CashController::class, 'sessionPrintData']);

// Branches & Users
$router->add('GET', '/branches', [\App\Infrastructure\Http\BranchController::class, 'index']);
$router->add('POST', '/branches', [\App\Infrastructure\Http\BranchController::class, 'store']);
$router->add('POST', '/branches/update', [\App\Infrastructure\Http\BranchController::class, 'update']);
$router->add('POST', '/branches/delete', [\App\Infrastructure\Http\BranchController::class, 'delete']);

$router->add('GET', '/users', [\App\Infrastructure\Http\UserController::class, 'index']);
$router->add('POST', '/users', [\App\Infrastructure\Http\UserController::class, 'store']);
$router->add('POST', '/users/update', [\App\Infrastructure\Http\UserController::class, 'update']);
$router->add('POST', '/users/delete', [\App\Infrastructure\Http\UserController::class, 'delete']);

// Customers & Banks
$router->add('GET', '/customers/lookup', [\App\Infrastructure\Http\CustomerController::class, 'lookup']);
$router->add('POST', '/customers', [\App\Infrastructure\Http\CustomerController::class, 'store']);
$router->add('GET', '/banks', [\App\Infrastructure\Http\BankController::class, 'index']);
$router->add('POST', '/banks', [\App\Infrastructure\Http\BankController::class, 'store']);
$router->add('POST', '/banks/delete', [\App\Infrastructure\Http\BankController::class, 'delete']);
$router->add('POST', '/banks/upload-qr', [\App\Infrastructure\Http\BankController::class, 'uploadQr']);

// Product Schedules
$router->add('GET', '/product-schedules', [\App\Infrastructure\Http\ProductScheduleController::class, 'index']);
$router->add('POST', '/product-schedules', [\App\Infrastructure\Http\ProductScheduleController::class, 'save']);

// Orders
$router->add('GET', '/orders', [\App\Infrastructure\Http\OrderController::class, 'index']);
$router->add('GET', '/orders/active', [\App\Infrastructure\Http\OrderController::class, 'getActiveOrders']);
$router->add('GET', '/orders/table', [\App\Infrastructure\Http\OrderController::class, 'getByTable']);
$router->add('GET', '/orders/details', [\App\Infrastructure\Http\OrderController::class, 'getDetails']);
$router->add('GET', '/orders/print', [\App\Infrastructure\Http\OrderController::class, 'getPrintData']);
$router->add('GET', '/orders/reprint', [\App\Infrastructure\Http\OrderController::class, 'requestRemotePrint']);
$router->add('POST', '/orders', [\App\Infrastructure\Http\OrderController::class, 'store']);
$router->add('POST', '/orders/status', [\App\Infrastructure\Http\OrderController::class, 'updateStatus']);
$router->add('POST', '/orders/update', [\App\Infrastructure\Http\OrderController::class, 'update']);

// Dashboard
$router->add('GET', '/dashboard/stats', [\App\Infrastructure\Http\DashboardController::class, 'getStats']);

// Notifications
$router->add('POST', '/notifications/subscribe', [\App\Infrastructure\Http\NotificationController::class, 'subscribe']);

// Weekly Planning
// Temporary reset route
$router->add('GET', '/reset-admin', function() {
    $db = \App\Infrastructure\Persistence\Database::getConnection();
    $newPassword = password_hash('admin123', PASSWORD_BCRYPT);
    $stmt = $db->prepare("UPDATE users SET password = ? WHERE username = 'admin'");
    $stmt->execute([$newPassword]);
    echo json_encode(['message' => 'Contraseña de admin actualizada a: admin123']);
});

$router->run($method, $uri);
