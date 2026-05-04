<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Services\NotificationService;

class NotificationController {
    
    public function subscribe(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        $token = $data['token'] ?? null;
        $topic = $data['topic'] ?? 'new_orders';

        if (!$token) {
            http_response_code(400);
            echo json_encode(['error' => 'Token is required']);
            return;
        }

        $success = NotificationService::subscribeToTopic($token, $topic);

        if ($success) {
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
