<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Google\Auth\Credentials\ServiceAccountCredentials;
use Google\Auth\HttpHandler\HttpHandlerFactory;

$serviceAccountPath = __DIR__ . '/../service-account.json';
$scopes = ['https://www.googleapis.com/auth/cloud-platform'];

echo "Checking service-account.json at $serviceAccountPath...\n";

try {
    $jsonContent = json_decode(file_get_contents($serviceAccountPath), true);
    
    echo "Sanitizing private key...\n";
    if (isset($jsonContent['private_key'])) {
        $jsonContent['private_key'] = str_replace("\\n", "\n", $jsonContent['private_key']);
    }

    echo "Fetching token using sanitized array...\n";
    $credentials = new ServiceAccountCredentials($scopes, $jsonContent);
    $token = $credentials->fetchAuthToken(HttpHandlerFactory::build());
    echo "SUCCESS!\n";
    print_r($token);
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
