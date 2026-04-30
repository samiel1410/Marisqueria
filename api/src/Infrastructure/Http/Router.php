<?php

namespace App\Infrastructure\Http;

class Router {
    private array $routes = [];

    public function add(string $method, string $path, callable|array $handler): void {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler
        ];
    }

    public function run(string $method, string $uri): void {
        $uri = rtrim($uri, '/');
        if (empty($uri)) $uri = '/';

        foreach ($this->routes as $route) {
            $routePath = rtrim($route['path'], '/');
            if (empty($routePath)) $routePath = '/';

            if ($route['method'] === $method && $routePath === $uri) {
                $handler = $route['handler'];
                if (is_callable($handler)) {
                    $handler();
                } elseif (is_array($handler)) {
                    [$controllerClass, $action] = $handler;
                    $controller = new $controllerClass();
                    $controller->$action();
                }
                return;
            }
        }

        http_response_code(404);
        echo json_encode(['error' => 'Route not found']);
    }
}
