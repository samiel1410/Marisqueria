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
            $credentials = new ServiceAccountCredentials($scopes, $serviceAccountPath);
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
        if (!file_exists($serviceAccountPath)) return false;

        try {
            $scopes = ['https://www.googleapis.com/auth/cloud-platform'];
            $credentials = new ServiceAccountCredentials($scopes, $serviceAccountPath);
            $tokenData = $credentials->fetchAuthToken(HttpHandlerFactory::build());
            $accessToken = $tokenData['access_token'];

            $url = "https://iid.googleapis.com/iid/v1:batchAdd";
            $data = [
                'to' => "/topics/$topic",
                'registration_tokens' => [$token]
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json',
                'access_token_auth: true'
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return $httpCode === 200;
        } catch (\Exception $e) {
            error_log("FCM Subscribe Exception: " . $e->getMessage());
            return false;
        }
    }
}
