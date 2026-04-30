import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../../infrastructure/api';
import { Button } from '../../components/Button';

export default function RegisterModal({ open, onClose, editing, onSaved }) {
  const [name, setName]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
      } else {
        setName(''); 
      }
    }
  }, [open, editing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await api.post('/cash-registers/update', { id: editing.id, name: name.trim(), status: editing.status });
        onSaved();
      } else {
        const res = await api.post('/cash-registers', { name: name.trim() });
        onSaved(res.data.register);
      }
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex justify-between items-center p-6 border-b border-primary-100">
          <h3 className="text-lg font-bold">{editing ? 'Editar Caja' : 'Nueva Caja'}</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-primary-700 mb-1">Nombre *</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Caja Principal, Caja 2..."
              className="w-full px-4 py-2.5 rounded-xl border-2 border-primary-200 outline-none focus:border-brand text-sm"/>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="brand" loading={saving}>
              {saving ? 'Guardando...' : (editing ? 'Guardar' : 'Crear Caja')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
