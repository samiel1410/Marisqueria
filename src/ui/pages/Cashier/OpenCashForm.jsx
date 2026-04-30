import React, { useState, useEffect } from 'react';
import { Lock, Unlock, X, AlertCircle, Calculator, Wallet, Coins } from 'lucide-react';
import api from '../../../infrastructure/api';
import { Button } from '../../components/Button';
import { BILLS, COINS, DENOM_VALUE } from './constants';

export default function OpenCashForm({ register, onOpened, onBack }) {
  const initQty = () => { const o = {}; [...BILLS, ...COINS].forEach(d => { o[d] = ''; }); return o; };
  const [qty, setQty]       = useState(initQty);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [blocked, setBlocked] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  
  const total = [...BILLS, ...COINS].reduce((s, d) => s + DENOM_VALUE(d) * (parseFloat(qty[d]) || 0), 0);
  const setQ  = (d, v) => setQty(q => ({ ...q, [d]: v }));
  const user  = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

  useEffect(() => {
    api.get('/cash/status').then(res => {
      if (res.data.status === 'open') {
        setActiveSession(res.data.session);
        setError(`Tienes una sesión activa en "${res.data.session?.register_name || 'otra caja'}".`);
        setBlocked(true);
      }
    }).catch(() => {});
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
      await api.post('/cash/open', {
        opening_balance: withZero ? 0 : total,
        opening_breakdown: withZero ? {} : breakdown,
        register_id: register.id,
      });
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
            <h2 className="text-2xl font-black mb-2">Acceso Restringido</h2>
            <p className="text-white/80">Solo se permite una sesión de caja activa por usuario.</p>
          </div>
          <div className="p-8 text-center">
            <p className="text-primary-600 font-medium mb-6 leading-relaxed">
              Actualmente tienes una sesión abierta en <span className="font-bold text-primary-900 underline">"{activeSession?.register_name}"</span>. 
              Debes cerrarla antes de intentar abrir una nueva caja.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={onBack} variant="outline" className="px-8">
                Volver a Cajas
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-primary-400 hover:text-brand mb-1 transition-colors">
            ← VOLVER A CAJAS
          </button>
          <h2 className="text-2xl font-black text-primary-900">Apertura de Caja</h2>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border border-primary-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center">
            <Calculator size={20}/>
          </div>
          <div>
            <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest leading-none">Cajero Actual</p>
            <p className="text-sm font-bold text-primary-700">{user?.username}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Denominaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Billetes */}
            <div className="bg-white rounded-3xl shadow-sm border border-primary-100 overflow-hidden">
              <div className="px-6 py-4 bg-primary-50 border-b border-primary-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className="text-primary-400"/>
                  <span className="text-xs font-black text-primary-600 uppercase tracking-widest">Billetes</span>
                </div>
                <span className="text-xs font-bold text-primary-400">${billsTotal.toFixed(2)}</span>
              </div>
              <div className="p-6 space-y-4">
                {BILLS.map(d => (
                  <div key={d} className="flex items-center gap-3 group">
                    <div className="w-16 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-black text-sm border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                      ${d}
                    </div>
                    <X size={12} className="text-primary-300"/>
                    <input
                      type="number" min="0" value={qty[d]} placeholder="0"
                      onChange={e => setQ(d, e.target.value)}
                      className="flex-1 w-full bg-primary-50 border-2 border-transparent focus:border-brand focus:bg-white rounded-xl px-4 py-2 text-center font-bold text-primary-900 outline-none transition-all"
                    />
                    <div className="w-20 text-right font-black text-primary-600 text-sm">
                      ${(DENOM_VALUE(d) * (parseFloat(qty[d]) || 0)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monedas */}
            <div className="bg-white rounded-3xl shadow-sm border border-primary-100 overflow-hidden">
              <div className="px-6 py-4 bg-primary-50 border-b border-primary-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins size={18} className="text-primary-400"/>
                  <span className="text-xs font-black text-primary-600 uppercase tracking-widest">Monedas</span>
                </div>
                <span className="text-xs font-bold text-primary-400">${coinsTotal.toFixed(2)}</span>
              </div>
              <div className="p-6 space-y-4">
                {COINS.map(d => (
                  <div key={d} className="flex items-center gap-3 group">
                    <div className="w-16 h-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center font-black text-sm border border-amber-100 group-hover:bg-amber-100 transition-colors">
                      ${parseFloat(d).toFixed(2)}
                    </div>
                    <X size={12} className="text-primary-300"/>
                    <input
                      type="number" min="0" value={qty[d]} placeholder="0"
                      onChange={e => setQ(d, e.target.value)}
                      className="flex-1 w-full bg-primary-50 border-2 border-transparent focus:border-brand focus:bg-white rounded-xl px-4 py-2 text-center font-bold text-primary-900 outline-none transition-all"
                    />
                    <div className="w-20 text-right font-black text-primary-600 text-sm">
                      ${(DENOM_VALUE(d) * (parseFloat(qty[d]) || 0)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Resumen */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary-900 rounded-3xl p-8 text-white shadow-xl shadow-primary-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />
            <div className="relative z-10">
              <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">Monto de Apertura</p>
              <h3 className="text-5xl font-black mb-8">${total.toFixed(2)}</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Caja a abrir:</span>
                  <span className="font-bold">{register.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Sucursal:</span>
                  <span className="font-bold">{register.branch_name || 'Principal'}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-4 rounded-2xl text-xs font-bold flex items-start gap-3 mb-6 animate-shake">
                  <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => submit(false)}
                  disabled={total <= 0 || saving}
                  loading={saving}
                  className="w-full h-14 bg-white text-primary-900 hover:bg-white/90 rounded-2xl font-black text-lg shadow-lg shadow-white/10"
                >
                  Abrir Caja
                </Button>
                <button
                  onClick={() => submit(true)}
                  disabled={saving}
                  className="w-full py-3 text-white/60 hover:text-white text-sm font-bold transition-colors"
                >
                  O abrir con balance en $0.00
                </button>
              </div>
            </div>
          </div>

          <div className="bg-primary-50 rounded-3xl p-6 border border-primary-100">
            <h4 className="text-xs font-black text-primary-400 uppercase tracking-widest mb-4">Instrucciones</h4>
            <ul className="space-y-3">
              {[
                'Cuenta el efectivo físico antes de iniciar.',
                'Ingresa la cantidad de billetes y monedas.',
                'Verifica que el total coincida.',
                'Solo puedes tener una caja abierta.'
              ].map((text, i) => (
                <li key={i} className="flex gap-3 text-xs text-primary-600 leading-relaxed">
                  <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-primary-400 font-bold shrink-0">{i+1}</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
