<?php

namespace App\Infrastructure\Services;

use Google\Auth\Credentials\ServiceAccountCredentials;
use Google\Auth\HttpHandler\HttpHandlerFactory;

class NotificationService {
    
    public static function sendToTopic(string $topic, string $title, string $body, array $data = []): bool {
        $serviceAccountPath = __DIR__ . '/../../../service-account.json';
        if (!file_exists($serviceAccountPath)) {
            error_log("Firebase Service Account file not found at $serviceAccountPath");
            return false;
        }

        try {
            error_log("FCM: Sending notification to topic $topic");
            // 1. Get OAuth2 Access Token
            $scopes = ['https://www.googleapis.com/auth/cloud-platform'];
            $jsonContent = json_decode(file_get_contents($serviceAccountPath), true);
            
            // Asegurar que la clave privada tenga el formato correcto
            if (isset($jsonContent['private_key'])) {
                $jsonContent['private_key'] = str_replace("\\n", "\n", $jsonContent['private_key']);
            }
            
            $credentials = new ServiceAccountCredentials($scopes, $jsonContent);
            $token = $credentials->fetchAuthToken(HttpHandlerFactory::build());
            $accessToken = $token['access_token'];

            $project_id = "marisqueria-98af1";
            $url = "https://fcm.googleapis.com/v1/projects/$project_id/messages:send";

            // 2. Prepare Message
            $message = [
                'message' => [
                    'topic' => $topic,
                    'notification' => [
                        'title' => $title,
                        'body' => $body
                    ],
                    'data' => $data
                ]
            ];

            // 3. Send HTTP Request
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            error_log("FCM: Response code $httpCode, response: $response");

            if ($httpCode !== 200) {
                error_log("FCM error response: " . $response);
                return false;
            }

            return true;
        } catch (\Exception $e) {
            error_log("FCM Exception: " . $e->getMessage());
            return false;
        }
    }

    public static function subscribeToTopic(string $token, string $topic): bool {
        $serviceAccountPath = __DIR__ . '/../../../service-account.json';
        
        if (!file_exists($serviceAccountPath)) {
            error_log("CRITICAL: Firebase service-account.json MISSING at $serviceAccountPath. Notifications will not work.");
            return false;
        }

        try {
            $scopes = ['https://www.googleapis.com/auth/cloud-platform'];
            $credentials = new ServiceAccountCredentials($scopes, $serviceAccountPath);
            $tokenData = $credentials->fetchAuthToken(HttpHandlerFactory::build());
            
            if (!isset($tokenData['access_token'])) {
                error_log("FCM Subscribe Error: Could not fetch access token. Check service-account.json permissions.");
                return false;
            }
            
            $accessToken = $tokenData['access_token'];

            // Usar el endpoint individual que suele ser más estable con OAuth2
            $url = "https://iid.googleapis.com/iid/v1/$token/rel/topics/$topic";

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json',
                'Content-Length: 0'
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                error_log("FCM Subscribe Error ($topic): Response code $httpCode, response: $response");
            }

            return $httpCode === 200;
        } catch (\Exception $e) {
            error_log("FCM Subscribe Exception: " . $e->getMessage());
            return false;
        }
    }
}
