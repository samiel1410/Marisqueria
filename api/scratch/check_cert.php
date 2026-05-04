<?php
$keyPath = 'c:/laragon/www/marisqueria/web/api/digital-key.pem';
$certPath = 'c:/laragon/www/marisqueria/web/api/digital-certificate.txt';

echo "=== KEY INFO ===" . PHP_EOL;
$key = openssl_pkey_get_private(file_get_contents($keyPath));
if ($key) {
    $details = openssl_pkey_get_details($key);
    echo "Key type: " . $details['type'] . " (3=RSA)" . PHP_EOL;
    echo "Key bits: " . $details['bits'] . PHP_EOL;
} else {
    echo "INVALID KEY: " . openssl_error_string() . PHP_EOL;
}

echo PHP_EOL . "=== CERT INFO ===" . PHP_EOL;
$certContent = file_get_contents($certPath);
echo "Cert file size: " . strlen($certContent) . " bytes" . PHP_EOL;
echo "Cert first 80 chars: " . substr($certContent, 0, 80) . PHP_EOL;
$cert = openssl_x509_read($certContent);
if ($cert) {
    $info = openssl_x509_parse($cert);
    echo "Subject CN: " . ($info['subject']['CN'] ?? 'N/A') . PHP_EOL;
    echo "Valid from: " . date('Y-m-d', $info['validFrom_time_t']) . PHP_EOL;
    echo "Valid to:   " . date('Y-m-d', $info['validTo_time_t']) . PHP_EOL;
} else {
    echo "INVALID CERT: " . openssl_error_string() . PHP_EOL;
}

echo PHP_EOL . "=== KEY/CERT MATCH ===" . PHP_EOL;
$certPub = openssl_pkey_get_public($certContent);
if ($key && $certPub) {
    $keyInfo = openssl_pkey_get_details($key);
    $certInfo = openssl_pkey_get_details($certPub);
    if ($keyInfo['key'] === $certInfo['key']) {
        echo "MATCH: Key and certificate are a valid pair" . PHP_EOL;
    } else {
        echo "MISMATCH: Key and certificate do NOT match!" . PHP_EOL;
    }
} else {
    echo "Could not compare: invalid key or cert" . PHP_EOL;
}

echo PHP_EOL . "=== SIGN TEST ===" . PHP_EOL;
if ($key) {
    $sig = '';
    $result = openssl_sign("test", $sig, $key, OPENSSL_ALGO_SHA512);
    echo "SHA512 sign: " . ($result ? "OK" : "FAILED") . PHP_EOL;
    if ($result) {
        echo "Signature (base64): " . substr(base64_encode($sig), 0, 40) . "..." . PHP_EOL;
    }
}
