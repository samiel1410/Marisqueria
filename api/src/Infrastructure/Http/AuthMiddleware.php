<?php

namespace App\Infrastructure\Http;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class AuthMiddleware {
    public static function handle(): ?object {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $jwt = null;

        if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $jwt = $matches[1];
        } else if (isset($_GET['token'])) {
            $jwt = $_GET['token'];
        }

        if (!$jwt) {
            http_response_code(401);
            echo json_encode(['error' => 'Token not found']);
            exit;
        }
        $secretKey = $_ENV['JWT_SECRET'] ?? 'default_secret';

        try {
            $decoded = JWT::decode($jwt, new Key($secretKey, 'HS256'));
            // Ensure branch_id is present (may be null)
            return $decoded->data; // Return user data object
        } catch (Exception $e) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid or expired token']);
            exit;
        }
    }
    public static function checkRole(array $allowedRoles): object {
        $user = self::handle();
        if (!in_array($user->role, $allowedRoles)) {
            http_response_code(403);
            echo json_encode(['error' => 'Permission denied. Required roles: ' . implode(', ', $allowedRoles)]);
            exit;
        }
        return $user;
    }
}

// Polyfill for apache_request_headers if not running under Apache
if (!function_exists('apache_request_headers')) {
    function apache_request_headers() {
        $arh = array();
        $rx_http = '/\AHTTP_/';
        foreach ($_SERVER as $key => $val) {
            if (preg_match($rx_http, $key)) {
                $arh_key = preg_replace($rx_http, '', $key);
                $rx_matches = array();
                $rx_matches = explode('_', $arh_key);
                if (count($rx_matches) > 0 and strlen($arh_key) > 2) {
                    foreach ($rx_matches as $ak_key => $ak_val) $rx_matches[$ak_key] = ucfirst(strtolower($ak_val));
                    $arh_key = implode('-', $rx_matches);
                }
                $arh[$arh_key] = $val;
            }
        }
        return $arh;
    }
}
