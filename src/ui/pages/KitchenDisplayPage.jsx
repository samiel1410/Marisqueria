import React, { useEffect, useState, useCallback } from 'react';
import api from '../../infrastructure/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Maximize2, 
  Minimize2, 
  AlertCircle,
  Play,
  ClipboardList
} from 'lucide-react';

const KitchenDisplayPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fcmStatus, setFcmStatus] = useState('connecting'); // 'active', 'error', 'denied'

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get('/orders/kitchen');
      const newOrders = response.data;
      setOrders(newOrders);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    
    // Check Notification Permission
    if (Notification.permission === 'granted') {
      setFcmStatus('active');
    } else if (Notification.permission === 'denied') {
      setFcmStatus('denied');
    } else {
      setFcmStatus('connecting');
    }

    // Safeguard Polling (Slow: 60s)
    const interval = setInterval(fetchOrders, 60000);

    // Real-time refresh exclusively via FCM + Local Fallback
    const handleFCMMessage = (e) => {
      console.log('%c Kitchen Monitor: REFRESH TRIGGERED', 'background: #22c55e; color: white; font-weight: bold;', e.detail);
      // If it's a local update, we confirm it
      if (e.detail?.data?.type === 'local_order_update') {
        console.log('Local tab update detected! Synchronizing...');
      }
      setFcmStatus('active');
      fetchOrders();
    };

    window.addEventListener('fcm-message', handleFCMMessage);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('fcm-message', handleFCMMessage);
    };
  }, [fetchOrders]);

  const requestPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      window.location.reload(); // Refresh to re-init firebase
    } else {
      setFcmStatus('denied');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900">
        <ChefHat className="w-16 h-16 mb-4 animate-bounce text-blue-600" />
        <h1 className="text-2xl font-bold tracking-tight uppercase">Sincronizando...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-3 font-sans overflow-x-hidden">
      {/* Floating Info Bar */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-4 bg-white/95 backdrop-blur shadow-xl border border-slate-200 px-5 py-3 rounded-2xl">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`flex h-2 w-2 relative`}>
              {fcmStatus === 'active' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                fcmStatus === 'active' ? 'bg-emerald-500' : fcmStatus === 'denied' ? 'bg-red-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {fcmStatus === 'active' ? 'EN VIVO' : fcmStatus === 'denied' ? 'NOTIF. BLOQUEADAS' : 'CONECTANDO...'}
            </span>
          </div>
          {fcmStatus === 'denied' && (
            <button onClick={requestPermission} className="text-[9px] font-bold text-blue-600 underline text-left">Habilitar Alertas</button>
          )}
        </div>
        
        <div className="w-px h-6 bg-slate-200 mx-1"></div>
        
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{orders.length} PEDIDOS</span>
        </div>

        <button 
          onClick={toggleFullscreen}
          className="p-2.5 hover:bg-slate-100 text-slate-600 rounded-xl transition-all active:scale-90 border border-slate-100"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Orders Grid - Higher Density */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 animate-in fade-in duration-500">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 opacity-20" />
          <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Sin Pedidos Pendientes</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className={`flex flex-col rounded-2xl bg-white border-2 shadow-sm transition-all duration-300 ${
                order.status === 'pendiente' 
                  ? 'border-amber-400 ring-2 ring-amber-400/10' 
                  : 'border-slate-200'
              }`}
            >
              {/* Card Header - Compact */}
              <div className={`px-4 py-3 border-b flex justify-between items-center ${
                order.status === 'pendiente' ? 'bg-amber-50' : 'bg-slate-50'
              }`}>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-slate-900 leading-none mb-1">
                    #{order.daily_number || order.id}
                  </span>
                  <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                    order.table_number ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {order.table_number ? `MESA ${order.table_number}` : 'PARA LLEVAR'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase">
                    <Clock className="w-3 h-3" />
                    <span>{formatDistanceToNow(new Date(order.created_at), { locale: es, addSuffix: false }).replace('alrededor de ', '')}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[60px]">
                    {order.waiter_name || 'Admin'}
                  </span>
                </div>
              </div>

              {/* Items List - High Density */}
              <div className="flex-1 p-4 space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start border-b border-slate-50 pb-2 last:border-0">
                    <div className="text-lg font-black text-blue-600 leading-none pt-0.5">
                      {item.quantity}x
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold leading-tight text-slate-800 uppercase break-words">
                        {item.product_name}
                      </div>
                      {item.notes && (
                        <div className="mt-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{item.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Footer - Visual status only */}
              <div className={`px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-center border-t ${
                order.status === 'pendiente' ? 'text-amber-600 bg-amber-50/50' : 'text-blue-500 bg-blue-50/30'
              }`}>
                {order.status === 'pendiente' ? 'NUEVO' : 'PREPARANDO'}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        body {
          background: #f1f5f9;
        }
      `}</style>
    </div>
  );
};

export default KitchenDisplayPage;
