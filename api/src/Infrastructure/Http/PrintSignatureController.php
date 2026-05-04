<?php

namespace App\Infrastructure\Http;

class PrintSignatureController {
    
    /**
     * Handles QZ Tray signature requests.
     * This allows "Silent Printing" without confirmation dialogs.
     * Requires a private key (digital-key.pem) to sign the message.
     */
    public function sign(): void {
        // Clear any previous output to ensure a clean signature
        if (ob_get_length()) ob_clean();
        
        $message = trim(file_get_contents('php://input'));
        if (empty($message)) {
            $message = isset($_GET['request']) ? trim($_GET['request']) : null;
        }

        if (empty($message)) {
            http_response_code(400);
            echo "Message to sign is required";
            exit;
        }

        $keyPath = __DIR__ . '/../../../digital-key.pem';
        $privateKey = file_get_contents($keyPath);
        $signature = '';
        
        // Use SHA1 for maximum compatibility with QZ Tray on Windows/Java
        if (openssl_sign($message, $signature, $privateKey, OPENSSL_ALGO_SHA1)) {
            header('Content-Type: text/plain');
            echo base64_encode($signature);
            exit;
        } else {
            http_response_code(500);
            echo "Signing failed: " . openssl_error_string();
            exit;
        }
    }

    /**
     * Returns the public certificate for QZ Tray.
     */
    public function certificate(): void {
        $certPath = __DIR__ . '/../../../digital-certificate.txt';
        if (file_exists($certPath)) {
            header('Content-Type: text/plain');
            echo file_get_contents($certPath);
        } else {
            http_response_code(404);
            echo "Certificate not found";
        }
    }
}
