<?php
$cert = file_get_contents('web/api/digital-certificate.txt');
$key = file_get_contents('web/api/digital-key.pem');

$pubKey = openssl_pkey_get_public($cert);
$privKey = openssl_pkey_get_private($key);

if (!$pubKey) {
    echo "Public key could not be extracted from certificate.\n";
    exit(1);
}

if (!$privKey) {
    echo "Private key could not be loaded.\n";
    exit(1);
}

$detailsPub = openssl_pkey_get_details($pubKey);
$detailsPriv = openssl_pkey_get_details($privKey);

if ($detailsPub['key'] === $detailsPriv['key']) {
    echo "MATCH: The private key matches the certificate.\n";
} else {
    echo "MISMATCH: The private key does NOT match the certificate.\n";
}
