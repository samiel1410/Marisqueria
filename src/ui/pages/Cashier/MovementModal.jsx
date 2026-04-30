import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '../../../infrastructure/api';
import { Button } from '../../components/Button';

export default function MovementModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ type: 'ingreso', amount: '', description: '' });
  const [saving, setSaving] = useState(false);
  
  useEffect(() => { 
    if (open) setForm({ type: 'ingreso', amount: '', description: '' }); 
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try { 
      await api.post('/cash/movement', form); 
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex justify-between items-center p-6 border-b border-primary-100">
          <h3 className="text-lg font-bold">Registrar Movimiento</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { v:'ingreso', label:'Ingreso', icon:ArrowUpRight,  cls:'text-green-600 bg-green-50 border-green-300' },
              { v:'egreso',  label:'Egreso',  icon:ArrowDownLeft, cls:'text-red-600 bg-red-50 border-red-300' },
            ].map(t => (
              <button key={t.v} type="button" onClick={() => setForm(f=>({...f,type:t.v}))}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${form.type===t.v ? t.cls : 'border-primary-200 text-primary-500'}`}>
                <t.icon size={16}/> {t.label}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary-700 mb-1">Monto *</label>
            <input type="number" step="0.01" min="0.01" required value={form.amount}
              onChange={e=>setForm(f=>({...f,amount:e.target.value}))}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-primary-200 outline-none focus:border-brand text-sm" placeholder="0.00"/>
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary-700 mb-1">Descripción</label>
            <input type="text" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-primary-200 outline-none focus:border-brand text-sm" placeholder="Ej: Pago proveedor..."/>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="brand" loading={saving}>{saving ? 'Registrando...' : 'Registrar'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
