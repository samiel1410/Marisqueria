<?php
/**
 * Manual JWT + FCM test to bypass google-auth-library and diagnose the issue
 */

$serviceAccountPath = __DIR__ . '/../service-account.json';
$jsonContent = json_decode(file_get_contents($serviceAccountPath), true);

// Build JWT manually
$header = base64_url_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));

$now = time();
$claim = base64_url_encode(json_encode([
    'iss' => $jsonContent['client_email'],
    'sub' => $jsonContent['client_email'],
    'aud' => 'https://oauth2.googleapis.com/token',
    'iat' => $now,
    'exp' => $now + 3600,
    'scope' => 'https://www.googleapis.com/auth/cloud-platform',
]));

$privateKey = $jsonContent['private_key'];
// Normalize newlines in key
$privateKey = str_replace('\\n', "\n", $privateKey);

echo "Time: $now (" . date('Y-m-d H:i:s', $now) . " local)\n";
echo "Client email: " . $jsonContent['client_email'] . "\n\n";

$signingInput = "$header.$claim";
$signature = '';
$result = openssl_sign($signingInput, $signature, $privateKey, 'SHA256');

if (!$result) {
    echo "FAIL: openssl_sign returned false\n";
    while ($msg = openssl_error_string()) echo "OpenSSL: $msg\n";
    exit(1);
}

$jwt = "$signingInput." . base64_url_encode($signature);
echo "JWT created successfully.\n";

// Exchange JWT for access token
$ch = curl_init('https://oauth2.googleapis.com/token');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    'assertion' => $jwt,
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Token response ($httpCode):\n$response\n\n";

$tokenData = json_decode($response, true);
if (!isset($tokenData['access_token'])) {
    echo "FAILURE: Could not obtain access token.\n";
    exit(1);
}

echo "SUCCESS: Access token obtained!\n";

// Now send FCM
$accessToken = $tokenData['access_token'];
$project_id = $jsonContent['project_id'];
$url = "https://fcm.googleapis.com/v1/projects/$project_id/messages:send";

$message = [
    'message' => [
        'topic' => 'new_orders',
        'notification' => ['title' => 'Test', 'body' => 'Test FCM OK'],
        'data' => ['type' => 'test']
    ]
];

$ch2 = curl_init($url);
curl_setopt($ch2, CURLOPT_POST, true);
curl_setopt($ch2, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json'
]);
curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode($message));
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);

$fcmResponse = curl_exec($ch2);
$fcmCode = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);

echo "FCM Response ($fcmCode):\n$fcmResponse\n";

function base64_url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
