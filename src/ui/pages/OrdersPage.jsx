import React, { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../infrastructure/api';
import { ShoppingCart, Clock, CheckCircle2, ChevronRight, Filter, Search, Printer, DollarSign, XCircle, Calendar, Monitor, Edit3, MoreHorizontal, Eye, Undo2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import DataTable from '../components/DataTable';
import { useToast, CheckoutModal, PDFModal, OrderEditModal, PaymentDetailsModal } from '../components';

const OrdersPage = () => {
  const { show: showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [editOrderId, setEditOrderId] = useState(null);
  const [viewPaymentId, setViewPaymentId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchOrders();
    
    const handleMessage = (event) => {
      const payload = event.detail;
      if (payload?.data?.type === 'print_request' && payload?.data?.order_id) {
        handlePrint(payload.data.order_id);
      }
      fetchOrders();
    };

    window.addEventListener('fcm-message', handleMessage);
    return () => window.removeEventListener('fcm-message', handleMessage);
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      showToast("Error al cargar las órdenes", { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setLoading(true);
      await api.post('/orders/status', { order_id: orderId, status: newStatus });
      showToast("Estado actualizado correctamente", { type: 'success' });
      fetchOrders();
    } catch (error) {
      showToast("No se pudo actualizar el estado", { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (orderId) => {
    setPrintOrder(orderId);
  };

  const getStatusConfig = (status) => {
    const configs = {
      'pendiente': { variant: 'warning', label: 'Pendiente', icon: Clock },
      'en cocina': { variant: 'brand', label: 'En Cocina', icon: Filter },
      'entregado': { variant: 'info', label: 'Entregado', icon: ChevronRight },
      'cobrado': { variant: 'success', label: 'Cobrado', icon: CheckCircle2 },
      'parcial': { variant: 'brand', label: 'Pago Parcial', icon: Clock },
      'cancelado': { variant: 'danger', label: 'Cancelado', icon: XCircle },
    };
    return configs[status] || { variant: 'default', label: status, icon: ShoppingCart };
  };

  const filteredOrders = Array.isArray(orders) ? orders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter;
    const matchesSearch = o.id.toString().includes(searchQuery) || 
                         (o.table_number && o.table_number.toString().includes(searchQuery)) ||
                         (o.waiter_name && o.waiter_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  }) : [];

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns = [
    {
      key: 'id',
      header: 'Orden',
      render: (o) => (
        <div className="flex flex-col">
          <span className="font-black text-primary-900">#{o.id}</span>
          <span className="text-[10px] text-primary-400 font-bold uppercase tracking-tighter">ID Registro</span>
        </div>
      )
    },
    {
      key: 'date',
      header: 'Fecha / Hora',
      render: (o) => {
        const [d, t] = o.created_at.split(' ');
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-primary-600 font-bold text-xs">
              <Calendar size={12}/> {d}
            </div>
            <div className="flex items-center gap-1 text-primary-400 font-bold text-[10px]">
              <Clock size={10}/> {t?.substring(0, 5)}
            </div>
          </div>
        );
      }
    },
    {
      key: 'table',
      header: 'Ubicación',
      render: (o) => (
        <Badge variant={o.table_number ? "default" : "secondary"} className="font-bold">
          {o.table_number ? `Mesa ${o.table_number}` : 'Para Llevar'}
        </Badge>
      )
    },
    {
      key: 'register',
      header: 'Caja',
      render: (o) => (
        <div className="flex items-center gap-1.5 text-primary-600">
          <Monitor size={14} className="text-primary-300"/>
          <span className="text-xs font-bold">{o.register_name || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'waiter',
      header: 'Mesero',
      render: (o) => <span className="text-sm font-semibold text-primary-700">{o.waiter_name}</span>
    },
    {
      key: 'total',
      header: 'Total',
      render: (o) => <span className="text-primary-900 font-black">${parseFloat(o.total).toFixed(2)}</span>
    },
    {
      key: 'total_paid',
      header: 'Pagado',
      render: (o) => <span className="text-success font-bold">${parseFloat(o.total_paid || 0).toFixed(2)}</span>
    },
    {
      key: 'balance',
      header: 'Saldo',
      render: (o) => {
        const balance = parseFloat(o.total) - parseFloat(o.total_paid || 0);
        return (
          <span className={`font-black ${balance > 0.01 ? 'text-danger animate-pulse' : 'text-slate-300'}`}>
            ${balance.toFixed(2)}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: 'Estado',
      render: (o) => {
        const config = getStatusConfig(o.status);
        const StatusIcon = config.icon;
        return (
          <Badge variant={config.variant} className="flex items-center gap-1.5 w-fit font-black uppercase text-[10px] tracking-widest px-2 py-1">
            <StatusIcon size={12} /> {config.label}
          </Badge>
        );
      }
    }
  ];

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">
      <PageHeader 
        title="Gestión de Órdenes" 
        subtitle="Monitorea y actualiza el estado de los pedidos en tiempo real"
      />

      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-primary-100 shadow-sm">
          {['all', 'pendiente', 'en cocina', 'entregado', 'cobrado'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setCurrentPage(1); }}
              className={`
                px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200
                ${filter === f 
                  ? 'bg-primary-900 text-white shadow-lg shadow-primary-900/20' 
                  : 'text-primary-400 hover:bg-primary-100/50'}
              `}
            >
              {f === 'all' ? 'Todos' : f}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por ID, Mesa o Mesero..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/50 backdrop-blur-md border border-primary-100 outline-none focus:border-brand transition-all"
          />
        </div>
      </div>

      <div className="bg-transparent">
        <DataTable
          columns={columns}
          data={paginatedOrders}
          pagination={{
            current: currentPage,
            total: filteredOrders.length,
            pageSize: pageSize,
            onChange: setCurrentPage
          }}
          className="bg-transparent"
          actions={(o) => (
            <div className="flex justify-end relative">
              <div className="flex items-center gap-1">
                {/* Acciones Rápidas */}
                {o.status === 'pendiente' && (
                  <Button variant="brand" size="sm" className="h-8 px-3 text-[10px] font-black uppercase" onClick={() => updateOrderStatus(o.id, 'en cocina')}>Cocinar</Button>
                )}
                {o.status === 'en cocina' && (
                  <Button variant="info" size="sm" className="h-8 px-3 text-[10px] font-black uppercase" onClick={() => updateOrderStatus(o.id, 'entregado')}>Entregar</Button>
                )}
                {(o.status === 'entregado' || o.status === 'parcial') && (
                  <Button variant="success" size="sm" icon={DollarSign} className="h-8 px-3 text-[10px] font-black uppercase" onClick={() => setCheckoutOrder(o)}>Cobrar</Button>
                )}
                {o.status === 'cobrado' && (
                  <Button variant="outline" size="sm" icon={Eye} className="h-8 px-3 text-[10px] font-black uppercase border-success text-success hover:bg-success/5" onClick={() => setViewPaymentId(o.id)}>Ver Cobro</Button>
                )}

                {/* Menú de Acciones */}
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === o.id ? null : o.id);
                    }}
                    className={`p-1.5 rounded-xl transition-all ${activeMenuId === o.id ? 'bg-primary-900 text-white shadow-lg' : 'text-primary-400 hover:bg-primary-100'}`}
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {activeMenuId === o.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-primary-100 z-20 py-2 animate-in slide-in-from-top-2 duration-200">
                        {['pendiente', 'en cocina', 'entregado'].includes(o.status) && (
                          <button 
                            onClick={() => { setEditOrderId(o.id); setActiveMenuId(null); }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-primary-700 hover:bg-primary-50 flex items-center gap-2"
                          >
                            <Edit3 size={14}/> Editar Orden
                          </button>
                        )}
                        
                        <button 
                          onClick={() => { handlePrint(o.id); setActiveMenuId(null); }}
                          className="w-full px-4 py-2 text-left text-xs font-bold text-primary-700 hover:bg-primary-50 flex items-center gap-2"
                        >
                          <Printer size={14}/> Imprimir Recibo
                        </button>

                        {['pendiente', 'en cocina', 'entregado'].includes(o.status) && (
                          <button 
                            onClick={() => { if(window.confirm('¿Cancelar esta orden?')) updateOrderStatus(o.id, 'cancelado'); setActiveMenuId(null); }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-danger hover:bg-danger/5 flex items-center gap-2"
                          >
                            <XCircle size={14}/> Cancelar Orden
                          </button>
                        )}

                        {o.status === 'cobrado' && (
                          <button 
                            onClick={() => { if(window.confirm('¿Anular el cobro de esta orden?')) updateOrderStatus(o.id, 'entregado'); setActiveMenuId(null); }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-danger hover:bg-danger/5 flex items-center gap-2 border-t border-slate-50 mt-1 pt-3"
                          >
                            <Undo2 size={14}/> Anular Cobro
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        />
      </div>

      <CheckoutModal 
        isOpen={!!checkoutOrder} 
        onClose={() => setCheckoutOrder(null)} 
        order={checkoutOrder} 
        onCheckoutSuccess={fetchOrders}
      />

      <PDFModal
        isOpen={!!printOrder}
        onClose={() => setPrintOrder(null)}
        title={`Orden #${printOrder}`}
        pdfUrl={`${BASE_URL}/orders/print?order_id=${printOrder}&download=1&token=${localStorage.getItem('token')}`}
      />

      <OrderEditModal
        isOpen={!!editOrderId}
        onClose={() => setEditOrderId(null)}
        orderId={editOrderId}
        onSaveSuccess={fetchOrders}
      />

      <PaymentDetailsModal
        isOpen={!!viewPaymentId}
        onClose={() => setViewPaymentId(null)}
        orderId={viewPaymentId}
        onAnnulSuccess={fetchOrders}
      />
    </div>
  );
};

export default OrdersPage;
