import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Printer, Pencil, Loader2 } from 'lucide-react';
import api from '../../../infrastructure/api';
import { Badge } from '../../components/Badge';

export default function SessionRow({ session, onPrint, onEdit }) {
  const [open, setOpen]           = useState(false);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading]     = useState(false);

  const toggle = async () => {
    if (!open && movements.length === 0) {
      setLoading(true);
      try { 
        const r = await api.get(`/cash/movements?session_id=${session.id}`); 
        setMovements(r.data.movements || []); 
      } catch (err) { 
        console.error(err); 
      } finally { 
        setLoading(false); 
      }
    }
    setOpen(o => !o);
  };

  const duration = session.closed_at ? (() => {
    const ms = new Date(session.closed_at.replace(' ', 'T')) - new Date(session.opened_at.replace(' ', 'T'));
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  })() : 'Abierta';

  return (
    <div className="border border-primary-100 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      <button onClick={toggle} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-primary-50 transition-colors text-left">
        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div><p className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Cajero</p><p className="font-bold text-primary-900">{session.username}</p></div>
          <div><p className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Apertura</p><p className="font-bold text-primary-900">{new Date(session.opened_at.replace(' ', 'T')).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})}</p></div>
          <div><p className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Saldo inicial</p><p className="font-bold text-primary-900">${parseFloat(session.opening_balance||0).toFixed(2)}</p></div>
          <div><p className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Ventas</p><p className="font-bold text-emerald-600">${parseFloat(session.total_sales||0).toFixed(2)}</p></div>
          <div><p className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Saldo final</p><p className="font-bold text-primary-900">{session.closing_balance ? `$${parseFloat(session.closing_balance).toFixed(2)}` : '—'} <span className="text-[10px] font-normal text-primary-400 ml-1">({duration})</span></p></div>
        </div>
        <Badge variant={session.status==='open' ? 'success' : 'default'}>{session.status==='open' ? 'Abierta' : 'Cerrada'}</Badge>
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onPrint(session.id); }}
            className="p-2 hover:bg-primary-100 rounded-lg text-primary-400 hover:text-brand transition-colors"
            title="Imprimir Resumen"
          >
            <Printer size={18}/>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(session); }}
            className="p-2 hover:bg-primary-100 rounded-lg text-primary-400 hover:text-blue-600 transition-colors"
            title="Editar Desglose"
          >
            <Pencil size={18}/>
          </button>
        </div>
        {open ? <ChevronUp size={16} className="text-primary-300"/> : <ChevronDown size={16} className="text-primary-300"/>}
      </button>
      
      {open && (
        <div className="border-t border-primary-100 px-5 py-4 bg-primary-50/30 animate-in slide-in-from-top-2 duration-200">
          <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-3">Movimientos manuales</p>
          {loading ? (
            <div className="flex justify-center py-3"><Loader2 className="animate-spin text-brand" size={18}/></div>
          ) : movements.length === 0 ? (
            <p className="text-sm text-primary-400 text-center py-2 italic font-medium">Sin movimientos</p>
          ) : (
            <div className="space-y-2">
              {movements.map(m => (
                <div key={m.id} className="flex items-center gap-3 text-sm group">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${m.type==='ingreso' ? 'bg-emerald-500' : 'bg-red-500'}`}/>
                  <span className="flex-1 text-primary-700 font-medium group-hover:text-primary-900 transition-colors">{m.description || 'Sin descripción'}</span>
                  <span className={`font-black tabular-nums ${m.type==='ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.type==='ingreso' ? '+' : '-'}${parseFloat(m.amount).toFixed(2)}
                  </span>
                  <span className="text-primary-400 text-[11px] font-bold shrink-0">{new Date(m.created_at.replace(' ', 'T')).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
