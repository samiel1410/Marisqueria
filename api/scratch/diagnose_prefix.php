<?php
$keyPath = 'c:/laragon/www/marisqueria/web/api/digital-key.pem';
$certPath = 'c:/laragon/www/marisqueria/web/api/digital-certificate.txt';
$privateKey = file_get_contents($keyPath);
$publicKey = file_get_contents($certPath);

$data = 'test';
openssl_sign($data, $signature, $privateKey, OPENSSL_ALGO_SHA256);

$pubKeyRes = openssl_pkey_get_public($publicKey);
openssl_public_decrypt($signature, $decrypted, $pubKeyRes);

$hex = bin2hex($decrypted);
echo "Full Decrypted (hex): $hex\n";

// The hash of 'test' in SHA256 is:
$hash = hash('sha256', $data);
echo "Hash of 'test' (hex): $hash\n";

// The prefix is everything before the hash in the decrypted block
$prefixHex = substr($hex, 0, strpos($hex, $hash));
echo "Detected Prefix (hex): $prefixHex\n";
?>
