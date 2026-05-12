<?php

namespace App\Infrastructure\Http;

class BaseController {
    
    protected function sendJson(array $data, int $statusCode = 200): void {
        http_response_code($statusCode);
        
        // Ensure CORS headers are set (in case they weren't set earlier)
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174', 
            'http://localhost:5175',
            'http://localhost:3000'
        ];
        
        if (in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: $origin");
        } else {
            $defaultOrigin = $_ENV['CORS_ALLOWED_ORIGIN'] ?? 'http://localhost:5173';
            header("Access-Control-Allow-Origin: $defaultOrigin");
        }
        
        header('Content-Type: application/json; charset=utf-8');
        
        echo json_encode($data);
    }
    
    protected function sendError(string $message, int $statusCode = 400, $details = null): void {
        $response = ['error' => $message];
        if ($details !== null) {
            $response['details'] = $details;
        }
        $this->sendJson($response, $statusCode);
    }
    
    protected function sendSuccess(array $data = [], string $message = 'Success'): void {
        $response = ['message' => $message];
        if (!empty($data)) {
            $response = array_merge($response, $data);
        }
        $this->sendJson($response);
    }
}
