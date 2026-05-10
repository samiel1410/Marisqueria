<?php
require __DIR__ . '/vendor/autoload.php';

use App\Infrastructure\Services\NotificationService;

// Habilitar errores
ini_set('display_errors', 1);
error_reporting(E_ALL);

$storageDir = __DIR__ . '/scratch';
$logFile = $storageDir . '/qz_debug.log';
$tokensFile = $storageDir . '/web_tokens.json';

$timestamp = date('H:i:s');
echo "--- TEST DE IMPRESIÓN FINAL ($timestamp) ---\n";

if (!file_exists($tokensFile)) {
    echo "ERROR: No hay tokens. Abre la web.\n";
    exit;
}

$tokens = json_decode(file_get_contents($tokensFile), true);
echo "Enviando a " . count($tokens) . " dispositivos...\n";

$result = NotificationService::sendToTopic('new_orders', 'TEST FINAL', "Probando impresora...", [
    'order_id' => '1', 
    'type' => 'print_kitchen_request',
    'test_time' => $timestamp
]);

echo "Resultado: " . ($result ? "ÉXITO" : "FALLÓ") . "\n";
echo "REVISA LA CONSOLA: Debe decir TIPO: print_kitchen_request y TEST TIME: $timestamp\n";
