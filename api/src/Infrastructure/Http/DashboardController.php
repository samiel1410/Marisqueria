<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Persistence\Database;
use PDO;

class DashboardController extends BaseController {
    
    public function getStats(): void {
        $user = AuthMiddleware::handle();
        $db = Database::getConnection();
        $branchFilter = '';
        $params = [];
        if (isset($user->role) && $user->role !== 'admin') {
            // Filter results to the user's branch
            $branchFilter = ' AND u.branch_id = ? ';
            $params[] = $user->branch_id ?? null;
        }
        
        // 1. Daily Sales & Trend vs Yesterday
        $sqlToday = "SELECT SUM(o.total) FROM orders o JOIN users u ON o.user_id = u.id WHERE o.payment_method IS NOT NULL AND o.status != 'cancelado' AND DATE(o.created_at) = CURDATE()" . $branchFilter;
        $stmtToday = $db->prepare($sqlToday);
        $stmtToday->execute($params);
        $dailySales = (float) $stmtToday->fetchColumn();

        $sqlYesterday = "SELECT SUM(o.total) FROM orders o JOIN users u ON o.user_id = u.id WHERE o.payment_method IS NOT NULL AND o.status != 'cancelado' AND DATE(o.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)" . $branchFilter;
        $stmtYesterday = $db->prepare($sqlYesterday);
        $stmtYesterday->execute($params);
        $yesterdaySales = (float) $stmtYesterday->fetchColumn();
        
        $salesTrend = 0;
        if ($yesterdaySales > 0) {
            $salesTrend = (($dailySales - $yesterdaySales) / $yesterdaySales) * 100;
        } elseif ($dailySales > 0) {
            $salesTrend = 100;
        }
        
        // 2. Active Orders & Trend vs Previous Hour
        $sqlNow = "SELECT COUNT(*) FROM orders o JOIN users u ON o.user_id = u.id WHERE o.status != 'cobrado'" . $branchFilter;
        $stmtNow = $db->prepare($sqlNow);
        $stmtNow->execute($params);
        $activeOrders = (int) $stmtNow->fetchColumn();

        $sqlPrevHour = "SELECT COUNT(*) FROM orders o JOIN users u ON o.user_id = u.id WHERE o.status != 'cobrado' AND o.created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)" . $branchFilter;
        $stmtPrevHour = $db->prepare($sqlPrevHour);
        $stmtPrevHour->execute($params);
        $prevHourOrders = (int) $stmtPrevHour->fetchColumn();
        
        $ordersTrend = 0;
        if ($prevHourOrders > 0) {
            $ordersTrend = (($activeOrders - $prevHourOrders) / $prevHourOrders) * 100;
        } elseif ($activeOrders > 0) {
            $ordersTrend = 100;
        }
        
        // 3. Orders in Kitchen & Trend vs Yesterday
        $sqlTodayK = "SELECT COUNT(*) FROM orders o JOIN users u ON o.user_id = u.id WHERE o.status = 'en cocina'" . $branchFilter;
        $stmtTodayK = $db->prepare($sqlTodayK);
        $stmtTodayK->execute($params);
        $kitchenOrders = (int) $stmtTodayK->fetchColumn();

        $sqlYesterdayK = "SELECT COUNT(*) FROM orders o JOIN users u ON o.user_id = u.id WHERE o.status = 'en cocina' AND DATE(o.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)" . $branchFilter;
        $stmtYesterdayK = $db->prepare($sqlYesterdayK);
        $stmtYesterdayK->execute($params);
        $yesterdayKitchen = (int) $stmtYesterdayK->fetchColumn();
        
        $kitchenTrend = 0;
        if ($yesterdayKitchen > 0) {
            $kitchenTrend = (($kitchenOrders - $yesterdayKitchen) / $yesterdayKitchen) * 100;
        } elseif ($kitchenOrders > 0) {
            $kitchenTrend = 100;
        }
        
        // 3.5. Pending Orders
        $sql = "SELECT COUNT(*) FROM orders o JOIN users u ON o.user_id = u.id WHERE o.status = 'pendiente'" . $branchFilter;
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $pendingOrders = (int) $stmt->fetchColumn();
        
        // 3.6. Occupied Tables
        $stmt = $db->query("SELECT COUNT(*) FROM restaurant_tables WHERE status = 'ocupada'");
        $occupiedTables = (int) $stmt->fetchColumn();
        
        // 4. Low Stock Products
        $stmt = $db->query("SELECT COUNT(*) FROM products WHERE stock < 10");
        $lowStock = (int) $stmt->fetchColumn();
        
        // 4.5. Out of Stock Products
        $stmt = $db->query("SELECT COUNT(*) FROM products WHERE stock <= 0");
        $outOfStock = (int) $stmt->fetchColumn();
        
        // 5. Popular Products
        $sql = "SELECT p.id, p.name, SUM(oi.quantity) as total_sold
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            JOIN users u ON o.user_id = u.id";
        if (!empty($branchFilter)) {
            $sql .= " WHERE u.branch_id = ? ";
        }
        $sql .= " GROUP BY p.id ORDER BY total_sold DESC LIMIT 5";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $popularProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 6. Recent Orders
        $sql = "SELECT o.*, t.number as table_number FROM orders o LEFT JOIN restaurant_tables t ON o.table_id = t.id JOIN users u ON o.user_id = u.id";
        if (!empty($branchFilter)) {
            $sql .= " WHERE u.branch_id = ? ";
        }
        $sql .= " ORDER BY o.created_at DESC LIMIT 5";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $recentOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->sendJson([
            'stats' => [
                'daily_sales' => $dailySales,
                'sales_trend' => round($salesTrend, 1),
                'active_orders' => $activeOrders,
                'orders_trend' => round($ordersTrend, 1),
                'kitchen_orders' => $kitchenOrders,
                'kitchen_trend' => round($kitchenTrend, 1),
                'pending_orders' => $pendingOrders,
                'occupied_tables' => $occupiedTables,
                'low_stock' => $lowStock,
                'out_of_stock' => $outOfStock
            ],
            'popular_products' => $popularProducts,
            'recent_orders' => $recentOrders
        ]);
    }
}
