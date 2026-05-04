import React, { useState, useEffect } from 'react';
import { DollarSign, Package, Users, ChefHat, Clock, ArrowUpRight, ArrowDownRight, TrendingUp, ShoppingCart, Utensils, Receipt } from 'lucide-react';
import api from '../../infrastructure/api';
import { StatCard } from '../components/StatCard';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { Card, CardHeader } from '../components/Card';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    ventas: 0,
    ventasTrend: 0,
    ordenes: 0,
    ordenesTrend: 0,
    productosBajoStock: 0,
    productosAgotados: 0,
    ordenesPendientes: 0,
    ordenesCocina: 0,
    ordenesCocinaTrend: 0,
    mesasOcupadas: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard/stats');
      const { stats: backendStats, popular_products, recent_orders } = response.data;

      setStats({
        ventas: backendStats.daily_sales || 0,
        ventasTrend: backendStats.sales_trend || 0,
        ordenes: backendStats.active_orders || 0,
        ordenesTrend: backendStats.orders_trend || 0,
        productosBajoStock: backendStats.low_stock || 0,
        productosAgotados: backendStats.out_of_stock || 0,
        ordenesPendientes: backendStats.pending_orders || 0,
        ordenesCocina: backendStats.kitchen_orders || 0,
        ordenesCocinaTrend: backendStats.kitchen_trend || 0,
        mesasOcupadas: backendStats.occupied_tables || 0,
      });

      setRecentOrders(recent_orders);
      setPopularProducts(popular_products.map(p => ({
        ...p,
        ventas: parseInt(p.total_sold),
        trend: 0 // We don't have historical product trends yet
      })));

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'pendiente': { variant: 'warning', label: 'Pendiente' },
      'en cocina': { variant: 'brand', label: 'En Cocina' },
      'entregado': { variant: 'success', label: 'Entregado' },
      'cobrado': { variant: 'default', label: 'Cobrado' },
    };
    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusIcon = (status) => {
    const icons = {
      'pendiente': Clock,
      'en cocina': ChefHat,
      'entregado': Utensils,
      'cobrado': Receipt,
    };
    return icons[status] || ShoppingCart;
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle="Bienvenido, revisa el rendimiento de tu Krustacio Kascarudo hoy"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Ventas del Día"
          value={`$${stats.ventas.toFixed(2)}`}
          icon={DollarSign}
          trend={stats.ventasTrend}
          trendLabel="vs ayer"
          color="success"
          loading={loading}
        />
        <StatCard
          title="Órdenes Activas"
          value={stats.ordenes}
          icon={ShoppingCart}
          trend={stats.ordenesTrend}
          trendLabel="vs hora anterior"
          color="brand"
          loading={loading}
        />
        <StatCard
          title="En Cocina"
          value={stats.ordenesCocina}
          icon={ChefHat}
          trend={stats.ordenesCocinaTrend}
          trendLabel="vs ayer"
          color="warning"
          loading={loading}
        />
        <StatCard
          title="Stock Bajo"
          value={stats.productosBajoStock + stats.productosAgotados}
          icon={Package}
          trend={0}
          trendLabel="requiere atención"
          color="danger"
          loading={loading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Órdenes Recientes"
              subtitle="Últimos pedidos registrados"
              icon={ShoppingCart}
            />
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-primary-50 animate-pulse">
                    <div className="w-12 h-12 rounded-xl bg-primary-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 bg-primary-200 rounded" />
                      <div className="h-3 w-1/4 bg-primary-200 rounded" />
                    </div>
                  </div>
                ))
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-8 text-primary-500">
                  <p>No hay órdenes registradas hoy</p>
                </div>
              ) : (
                recentOrders.map((order, index) => {
                  const StatusIcon = getStatusIcon(order.status);
                  return (
                    <div
                      key={order.id || index}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-primary-50/50 hover:bg-primary-100/50 transition-colors duration-200 animate-fade-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className={`
                        p-3 rounded-xl
                        ${order.status === 'cobrado' ? 'bg-green-100 text-green-600' :
                          order.status === 'en cocina' ? 'bg-brand/10 text-brand' :
                          order.status === 'entregado' ? 'bg-blue-100 text-blue-600' :
                          'bg-amber-100 text-amber-600'}
                      `}>
                        <StatusIcon size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary-900">
                            Orden #{order.id}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-primary-500 mt-0.5">
                          Mesa {order.table_id || 'N/A'} • {new Date(order.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary-900">
                          ${parseFloat(order.total || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-primary-500">
                          {order.payment_method || 'Pendiente'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Popular Products */}
          <Card>
            <CardHeader
              title="Productos Populares"
              subtitle="Más vendidos hoy"
              icon={TrendingUp}
            />
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-primary-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 bg-primary-200 rounded" />
                      <div className="h-2 w-1/2 bg-primary-200 rounded" />
                    </div>
                  </div>
                ))
              ) : (
                popularProducts.map((product, index) => (
                  <div
                    key={product.id || index}
                    className="flex items-center gap-3 animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
                      ${index === 0 ? 'bg-amber-100 text-amber-600' :
                        index === 1 ? 'bg-slate-200 text-slate-600' :
                        index === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-primary-100 text-primary-600'}
                    `}>
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-primary-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-primary-500">
                        {product.ventas} vendidos
                      </p>
                    </div>
                    {product.trend > 0 && (
                      <div className="flex items-center gap-1 text-green-500 text-sm font-semibold">
                        <ArrowUpRight size={16} />
                        {product.trend}%
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader
              title="Resumen Rápido"
              subtitle="Estado actual"
              icon={Clock}
            />
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary-50">
                <span className="text-primary-600 font-medium">Pendientes</span>
                <Badge variant="warning">{stats.ordenesPendientes}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary-50">
                <span className="text-primary-600 font-medium">En Cocina</span>
                <Badge variant="brand">{stats.ordenesCocina}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary-50">
                <span className="text-primary-600 font-medium">Productos Agotados</span>
                <Badge variant="danger">{stats.productosAgotados}</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
