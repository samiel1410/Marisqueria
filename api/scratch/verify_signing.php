<?php
$msg = 'test_message';
$keyPath = 'web/api/digital-key.pem';
$privateKey = file_get_contents($keyPath);
$signature = '';

if (openssl_sign($msg, $signature, $privateKey, OPENSSL_ALGO_SHA512)) {
    echo "SUCCESS: Signature generated.\n";
    echo "Base64: " . base64_encode($signature) . "\n";
} else {
    echo "FAILURE: " . openssl_error_string() . "\n";
}
