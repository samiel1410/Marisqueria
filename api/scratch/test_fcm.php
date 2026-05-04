<?php
require_once __DIR__ . '/../vendor/autoload.php';

use App\Infrastructure\Services\NotificationService;

// Mock the environment if needed
// Actually NotificationService handles its own service account path

echo "Testing FCM notification...\n";
$success = NotificationService::sendToTopic('new_orders', 'Test Title', 'Test Body', ['type' => 'test']);

if ($success) {
    echo "SUCCESS: Notification sent.\n";
} else {
    echo "FAILURE: Notification could not be sent. Check error logs.\n";
}
