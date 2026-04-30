import React, { useState, useEffect } from 'react';
import { X, Pencil, AlertCircle, Unlock, Lock } from 'lucide-react';
import api from '../../../infrastructure/api';
import { Button } from '../../components/Button';
import { BILLS, COINS, DENOM_VALUE } from './constants';

export default function BreakdownEditModal({ open, onClose, session, onSaved }) {
  const [openQty, setOpenQty]   = useState({});
  const [closeQty, setCloseQty] = useState({});
  const [openedAt, setOpenedAt] = useState('');
  const [closedAt, setClosedAt] = useState('');
  const [saving, setSaving]     = useState(false);

  // Totales calculados en cada render
  const openTotal  = [...BILLS, ...COINS].reduce((s, k) => s + DENOM_VALUE(k) * (parseFloat(openQty[k]) || 0), 0);
  const closeTotal = [...BILLS, ...COINS].reduce((s, k) => s + DENOM_VALUE(k) * (parseFloat(closeQty[k]) || 0), 0);

  // Valores de la sesión para el cálculo de diferencia real
  const sales      = parseFloat(session?.total_sales || 0);
  const movs       = parseFloat(session?.movements_balance || 0);
  const expected   = openTotal + sales + movs;
  const realDiff   = closeTotal - expected;

  useEffect(() => {
    if (open && session) {
      // Parsear desgloses
      const parseBreak = (raw) => {
        if (!raw) return {};
        try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
        catch { return {}; }
      };
      
      const oBreak = parseBreak(session.opening_breakdown);
      const cBreak = parseBreak(session.closing_breakdown);

      const oQ = {}; const cQ = {};
      [...BILLS, ...COINS].forEach(k => {
        // Compatibilidad con keys viejas (numéricas) y nuevas (strings)
        oQ[k] = oBreak[k] ?? oBreak[Number(k)] ?? (k === '1.00' ? oBreak[1] : undefined) ?? '';
        cQ[k] = cBreak[k] ?? cBreak[Number(k)] ?? (k === '1.00' ? cBreak[1] : undefined) ?? '';
      });
      
      setOpenQty(oQ);
      setCloseQty(cQ);
      
      // Fix horas: Tomar solo los primeros 16 caracteres (YYYY-MM-DDTHH:mm) 
      if (session.opened_at) setOpenedAt(session.opened_at.replace(' ', 'T').substring(0, 16));
      if (session.closed_at) setClosedAt(session.closed_at.replace(' ', 'T').substring(0, 16));
    }
  }, [open, session]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const oBreakdown = {};
      [...BILLS, ...COINS].forEach(k => { if (parseFloat(openQty[k])  > 0) oBreakdown[k] = parseInt(openQty[k]); });

      const cBreakdown = {};
      [...BILLS, ...COINS].forEach(k => { if (parseFloat(closeQty[k]) > 0) cBreakdown[k] = parseInt(closeQty[k]); });

      await api.post('/cash/update-breakdown', {
        id: session.id,
        opening_balance: openTotal,
        opening_breakdown: oBreakdown,
        closing_balance: closeTotal,
        closing_breakdown: cBreakdown,
        opened_at: openedAt.replace('T', ' '),
        closed_at: closedAt ? closedAt.replace('T', ' ') : null
      });
      onSaved();
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (!open || !session) return null;

  const DenomList = ({ keys, qty, setQ, label, accent }) => (
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-black text-primary-400 uppercase tracking-[0.25em] mb-3 flex items-center gap-1.5">
        <span className={`w-5 h-[2px] ${accent} rounded-full`}/> {label}
      </p>
      <div className="space-y-1.5">
        {keys.map(k => (
          <div key={k} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/80 hover:bg-white border border-transparent hover:border-primary-100 hover:shadow-sm transition-all">
            <span className="w-11 shrink-0 text-center text-[11px] font-black text-primary-700 bg-primary-50 rounded-lg py-1">${k}</span>
            <input
              type="number" min="0"
              value={qty[k] ?? ''}
              onChange={e => setQ(k, e.target.value)}
              placeholder="0"
              className="w-14 shrink-0 px-1 py-1.5 rounded-lg border border-primary-200 text-center text-sm font-black outline-none focus:border-brand transition-all bg-white"
            />
            <span className="text-primary-300 text-xs shrink-0">×</span>
            <div className="flex-1 text-right">
              <p className="text-xs font-black text-primary-800 tabular-nums">${(DENOM_VALUE(k) * (parseFloat(qty[k]) || 0)).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const Section = ({ label, qty, setQ, total, color, bgColor, dateValue, onDateChange, dateLabel, icon }) => (
    <div className={`flex-1 rounded-3xl ${bgColor} border border-primary-100 flex flex-col overflow-hidden`}>
      <div className="px-6 py-5 border-b border-primary-100 bg-white/70 backdrop-blur-sm flex justify-between items-start gap-4">
        <div>
          <p className={`text-[10px] font-black ${color} uppercase tracking-[0.25em] mb-1 flex items-center gap-2`}>
            {icon} {label}
          </p>
          <p className={`text-3xl font-black ${color} tabular-nums`}>${total.toFixed(2)}</p>
        </div>
        <div className="shrink-0">
          <label className="block text-[9px] font-black text-primary-400 uppercase tracking-widest mb-1.5">{dateLabel}</label>
          <input
            type="datetime-local"
            value={dateValue}
            onChange={e => onDateChange(e.target.value)}
            className="bg-white px-3 py-2 rounded-xl border border-primary-200 text-xs font-bold outline-none focus:border-brand transition-all shadow-sm w-full"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
        <div className="flex gap-4">
          <DenomList keys={BILLS} qty={qty} setQ={setQ} label="Billetes" accent="bg-emerald-400"/>
          <div className="w-px bg-primary-100 shrink-0"/>
          <DenomList keys={COINS} qty={qty} setQ={setQ} label="Monedas"  accent="bg-amber-400"/>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[110] flex" style={{ left: '256px' }}>
      <div className="flex-1 bg-slate-100 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-primary-100 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="flex items-center gap-2 px-3 py-2 hover:bg-primary-50 rounded-xl transition-all text-primary-500 text-sm font-bold">
              <X size={18}/> Volver
            </button>
            <div className="w-px h-8 bg-primary-100"/>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand/10 text-brand rounded-xl flex items-center justify-center shrink-0"><Pencil size={18}/></div>
              <div>
                <h2 className="text-base font-black text-primary-900 leading-tight">Editar Sesión de Caja</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 bg-primary-100 text-primary-500 rounded-md">ID #{session.id}</span>
                  <span className="text-primary-300 text-xs">·</span>
                  <span className="text-xs text-primary-400 font-bold">{session.username}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 divide-x divide-primary-100">
              <div className="text-right pr-4">
                <p className="text-[8px] font-black text-primary-400 uppercase tracking-widest">Apertura</p>
                <p className="text-sm font-black text-primary-700 tabular-nums">${openTotal.toFixed(2)}</p>
              </div>
              <div className="text-right px-4">
                <p className="text-[8px] font-black text-primary-400 uppercase tracking-widest">Ventas</p>
                <p className="text-sm font-black text-emerald-600 tabular-nums">+${sales.toFixed(2)}</p>
              </div>
              <div className="text-right px-4">
                <p className="text-[8px] font-black text-primary-400 uppercase tracking-widest">Esperado</p>
                <p className="text-sm font-black text-primary-900 tabular-nums">${expected.toFixed(2)}</p>
              </div>
              <div className="text-right px-4">
                <p className="text-[8px] font-black text-primary-400 uppercase tracking-widest">Efectivo Real</p>
                <p className="text-sm font-black text-red-500 tabular-nums">${closeTotal.toFixed(2)}</p>
              </div>
              <div className="text-right pl-4 pr-2">
                <p className="text-[8px] font-black text-primary-400 uppercase tracking-widest">Diferencia</p>
                <p className={`text-base font-black tabular-nums ${Math.abs(realDiff) < 0.01 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {realDiff > 0 ? '+' : ''}{realDiff.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pl-2">
              <Button variant="ghost" onClick={onClose} disabled={saving} className="px-4 py-2 h-9 text-xs">Cancelar</Button>
              <Button variant="brand" onClick={handleSubmit} loading={saving} className="px-6 py-2 h-9 text-xs">Guardar</Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 shrink-0">
          <AlertCircle size={13} className="text-amber-500 shrink-0"/>
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
            Diferencia = Real - (Apertura + Ventas + Movimientos). El balance se recalculará al guardar.
          </p>
        </div>

        <div className="flex-1 flex gap-5 p-5 overflow-hidden min-h-0">
          <Section label="Apertura" qty={openQty} setQ={(k, v) => setOpenQty(q => ({...q, [k]: v}))} total={openTotal} color="text-brand" bgColor="bg-blue-50/60" dateValue={openedAt} onDateChange={setOpenedAt} dateLabel="Fecha Apertura" icon={<Unlock size={11}/>}/>
          <Section label="Cierre" qty={closeQty} setQ={(k, v) => setCloseQty(q => ({...q, [k]: v}))} total={closeTotal} color="text-red-500" bgColor="bg-red-50/50" dateValue={closedAt} onDateChange={setClosedAt} dateLabel="Fecha Cierre" icon={<Lock size={11}/>}/>
        </div>
      </div>
    </div>
  );
}
