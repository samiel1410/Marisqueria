<?php
// Simulate exactly what QZ Tray does:
// 1. Sends the raw message in POST body as text/plain
// 2. Expects a base64-encoded SHA512 signature in response

$message = "test-message-from-qz-tray-12345";
$keyPath = 'c:/laragon/www/marisqueria/web/api/digital-key.pem';
$certPath = 'c:/laragon/www/marisqueria/web/api/digital-certificate.txt';

// Sign
$key = file_get_contents($keyPath);
$sig = '';
openssl_sign($message, $sig, $key, OPENSSL_ALGO_SHA512);
$b64sig = base64_encode($sig);
echo "Signature: " . substr($b64sig, 0, 60) . "..." . PHP_EOL;

// Verify using the certificate (what QZ Tray does)
$pub = openssl_pkey_get_public(file_get_contents($certPath));
$verify = openssl_verify($message, $sig, $pub, OPENSSL_ALGO_SHA512);
echo "QZ Tray would verify as: " . ($verify === 1 ? "VALID ✓" : "INVALID ✗") . PHP_EOL;
