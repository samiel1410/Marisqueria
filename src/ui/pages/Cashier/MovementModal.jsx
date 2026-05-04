import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '../../../infrastructure/api';
import { Button } from '../../components/Button';

export default function MovementModal({ open, onClose, onSaved, initialData }) {
  const [form, setForm] = useState({ type: 'ingreso', amount: '', description: '' });
  const [saving, setSaving] = useState(false);
  
  useEffect(() => { 
    if (open) {
      if (initialData) {
        setForm({
          id: initialData.id,
          type: initialData.type,
          amount: initialData.amount,
          description: initialData.description || ''
        });
      } else {
        setForm({ type: 'ingreso', amount: '', description: '' });
      }
    }
  }, [open, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try { 
      if (form.id) {
        await api.post('/cash/movement/update', form);
      } else {
        await api.post('/cash/movement', form);
      }
      onSaved(); 
      onClose(); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setSaving(false); 
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-6 border-b border-primary-100 bg-primary-50/50">
          <h3 className="text-lg font-black text-primary-900 uppercase tracking-wider">
            {form.id ? 'Editar Movimiento' : 'Registrar Movimiento'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all text-primary-400 hover:text-brand"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { v:'ingreso', label:'Ingreso', icon:ArrowUpRight,  cls:'text-emerald-600 bg-emerald-50 border-emerald-200' },
              { v:'egreso',  label:'Egreso',  icon:ArrowDownLeft, cls:'text-rose-600 bg-rose-50 border-rose-200' },
            ].map(t => (
              <button key={t.v} type="button" onClick={() => setForm(f=>({...f,type:t.v}))}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 text-[11px] font-black uppercase tracking-widest transition-all ${form.type===t.v ? t.cls : 'border-primary-100 text-primary-300 bg-white hover:border-primary-200'}`}>
                <t.icon size={16}/> {t.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-primary-400 uppercase tracking-widest ml-1">Monto ($)</label>
            <input type="number" step="0.01" min="0.01" required value={form.amount}
              onChange={e=>setForm(f=>({...f,amount:e.target.value}))}
              className="w-full px-5 py-3 rounded-2xl border-2 border-primary-100 outline-none focus:border-brand text-sm font-bold transition-all" placeholder="0.00"/>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-primary-400 uppercase tracking-widest ml-1">Descripción</label>
            <input type="text" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              className="w-full px-5 py-3 rounded-2xl border-2 border-primary-100 outline-none focus:border-brand text-sm font-bold transition-all" placeholder="Ej: Pago de insumos..."/>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="rounded-xl font-black uppercase text-[10px] tracking-widest">Cancelar</Button>
            <Button type="submit" variant="brand" loading={saving} className="rounded-xl font-black uppercase text-[10px] tracking-widest px-8">
              {form.id ? (saving ? 'Guardando...' : 'Guardar') : (saving ? 'Registrando...' : 'Registrar')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
