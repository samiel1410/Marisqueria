<?php
echo "VERCEL: " . ($_SERVER['VERCEL'] ?? 'not set') . "\n";
echo "VERCEL_URL: " . ($_SERVER['VERCEL_URL'] ?? 'not set') . "\n";
echo "DIR: " . __DIR__ . "\n";
