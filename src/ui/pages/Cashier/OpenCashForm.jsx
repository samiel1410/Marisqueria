import React, { useState, useEffect } from 'react';
import { Lock, X, AlertCircle, Calculator, Wallet, Coins } from 'lucide-react';
import api from '../../../infrastructure/api';
import { Button } from '../../components/Button';
import { BILLS, COINS, DENOM_VALUE } from './constants';

export default function OpenCashForm({ onOpened, onBack }) {
  const initQty = () => { const o = {}; [...BILLS, ...COINS].forEach(d => { o[d] = ''; }); return o; };
  const [qty, setQty] = useState(initQty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  const total = [...BILLS, ...COINS].reduce((s, d) => s + DENOM_VALUE(d) * (parseFloat(qty[d]) || 0), 0);
  const setQ = (d, v) => setQty(q => ({ ...q, [d]: v }));
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

  useEffect(() => {
    api.get('/cash/status').then(res => {
      if (res.data.status === 'open') {
        setActiveSession(res.data.session);
        setError(`Ya existe una caja abierta en esta sucursal.`);
        setBlocked(true);
      }
    }).catch(() => { });
  }, []);

  const submit = async (withZero = false) => {
    if (saving || blocked) return;
    setError('');
    setSaving(true);
    try {
      const breakdown = {};
      if (!withZero) {
        [...BILLS, ...COINS].forEach(d => { if (parseFloat(qty[d]) > 0) breakdown[d] = parseInt(qty[d]); });
      }

      const payload = {
        opening_balance: withZero ? 0 : total,
        opening_breakdown: withZero ? {} : breakdown,
        // No enviamos register_id para que el backend cree una nueva Caja automáticamente
      };

      await api.post('/cash/open', payload);
      onOpened();
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al abrir la caja';
      setError(msg);
    }
    finally { setSaving(false); }
  };

  const billsTotal = BILLS.reduce((s, d) => s + DENOM_VALUE(d) * (parseFloat(qty[d]) || 0), 0);
  const coinsTotal = COINS.reduce((s, d) => s + DENOM_VALUE(d) * (parseFloat(qty[d]) || 0), 0);

  if (blocked) {
    return (
      <div className="max-w-2xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-primary-100">
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
              <Lock size={40} className="animate-pulse" />
            </div>
            <h2 className="text-2xl font-black mb-2">Caja en Uso</h2>
            <p className="text-white/80">Ya hay una caja activa en esta sucursal.</p>
          </div>
          <div className="p-8 text-center">
            <p className="text-primary-600 font-medium mb-6 leading-relaxed">
              La caja <span className="font-bold text-primary-900 underline">"{activeSession?.register_name}"</span> está abierta por {activeSession?.username}.
              Debes cerrarla antes de intentar abrir una nueva.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={onOpened} variant="brand" className="px-8">
                Ir a Caja Activa
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 relative">
      {saving && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
            <p className="text-xs font-black text-primary-900 uppercase tracking-widest">Procesando...</p>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div>
          <h2 className="text-3xl font-black text-primary-900 tracking-tight">
            Apertura de Caja
          </h2>
        </div>
        <div className="bg-white px-5 py-2.5 rounded-2xl border border-primary-100 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center">
            <Calculator size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest leading-none mb-1">Responsable</p>
            <p className="text-sm font-black text-primary-900">{user?.username}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-9 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-[1.5rem] shadow-sm border border-primary-100 overflow-hidden group/card hover:shadow-md transition-all duration-300">
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-50/50 to-white border-b border-primary-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Wallet size={16} />
                  </div>
                  <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em]">Billetes</span>
                </div>
                <span className="text-sm font-black text-emerald-600">${billsTotal.toFixed(2)}</span>
              </div>
              <div className="p-5 space-y-2">
                {BILLS.map(d => (
                  <div key={d} className="flex items-center gap-3 group/item">
                    <div className="w-14 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-black text-xs border border-emerald-100 group-hover/item:bg-emerald-100 transition-all duration-200">
                      ${d}
                    </div>
                    <X size={10} className="text-primary-200" />
                    <input
                      type="number" min="0" value={qty[d]} placeholder="0"
                      onChange={e => setQ(d, e.target.value)}
                      className="flex-1 w-full bg-primary-50/30 border-2 border-transparent focus:border-brand focus:bg-white rounded-xl px-3 py-1.5 text-center font-black text-primary-900 outline-none transition-all placeholder:text-primary-200 text-sm"
                    />
                    <div className="w-20 text-right font-black text-primary-700 tabular-nums text-xs group-hover/item:text-brand transition-colors">
                      ${(DENOM_VALUE(d) * (parseFloat(qty[d]) || 0)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[1.5rem] shadow-sm border border-primary-100 overflow-hidden group/card hover:shadow-md transition-all duration-300">
              <div className="px-6 py-4 bg-gradient-to-r from-amber-50/50 to-white border-b border-primary-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center">
                    <Coins size={16} />
                  </div>
                  <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em]">Monedas</span>
                </div>
                <span className="text-sm font-black text-amber-600">${coinsTotal.toFixed(2)}</span>
              </div>
              <div className="p-5 space-y-2">
                {COINS.map(d => (
                  <div key={d} className="flex items-center gap-3 group/item">
                    <div className="w-14 h-9 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center font-black text-xs border border-amber-100 group-hover/item:bg-emerald-100 transition-all duration-200">
                      ${parseFloat(d).toFixed(2)}
                    </div>
                    <X size={10} className="text-primary-200" />
                    <input
                      type="number" min="0" value={qty[d]} placeholder="0"
                      onChange={e => setQ(d, e.target.value)}
                      className="flex-1 w-full bg-primary-50/30 border-2 border-transparent focus:border-brand focus:bg-white rounded-xl px-3 py-1.5 text-center font-black text-primary-900 outline-none transition-all placeholder:text-primary-200 text-sm"
                    />
                    <div className="w-20 text-right font-black text-primary-700 tabular-nums text-xs group-hover/item:text-brand transition-colors">
                      ${(DENOM_VALUE(d) * (parseFloat(qty[d]) || 0)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-950 rounded-[2rem] p-8 text-white shadow-2xl shadow-primary-900/40 relative overflow-hidden group/sidebar">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full -mr-20 -mt-20 blur-[80px] group-hover/sidebar:bg-brand/20 transition-all duration-700" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-brand rounded-full animate-pulse shadow-[0_0_10px_rgba(14,165,233,0.8)]" />
                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Total en Caja</p>
              </div>
              <h3 className="text-6xl font-black mb-8 tracking-tighter tabular-nums text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                <span className="text-brand mr-1">$</span>{total.toFixed(2)}
              </h3>

              {error && (
                <div className="bg-rose-500/20 border border-rose-500/40 text-rose-100 p-4 rounded-2xl text-[11px] font-bold flex items-start gap-3 mb-6 animate-shake shadow-lg">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                  <p className="leading-tight">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <Button
                  onClick={() => submit(false)}
                  disabled={total <= 0 || saving}
                  loading={saving}
                  className="w-full h-16 bg-gradient-to-r from-brand to-sky-600 text-white hover:to-sky-500 hover:scale-[1.02] rounded-2xl font-black text-lg shadow-[0_20px_40px_-10px_rgba(14,165,233,0.3)] transition-all active:scale-95 border border-white/10"
                >
                  Abrir Caja
                </Button>
                <button
                  onClick={() => submit(true)}
                  disabled={saving}
                  className="w-full py-3 text-white/40 hover:text-white/90 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-white/5 rounded-xl"
                >
                  Abrir con $0.00
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
