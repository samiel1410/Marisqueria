import React, { useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';
import api from '../../../infrastructure/api';
import { Button } from '../../components/Button';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertModal } from '../../components/AlertModal';
import { BILLS, COINS, DENOM_VALUE } from './constants';

export default function CloseCashForm({ register, expectedTotal, onClose, onClosed }) {
  const initQty = () => { const o = {}; [...BILLS, ...COINS].forEach(d => { o[d] = ''; }); return o; };
  const [qty, setQty]       = useState(initQty);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [alertConfig, setAlertConfig] = useState(null);

  const total = [...BILLS, ...COINS].reduce((s, d) => s + DENOM_VALUE(d) * (parseFloat(qty[d]) || 0), 0);
  const setQ  = (d, v) => setQty(q => ({ ...q, [d]: v }));

  const difference = total - expectedTotal;

  const requestSubmit = () => {
    if (saving) return;
    setError('');
    
    if (Math.abs(difference) > 0) {
      const msg = difference > 0 
        ? `Hay un SOBRANTE de $${difference.toFixed(2)}.\n\n¿Estás seguro que deseas cerrar la caja con estos valores?`
        : `Hay un FALTANTE de $${Math.abs(difference).toFixed(2)}.\n\n¿Estás seguro que deseas cerrar la caja con estos valores?`;
      setConfirmConfig({
        title: difference > 0 ? 'Sobrante de Caja Registrado' : 'Faltante de Caja Detectado',
        message: msg,
        variant: difference > 0 ? 'brand' : 'danger',
        onConfirm: doSubmit
      });
    } else {
      setConfirmConfig({
        title: 'Confirmar Cierre',
        message: `El cuadre es perfecto.\n\n¿Confirmar cierre de caja con $${total.toFixed(2)}?`,
        variant: 'brand',
        onConfirm: doSubmit
      });
    }
  };

  const doSubmit = async () => {
    setSaving(true);
    try {
      const breakdown = {};
      [...BILLS, ...COINS].forEach(d => { if (parseFloat(qty[d]) > 0) breakdown[d] = parseInt(qty[d]); });
      
      const res = await api.post('/cash/close', {
        closing_balance: total,
        closing_breakdown: breakdown,
      });
      
      const s = res.data.summary;
      setAlertConfig({
        title: 'Caja Cerrada Exitosamente',
        message: `Total Esperado: $${parseFloat(s.expected_balance).toFixed(2)}\nTotal Real: $${parseFloat(s.closing_balance).toFixed(2)}\nDiferencia: $${parseFloat(s.difference).toFixed(2)}`,
        variant: 'success',
        onClose: () => {
          setAlertConfig(null);
          onClosed();
        }
      });
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al cerrar la caja';
      setError(msg);
    }
    finally { setSaving(false); }
  };

  const billsTotal = BILLS.reduce((s, d) => s + DENOM_VALUE(d) * (parseFloat(qty[d]) || 0), 0);
  const coinsTotal = COINS.reduce((s, d) => s + DENOM_VALUE(d) * (parseFloat(qty[d]) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col my-auto overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-red-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl"><Lock size={24}/></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Cierre de Caja — {register.name}</h2>
              <p className="text-slate-500 text-sm font-medium mt-0.5">Ingresa el efectivo real que tienes en el cajón.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shadow-sm">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col lg:flex-row gap-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="flex-1 space-y-6 lg:border-r border-slate-100 lg:pr-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Billetes</p>
                <div className="space-y-3 flex-1">
                  {BILLS.map(d => (
                    <div key={d} className="flex items-center gap-2">
                      <span className="w-14 text-right text-sm font-bold text-slate-700">${d}.00</span>
                      <span className="text-slate-300 text-xs">×</span>
                      <input
                        type="number" min="0" value={qty[d]} placeholder="0"
                        onChange={e => setQ(d, e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 text-center text-sm outline-none focus:border-brand bg-white transition-all"
                      />
                      <span className="w-16 text-right text-sm font-bold text-slate-600">
                        ${(DENOM_VALUE(d) * (parseFloat(qty[d]) || 0)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-sm font-bold">
                  <span className="text-slate-500">Subtotal billetes</span>
                  <span className="text-slate-800">${billsTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Monedas</p>
                <div className="space-y-3 flex-1">
                  {COINS.map(d => (
                    <div key={d} className="flex items-center gap-2">
                      <span className="w-14 text-right text-sm font-bold text-slate-700">${parseFloat(d).toFixed(2)}</span>
                      <span className="text-slate-300 text-xs">×</span>
                      <input
                        type="number" min="0" value={qty[d]} placeholder="0"
                        onChange={e => setQ(d, e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 text-center text-sm outline-none focus:border-brand bg-white transition-all"
                      />
                      <span className="w-16 text-right text-sm font-bold text-slate-600">
                        ${(DENOM_VALUE(d) * (parseFloat(qty[d]) || 0)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-sm font-bold">
                  <span className="text-slate-500">Subtotal monedas</span>
                  <span className="text-slate-800">${coinsTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-80 flex flex-col gap-4">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Esperado</p>
                <p className="text-2xl font-bold text-slate-800">${expectedTotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Efectivo Ingresado</p>
                <p className="text-4xl font-bold text-brand">${total.toFixed(2)}</p>
              </div>
              <div className={`pt-4 border-t border-slate-200 ${Math.abs(difference) < 0.01 ? 'text-green-600' : difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                <p className="text-xs font-bold uppercase tracking-wider mb-0.5">{Math.abs(difference) < 0.01 ? 'Cuadre Perfecto' : difference > 0 ? 'Sobrante' : 'Faltante'}</p>
                <p className="text-2xl font-bold">${Math.abs(difference).toFixed(2)}</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
                <AlertCircle size={16} /> <span>{error}</span>
              </div>
            )}

            <Button
              type="button"
              variant="danger"
              icon={Lock}
              loading={saving}
              className="mt-auto py-4 text-lg shadow-md"
              onClick={requestSubmit}
            >
              Confirmar Cierre
            </Button>
            <Button type="button" variant="ghost" className="text-slate-500 hover:text-slate-800" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
      
      <ConfirmModal open={!!confirmConfig} {...confirmConfig} onClose={() => setConfirmConfig(null)} />
      <AlertModal open={!!alertConfig} {...alertConfig} onClose={() => { if (alertConfig?.onClose) alertConfig.onClose(); else setAlertConfig(null); }} />
    </div>
  );
}
