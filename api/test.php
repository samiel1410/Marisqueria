<?php
require __DIR__ . '/vendor/autoload.php';

use App\Infrastructure\Services\NotificationService;

// Habilitar errores
ini_set('display_errors', 1);
error_reporting(E_ALL);

$storageDir = __DIR__ . '/scratch';
$logFile = $storageDir . '/qz_debug.log';
$tokensFile = $storageDir . '/web_tokens.json';

echo "--- DIAGNÓSTICO FCM ---\n";
echo "Storage Dir: $storageDir\n";
echo "Log File exists: " . (file_exists($logFile) ? 'SI' : 'NO') . "\n";
echo "Tokens File exists: " . (file_exists($tokensFile) ? 'SI' : 'NO') . "\n";

if (file_exists($tokensFile)) {
    $tokens = json_decode(file_get_contents($tokensFile), true);
    echo "Tokens registrados: " . count($tokens) . "\n";
}

echo "\n1. Probando SUSCRIPCIÓN...\n";
$dummyToken = "f9LLYJR_gLhCmM3qc104jX:APA91bFr20VfROml6Ff09gCbjhVFKyCD3vePYfeoG7nA_-F7Lxmc2ppVel_KEstBfyaiiDgaPr1LYp5kf5k9G6S1-BbWl3qwnlXHhK8TYHz8p2_-vgSNpME";
$subResult = NotificationService::subscribeToTopic($dummyToken, 'new_orders');
echo "Resultado Suscripción: " . ($subResult ? "ÉXITO" : "FALLÓ") . "\n";

echo "\n2. Probando ENVÍO (Topic + Direct)...\n";
$result = NotificationService::sendToTopic('new_orders', 'Test Title', 'Test Body', ['type' => 'refresh', 'order_id' => '0']);
echo "Resultado Envío: " . ($result ? "ÉXITO" : "FALLÓ") . "\n";

echo "\n--- ÚLTIMOS LOGS ---\n";
if (file_exists($logFile)) {
    $logs = file($logFile);
    $lastLogs = array_slice($logs, -5);
    foreach ($lastLogs as $line)
        echo $line;
}
