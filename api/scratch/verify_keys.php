<?php
$cert = file_get_contents('c:/laragon/www/marisqueria/web/api/digital-certificate.txt');
$key = file_get_contents('c:/laragon/www/marisqueria/web/api/digital-key.pem');

$data = "test message";
$signature = '';
openssl_sign($data, $signature, $key, OPENSSL_ALGO_SHA512);

$pubKey = openssl_pkey_get_public($cert);
$verify = openssl_verify($data, $signature, $pubKey, OPENSSL_ALGO_SHA512);

echo "Verification result: " . ($verify === 1 ? "SUCCESS" : "FAILURE") . "\n";
if ($verify !== 1) {
    echo "Error: " . openssl_error_string() . "\n";
}
