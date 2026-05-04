<?php
$config = array(
    "digest_alg" => "sha256",
    "private_key_bits" => 2048,
    "private_key_type" => OPENSSL_KEYTYPE_RSA,
    "config" => "C:/laragon/bin/php/php-8.1.10-Win32-vs16-x64/extras/ssl/openssl.cnf" // Adjusting to a likely path
);

// Actually, let's try to find the one for 8.2
$openssl_conf = "C:/laragon/bin/php/php-8.2.12-Win32-vs16-x64/extras/ssl/openssl.cnf";
if (!file_exists($openssl_conf)) {
    // Fallback to the one we found
    $openssl_conf = "C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/extras/ssl/openssl.cnf";
}
$config["config"] = $openssl_conf;

// Create the private and public key
$res = openssl_pkey_new($config);
if (!$res) {
    die("Key generation failed: " . openssl_error_string());
}

// Extract the private key
openssl_pkey_export($res, $privKey);

// Create the CSR
$dn = array(
    "countryName" => "EC",
    "stateOrProvinceName" => "Guayas",
    "localityName" => "Guayaquil",
    "organizationName" => "Marisqueria Krustacio Kascarudo",
    "organizationalUnitName" => "POS",
    "commonName" => "Krustacio Kascarudo",
    "emailAddress" => "ventas@krustacio.com"
);

$csr = openssl_csr_new($dn, $res, array('digest_alg' => 'sha256'));
if (!$csr) {
    die("CSR generation failed: " . openssl_error_string());
}

// Generate a self-signed cert, valid for 10 years (3650 days)
$x509 = openssl_csr_sign($csr, null, $res, 3650, array('digest_alg' => 'sha256'));
if (!$x509) {
    die("Cert signing failed: " . openssl_error_string());
}

// Export cert
openssl_x509_export($x509, $certOut);

file_put_contents('c:/laragon/www/marisqueria/web/api/digital-key.pem', $privKey);
file_put_contents('c:/laragon/www/marisqueria/web/api/digital-certificate.txt', $certOut);

echo "New Keys Generated Successfully\n";
echo "Cert Subject: Krustacio Kascarudo\n";
?>
