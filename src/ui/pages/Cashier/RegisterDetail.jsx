import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Trash2, Printer, Lock, Pencil, AlertCircle, TrendingUp, History, Wallet, DollarSign, Plus } from 'lucide-react';
import api from '../../../infrastructure/api';
import { Button } from '../../components/Button';
import { Card, CardHeader } from '../../components/Card';
import { ConfirmModal } from '../../components/ConfirmModal';
import MovementModal from './MovementModal';
import CloseCashForm from './CloseCashForm';

export default function RegisterDetail({ 
  register, 
  cashStatus, 
  movements, 
  onClose, 
  onReload, 
  onPrint, 
  onEditBreakdown,
  isViewing = false 
}) {
  const [submitting, setSubmitting] = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);
  const [editingMov, setEditingMov] = useState(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [deletingMov, setDeletingMov] = useState(null);

  const handleDeleteMovement = async () => {
    if (!deletingMov) return;
    try {
      await api.post('/cash/movement/delete', { id: deletingMov.id });
      onReload();
    } catch (err) { console.error(err); }
    finally { setDeletingMov(null); }
  };

  const handleEditMovement = (m) => {
    setEditingMov(m);
    setShowMovModal(true);
  };

  const totals = {
    income: movements.filter(m => m.type === 'ingreso').reduce((s, m) => s + parseFloat(m.amount), 0),
    expense: movements.filter(m => m.type === 'egreso').reduce((s, m) => s + parseFloat(m.amount), 0),
    sales: parseFloat(cashStatus?.session?.total_sales || 0),
    opening: parseFloat(cashStatus?.session?.opening_balance || 0),
  };
  
  const expectedTotal = totals.opening + totals.sales + totals.income - totals.expense;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all text-primary-400 hover:text-brand shadow-sm">
            <ArrowUpRight className="rotate-180" size={24}/>
          </button>
          <div>
            <h2 className="text-2xl font-black text-primary-900 leading-tight">{register.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${isViewing ? 'bg-primary-300' : 'bg-emerald-500 animate-pulse'}`}/>
              <p className={`text-sm font-bold ${isViewing ? 'text-primary-400' : 'text-emerald-600'}`}>
                {isViewing ? 'Consulta de Sesión' : 'Sesión activa'} · {cashStatus?.session?.username}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" icon={Printer} onClick={() => onPrint(cashStatus.session.id)}>Imprimir</Button>
          {!isViewing && (
            <>
              <Button variant="ghost" icon={Pencil} onClick={() => onEditBreakdown(cashStatus.session)}>Editar Desglose</Button>
              <Button variant="danger" icon={Lock} onClick={() => setShowCloseModal(true)}>Cerrar Caja</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Saldo Inicial', value: totals.opening, icon: Wallet, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Ventas Efectivo', value: totals.sales, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Movimientos', value: totals.income - totals.expense, icon: History, color: 'text-brand', bg: 'bg-brand/10' },
          { label: 'Saldo Esperado', value: expectedTotal, icon: DollarSign, color: 'text-brand', bg: 'bg-brand', dark: true },
        ].map((stat, i) => (
          <div key={i} className={`p-5 rounded-3xl ${stat.dark ? stat.bg + ' text-white shadow-brand/20 shadow-lg' : 'bg-white border border-primary-100 shadow-sm'} transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-2xl ${stat.dark ? 'bg-white/20' : stat.bg} ${stat.dark ? 'text-white' : stat.color}`}>
                <stat.icon size={20}/>
              </div>
              {!stat.dark && !isViewing && <span className="text-[10px] font-black text-primary-300 uppercase tracking-widest">En Vivo</span>}
            </div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${stat.dark ? 'text-white/60' : 'text-primary-400'}`}>{stat.label}</p>
            <p className="text-2xl font-black tabular-nums mt-1">${stat.value.toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden rounded-[2.5rem] bg-white/70 backdrop-blur-md p-0">
          <div className="flex flex-row items-center justify-between px-8 py-6 border-b border-primary-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand/10 text-brand rounded-2xl"><History size={20}/></div>
              <h3 className="font-black text-primary-900 uppercase tracking-wider text-sm">Movimientos Manuales</h3>
            </div>
            {!isViewing && (
              <Button variant="brand" size="sm" icon={Plus} onClick={() => { setEditingMov(null); setShowMovModal(true); }} className="h-9 text-[10px] uppercase font-black tracking-widest px-5">Nuevo</Button>
            )}
          </div>
          <div className="p-0 overflow-x-auto">
            {movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-primary-300">
                <div className="w-20 h-20 rounded-[2rem] bg-primary-50 flex items-center justify-center mb-4"><History size={40}/></div>
                <p className="font-bold">Sin movimientos registrados</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-primary-50/50">
                    <th className="px-8 py-5 text-left text-[10px] font-black text-primary-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-primary-400 uppercase tracking-widest">Descripción</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-primary-400 uppercase tracking-widest">Monto</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-primary-400 uppercase tracking-widest">Hora</th>
                    {!isViewing && <th className="px-8 py-5 text-center text-[10px] font-black text-primary-400 uppercase tracking-widest">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100">
                  {movements.map(m => (
                    <tr key={m.id} className="hover:bg-white group transition-colors">
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${m.type === 'ingreso' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {m.type === 'ingreso' ? <ArrowUpRight size={12}/> : <ArrowDownLeft size={12}/>}
                          {m.type}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-primary-700">{m.description || '—'}</td>
                      <td className={`px-8 py-5 text-right text-sm font-black tabular-nums ${m.type === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.type === 'ingreso' ? '+' : '-'}${parseFloat(m.amount).toFixed(2)}
                      </td>
                      <td className="px-8 py-5 text-right text-xs font-bold text-primary-400">
                        {new Date(m.created_at.replace(' ', 'T')).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      {!isViewing && (
                        <td className="px-8 py-5 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditMovement(m)} className="p-2 text-primary-300 hover:text-brand hover:bg-brand/10 rounded-xl transition-all">
                              <Pencil size={16}/>
                            </button>
                            <button onClick={() => setDeletingMov(m)} className="p-2 text-primary-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                              <Trash2 size={16}/>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <div className="bg-primary-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-primary-900/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"/>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand/20 rounded-full -ml-12 -mb-12 blur-xl"/>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-1">
              {isViewing ? 'Total de Sesión' : 'Efectivo Disponible'}
            </p>
            <h4 className="text-5xl font-black tabular-nums tracking-tight">${expectedTotal.toFixed(2)}</h4>
            <div className="mt-8 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white/40 uppercase tracking-widest">Base Inicial</span>
                <span className="font-black tabular-nums">${totals.opening.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white/40 uppercase tracking-widest">Ventas en Efectivo</span>
                <span className="font-black tabular-nums text-emerald-400">+${totals.sales.toFixed(2)}</span>
              </div>
              <div className="h-px bg-white/10 my-2"/>
              <div className="flex justify-between items-center text-sm">
                <span className="font-black uppercase tracking-widest text-brand">Total Neto</span>
                <span className="text-xl font-black tabular-nums">${expectedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white border border-primary-100 rounded-[2rem] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 text-amber-500 rounded-xl"><AlertCircle size={18}/></div>
              <h4 className="font-black text-primary-900 uppercase tracking-wider text-xs">Información</h4>
            </div>
            <p className="text-xs font-bold text-primary-400 leading-relaxed">
              {isViewing 
                ? 'Este es un reporte histórico de la sesión seleccionada. No se pueden realizar modificaciones.'
                : 'No olvides registrar cada entrada o salida manual de efectivo para mantener un cuadre exacto al finalizar el turno.'
              }
            </p>
          </div>
        </div>
      </div>

      <MovementModal 
        open={showMovModal} 
        onClose={() => { setShowMovModal(false); setEditingMov(null); }} 
        onSaved={onReload} 
        initialData={editingMov}
      />
      {showCloseModal && (
        <CloseCashForm register={register} expectedTotal={expectedTotal} onClose={() => setShowCloseModal(false)} onClosed={onReload} />
      )}
      <ConfirmModal 
        open={!!deletingMov} 
        title="Eliminar Movimiento" 
        message="¿Estás seguro de eliminar este registro? Esto afectará el balance actual." 
        variant="danger" 
        onConfirm={handleDeleteMovement} 
        onClose={() => setDeletingMov(null)} 
      />
    </div>
  );
}
