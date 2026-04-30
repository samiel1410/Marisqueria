<?php

namespace App\Infrastructure\Persistence;

use PDO;
use PDOException;

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $host = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? 'localhost');
            $port = getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? '3306');
            $db   = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? 'marisqueria');
            $user = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? 'root');
            $pass = getenv('DB_PASS') ?: ($_ENV['DB_PASS'] ?? '');
            $charset = 'utf8mb4';

            $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                $debugInfo = "Host: $host, DB: $db, User: $user. DSN: $dsn";
                throw new PDOException($debugInfo . " | Error: " . $e->getMessage(), (int)$e->getCode());
            }
        }

        return self::$instance;
    }
}
