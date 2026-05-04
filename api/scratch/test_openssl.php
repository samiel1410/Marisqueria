<?php
$serviceAccountPath = __DIR__ . '/../service-account.json';
$jsonContent = json_decode(file_get_contents($serviceAccountPath), true);
$key = $jsonContent['private_key'];

echo "Testing OpenSSL signing...\n";
$data = "test data";
$signature = '';
$res = openssl_sign($data, $signature, $key, OPENSSL_ALGO_SHA256);

if ($res) {
    echo "SUCCESS: OpenSSL signed the data.\n";
} else {
    echo "FAILURE: OpenSSL could not sign the data.\n";
    while ($msg = openssl_error_string()) {
        echo "OpenSSL Error: $msg\n";
    }
}
