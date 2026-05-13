<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Services\NotificationService;

class NotificationController {
    public function subscribe(): void {
        $storageDir = NotificationService::getStoragePath();
        $logFile = $storageDir . '/qz_debug.log';
        $tokensFile = $storageDir . '/web_tokens.json';

        @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: NotificationController::subscribe called\n", FILE_APPEND);
        $data = json_decode(file_get_contents('php://input'), true);
        $token = $data['token'] ?? null;
        $topic = $data['topic'] ?? 'new_orders';

        if (!$token) {
            @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: subscribe failed - no token provided\n", FILE_APPEND);
            http_response_code(400);
            echo json_encode(['error' => 'Token is required']);
            return;
        }

        // Guardar el token en la lista de tokens activos para mensajes directos
        $tokens = [];
        if (file_exists($tokensFile)) {
            $tokens = json_decode(file_get_contents($tokensFile), true) ?: [];
        }
        if (!in_array($token, $tokens)) {
            $tokens[] = $token;
            // Mantener solo los últimos 20 tokens para evitar que el archivo crezca indefinidamente
            if (count($tokens) > 20) {
                array_shift($tokens);
            }
            @file_put_contents($tokensFile, json_encode($tokens));
        }

        @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: subscribing token " . substr($token, 0, 10) . "... to topic $topic\n", FILE_APPEND);
        $success = NotificationService::subscribeToTopic($token, $topic);

        if ($success) {
            @file_put_contents($logFile, date('Y-m-d H:i:s') . " BACKEND: token successfully subscribed to $topic\n", FILE_APPEND);
            echo json_encode(['message' => 'Subscribed successfully', 'status' => 'ok']);
        } else {
            // No devolvemos 500 para evitar errores críticos en el frontend si falla Firebase
            echo json_encode([
                'message' => 'Subscription failed but request processed',
                'status' => 'error',
                'error' => 'Could not subscribe to topic. Check server logs.'
            ]);
        }
    }
}
