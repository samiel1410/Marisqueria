<?php
require_once __DIR__ . '/vendor/autoload.php';
use Google\Auth\Credentials\ServiceAccountCredentials;
use Google\Auth\HttpHandler\HttpHandlerFactory;

$data = ['order_id' => '13', 'type' => 'print_kitchen_request'];
$serviceAccountPath = __DIR__ . '/service-account.json';
$scopes = ['https://www.googleapis.com/auth/cloud-platform'];
$credentials = new ServiceAccountCredentials($scopes, $serviceAccountPath);
$tokenData = $credentials->fetchAuthToken(HttpHandlerFactory::build());
$accessToken = $tokenData['access_token'];

$url = 'https://fcm.googleapis.com/v1/projects/marisqueria-98af1/messages:send';
$directToken = trim(file_get_contents(sys_get_temp_dir() . '/latest_web_token.txt'));
$directMessage = ['message' => ['token' => $directToken, 'data' => $data]];

$ch2 = curl_init();
curl_setopt($ch2, CURLOPT_URL, $url);
curl_setopt($ch2, CURLOPT_POST, true);
curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken, 'Content-Type: application/json']);
curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode($directMessage));
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
$resp = curl_exec($ch2);
echo 'Response: ' . $resp . PHP_EOL;
