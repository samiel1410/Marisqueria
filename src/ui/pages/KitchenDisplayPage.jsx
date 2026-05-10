import React, { useEffect, useState, useCallback } from 'react';
import api from '../../infrastructure/api';
import { requestForToken } from '../../infrastructure/firebase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Maximize2, 
  Minimize2, 
  AlertCircle,
} from 'lucide-react';

const KitchenDisplayPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fcmStatus, setFcmStatus] = useState('connecting');

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get('/orders/kitchen');
      setOrders(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Inicializar Firebase si el permiso ya fue otorgado
    if (Notification.permission === 'granted') {
      setFcmStatus('active');
      requestForToken();
    } else if (Notification.permission === 'denied') {
      setFcmStatus('denied');
    } else {
      setFcmStatus('connecting');
    }

    // Actualización en tiempo real vía FCM (sin polling)
    const handleFCMMessage = (e) => {
      console.log('%c Kitchen: REFRESH', 'background: #22c55e; color: white; font-weight: bold;', e.detail);
      setFcmStatus('active');
      fetchOrders();
    };

    const handleFCMStatus = (e) => {
      console.log('%c Kitchen: FCM STATUS', 'background: #3b82f6; color: white; font-weight: bold;', e.detail);
      setFcmStatus(e.detail);
    };

    window.addEventListener('fcm-message', handleFCMMessage);
    window.addEventListener('fcm-status', handleFCMStatus);

    return () => {
      window.removeEventListener('fcm-message', handleFCMMessage);
      window.removeEventListener('fcm-status', handleFCMStatus);
    };
  }, [fetchOrders]);

  const requestPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      window.location.reload();
    } else {
      setFcmStatus('denied');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white">
        <ChefHat className="w-24 h-24 mb-6 animate-bounce text-orange-400" />
        <h1 className="text-4xl font-black tracking-tight uppercase text-white">Sincronizando...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 font-sans overflow-x-hidden">

      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          <ChefHat className="w-10 h-10 text-orange-400" />
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase leading-none">COCINA</h1>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{orders.length} pedido{orders.length !== 1 ? 's' : ''} activo{orders.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* FCM Status */}
          <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-2xl border border-gray-800">
            <span className="relative flex h-3 w-3">
              {fcmStatus === 'active' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
                fcmStatus === 'active' ? 'bg-emerald-400' : 
                fcmStatus === 'denied' || fcmStatus === 'error' ? 'bg-red-500' : 'bg-amber-400'
              }`}></span>
            </span>
            <span className="text-sm font-black uppercase tracking-widest text-gray-300">
              {fcmStatus === 'active' ? 'EN VIVO' : 
               fcmStatus === 'denied' ? 'BLOQUEADO' : 
               fcmStatus === 'error' ? 'ERROR FCM' : 
               fcmStatus === 'error_subscription' ? 'ERROR SYNC' :
               fcmStatus === 'no_token' ? 'SIN TOKEN' : 'CONECTANDO...'}
            </span>
            {(fcmStatus === 'denied' || fcmStatus === 'connecting' || fcmStatus.includes('error') || fcmStatus === 'no_token') && (
              <button
                onClick={() => {
                  if (Notification.permission === 'default') {
                    requestPermission();
                  } else {
                    requestForToken();
                  }
                }}
                className="ml-2 text-xs font-black text-amber-400 underline uppercase"
              >
                {fcmStatus === 'active' ? '' : 'Reintentar'}
              </button>
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-3 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-2xl transition-all border border-gray-800"
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
          <CheckCircle2 className="w-32 h-32 text-emerald-500 mb-6 opacity-20" />
          <h2 className="text-4xl font-black text-gray-600 uppercase tracking-widest">Sin Pedidos Pendientes</h2>
          <p className="text-gray-700 text-xl mt-2 font-bold uppercase">¡Todo al día!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {orders.map((order) => {
            const isPending = order.status === 'pendiente';
            return (
              <div
                key={order.id}
                className={`flex flex-col rounded-3xl border-2 shadow-2xl transition-all duration-300 overflow-hidden ${
                  isPending
                    ? 'border-orange-500 bg-gray-900 shadow-orange-500/20'
                    : 'border-blue-800 bg-gray-900 shadow-blue-500/10'
                }`}
              >
                {/* Card Header */}
                <div className={`px-6 py-5 flex justify-between items-center ${
                  isPending ? 'bg-orange-500/15' : 'bg-blue-900/20'
                }`}>
                  <div className="flex flex-col gap-1">
                    {/* Order number — very large */}
                    <span className="text-6xl font-black leading-none text-white">
                      #{order.daily_number || order.id}
                    </span>
                    <span className={`text-lg font-black uppercase tracking-wider px-3 py-1 rounded-xl w-fit mt-1 ${
                      order.table_number
                        ? 'bg-blue-600 text-white'
                        : 'bg-purple-600 text-white'
                    }`}>
                      {order.table_number ? `MESA ${order.table_number}` : 'PARA LLEVAR'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-5 h-5" />
                      <span className="text-base font-bold">
                        {formatDistanceToNow(new Date(order.created_at), { locale: es, addSuffix: false }).replace('alrededor de ', '')}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 font-bold uppercase">
                      {order.waiter_name || 'Admin'}
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <div className={`py-2 text-center text-base font-black uppercase tracking-[0.3em] border-b ${
                  isPending
                    ? 'bg-orange-500 text-white border-orange-600'
                    : 'bg-blue-700 text-white border-blue-800'
                }`}>
                  {isPending ? '🔴 NUEVO PEDIDO' : '🔵 EN PREPARACIÓN'}
                </div>

                {/* Items List */}
                <div className="flex-1 p-5 space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-start border-b border-gray-800 pb-4 last:border-0 last:pb-0">
                      <div className="text-4xl font-black text-orange-400 leading-none min-w-[3rem] text-center">
                        {item.quantity}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xl font-black leading-tight text-white uppercase break-words">
                          {item.product_name}
                        </div>
                        {item.notes && (
                          <div className="mt-2 text-base font-bold text-amber-300 bg-amber-900/40 px-3 py-2 rounded-xl border border-amber-700/50 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                            <span>{item.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KitchenDisplayPage;
