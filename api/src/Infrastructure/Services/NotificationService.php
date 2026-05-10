<?php

namespace App\Infrastructure\Services;

use Google\Auth\Credentials\ServiceAccountCredentials;
use Google\Auth\HttpHandler\HttpHandlerFactory;

class NotificationService {
    
    public static function getStoragePath(): string {
        $path = __DIR__ . '/../../../scratch';
        if (!is_dir($path)) @mkdir($path, 0777, true);
        if (!is_writable($path)) $path = sys_get_temp_dir();
        return $path;
    }

    public static function sendToTopic(string $topic, string $title, string $body, array $data = []): bool {
        $serviceAccountPath = __DIR__ . '/../../../service-account.json';
        if (getenv('FIREBASE_CREDENTIALS')) {
            $serviceAccountPath = sys_get_temp_dir() . '/service-account.json';
            if (!file_exists($serviceAccountPath)) {
                @file_put_contents($serviceAccountPath, getenv('FIREBASE_CREDENTIALS'));
            }
        }
        if (!file_exists($serviceAccountPath)) {
            error_log("Firebase Service Account file not found at $serviceAccountPath");
            return false;
        }

        try {
            $storageDir = self::getStoragePath();
            $logFile = $storageDir . '/qz_debug.log';

            @file_put_contents($logFile, date('Y-m-d H:i:s') . " FCM: Sending notification to topic $topic\n", FILE_APPEND);
            
            // 1. Get OAuth2 Access Token
            $scopes = ['https://www.googleapis.com/auth/cloud-platform'];
            $jsonContent = json_decode(file_get_contents($serviceAccountPath), true);
            
            if (isset($jsonContent['private_key'])) {
                $jsonContent['private_key'] = str_replace("\\n", "\n", $jsonContent['private_key']);
            }
            
            $credentials = new ServiceAccountCredentials($scopes, $jsonContent);
            $tokenData = $credentials->fetchAuthToken(HttpHandlerFactory::build());
            $accessToken = $tokenData['access_token'];

            $project_id = "marisqueria-98af1";
            $url = "https://fcm.googleapis.com/v1/projects/$project_id/messages:send";

            $originHost = $_SERVER['HTTP_HOST'] ?? 'unknown';
            $data['origin_host'] = $originHost;

            // 2. Prepare Message (Topic)
            $message = [
                'message' => [
                    'topic' => $topic,
                    'data' => $data
                ]
            ];

            // 3. Send HTTP Request to Topic
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

            file_put_contents($logFile, date('Y-m-d H:i:s') . " FCM: Topic response code $httpCode\n", FILE_APPEND);

            // 4. Enviar a tokens directos (bypassing topic delay)
            $tokensFile = $storageDir . '/web_tokens.json';
            if (file_exists($tokensFile)) {
                $directTokens = json_decode(file_get_contents($tokensFile), true) ?: [];
                $sentCount = 0;
                foreach ($directTokens as $directToken) {
                    if (empty($directToken)) continue;
                    
                    $directMessage = [
                        'message' => [
                            'token' => $directToken,
                            'data' => $data
                        ]
                    ];
                    
                    $ch2 = curl_init();
                    curl_setopt($ch2, CURLOPT_URL, $url);
                    curl_setopt($ch2, CURLOPT_POST, true);
                    curl_setopt($ch2, CURLOPT_HTTPHEADER, [
                        'Authorization: Bearer ' . $accessToken,
                        'Content-Type: application/json'
                    ]);
                    curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode($directMessage));
                    curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch2, CURLOPT_TIMEOUT, 2); // Timeout corto para no bloquear
                    
                    curl_exec($ch2);
                    $dCode = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
                    curl_close($ch2);
                    
                    if ($dCode === 200) $sentCount++;
                }
                file_put_contents($logFile, date('Y-m-d H:i:s') . " FCM: Sent to $sentCount direct tokens\n", FILE_APPEND);
            }

            return $httpCode === 200;
        } catch (\Exception $e) {
            error_log("FCM Exception: " . $e->getMessage());
            return false;
        }
    }

    public static function subscribeToTopic(string $token, string $topic): bool {
        $serviceAccountPath = __DIR__ . '/../../../service-account.json';
        if (getenv('FIREBASE_CREDENTIALS')) {
            $serviceAccountPath = sys_get_temp_dir() . '/service-account.json';
            if (!file_exists($serviceAccountPath)) {
                file_put_contents($serviceAccountPath, getenv('FIREBASE_CREDENTIALS'));
            }
        }
        
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

            // Usar el endpoint de batchAdd que soporta OAuth2 correctamente
            $url = "https://iid.googleapis.com/iid/v1:batchAdd";

            $body = json_encode([
                'to' => '/topics/' . $topic,
                'registration_tokens' => [$token]
            ]);

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json',
                'access_token_auth: true'
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $storageDir = __DIR__ . '/../../../scratch';
            if (is_dir($storageDir)) {
                file_put_contents($storageDir . '/qz_debug.log', date('Y-m-d H:i:s') . " FCM Subscribe Raw Response ($httpCode): " . $response . "\n", FILE_APPEND);
            }

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
