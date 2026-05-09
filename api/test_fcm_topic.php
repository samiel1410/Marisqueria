<?php
require __DIR__ . '/vendor/autoload.php';

use App\Infrastructure\Services\NotificationService;

// Habilitar errores
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "Probando envío a FCM...\n";
$result = NotificationService::sendToTopic('new_orders', 'Test Title', 'Test Body', ['type' => 'print_kitchen_request', 'order_id' => '999']);
echo "Resultado Envío: " . ($result ? "ÉXITO" : "FALLÓ") . "\n\n";

echo "Probando suscripción a FCM...\n";
$subResult = NotificationService::subscribeToTopic('test_token', 'new_orders');
echo "Resultado Suscripción: " . ($subResult ? "ÉXITO" : "FALLÓ") . "\n";
