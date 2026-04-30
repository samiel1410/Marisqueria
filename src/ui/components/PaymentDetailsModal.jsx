import React, { useState, useEffect } from 'react';
import api from '../../infrastructure/api';
import { X, DollarSign, CreditCard, Banknote, Undo2, Calendar, Clock, User, Hash } from 'lucide-react';
import Modal from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { useToast } from './Toast';

const PaymentDetailsModal = ({ isOpen, onClose, orderId, onAnnulSuccess }) => {
  const { show: showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/orders/details?order_id=${orderId}`);
      setOrder(response.data);
    } catch (error) {
      showToast("Error al cargar detalles de pago", { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAnnul = async () => {
    if (!window.confirm("¿Está seguro de anular el cobro de esta orden? El estado volverá a 'entregado'.")) return;
    
    setLoading(true);
    try {
      await api.post('/orders/status', { order_id: orderId, status: 'entregado' });
      showToast("Cobro anulado correctamente", { type: 'success' });
      if (onAnnulSuccess) onAnnulSuccess();
      onClose();
    } catch (error) {
      showToast("No se pudo anular el cobro", { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title={`Detalles de Cobro - Orden #${orderId}`}>
      {loading && !order ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      ) : order ? (
        <div className="space-y-6">
          {/* Resumen General */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1">
                <Calendar size={10}/> Fecha
              </p>
              <p className="font-bold text-slate-700">{order.created_at?.split(' ')[0]}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1">
                <User size={10}/> Cliente
              </p>
              <p className="font-bold text-slate-700 truncate">{order.customer_name || 'CONSUMIDOR FINAL'}</p>
            </div>
          </div>

          {/* Desglose de Pago */}
          <div className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                <DollarSign size={16} className="text-success"/> Desglose de Pago
              </h4>
              <Badge variant="success" className="font-black uppercase tracking-widest text-[10px]">
                {order.payment_method}
              </Badge>
            </div>
            
            <div className="p-6 space-y-4">
              {order.payments && order.payments.length > 0 ? (
                order.payments.map((p, idx) => (
                  <div key={p.id} className={`flex justify-between items-center ${idx > 0 ? 'pt-4 border-t border-slate-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${p.payment_method === 'efectivo' ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 text-sky-600'}`}>
                        {p.payment_method === 'efectivo' ? <Banknote size={20}/> : <CreditCard size={20}/>}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 capitalize">{p.payment_method}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-black">
                          {p.created_at ? new Date(p.created_at).toLocaleString() : 'Recién cobrado'}
                        </p>
                        {p.bank_name && (
                          <p className="text-[10px] text-sky-600 font-bold">{p.bank_name} • {p.account_number}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-lg font-black text-slate-900">
                      ${parseFloat(p.amount).toFixed(2)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-slate-400 font-bold">No hay registros de pago</p>
              )}

              {/* Resumen de Cobro */}
              <div className="pt-4 border-t-2 border-dashed border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Subtotal Pagado</p>
                  <p className="font-black text-success">${parseFloat(order.total_paid || 0).toFixed(2)}</p>
                </div>
                
                {parseFloat(order.total) - parseFloat(order.total_paid || 0) > 0.01 && (
                  <div className="flex justify-between items-center">
                    <p className="font-black text-danger uppercase text-[10px] tracking-widest animate-pulse">Saldo por Cobrar</p>
                    <p className="font-black text-danger">${(parseFloat(order.total) - parseFloat(order.total_paid || 0)).toFixed(2)}</p>
                  </div>
                )}

                <div className="flex justify-between items-end pt-2">
                  <p className="font-black text-slate-400 uppercase text-xs tracking-widest">Total Orden</p>
                  <p className="text-3xl font-black text-slate-900">${parseFloat(order.total).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" className="flex-1 font-black uppercase text-xs" onClick={onClose}>Cerrar</Button>
            <Button 
              variant="outline" 
              className="flex-1 border-danger text-danger hover:bg-danger/10 font-black uppercase text-xs flex items-center justify-center gap-2"
              onClick={handleAnnul}
              disabled={loading}
              icon={Undo2}
            >
              Anular Cobro
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default PaymentDetailsModal;
