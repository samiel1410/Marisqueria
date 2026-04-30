import React, { useEffect, useState } from 'react';
import api from '../../infrastructure/api';
import Modal from '../components/Modal';
import { Input } from '../components/Input';
import DataTable from '../components/DataTable';
import LoadingMask from '../components/LoadingMask';

const BranchesPage = () => {
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/branches');
      setBranches(res.data.branches || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', address: '' }); setModalOpen(true); };

  const openEdit = (b) => { setEditing(b); setForm({ name: b.name || '', address: b.address || '' }); setModalOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return; // Prevent double submission
    setSaving(true);
    try {
      if (editing) {
        await api.post('/branches/update', { id: editing.id, ...form });
      } else {
        await api.post('/branches', form);
      }
      setModalOpen(false);
      await load();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar sucursal?')) return;
    if (saving) return; // Prevent double submission
    setSaving(true);
    try { await api.post('/branches/delete', { id }); await load(); } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <div>
      <LoadingMask open={saving} message={editing ? 'Guardando cambios...' : 'Creando sucursal...'} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sucursales</h1>
        <button className="btn btn-brand" onClick={openCreate}>Nueva Sucursal</button>
      </div>

      {loading ? <p>Cargando...</p> : (
        <>
          <div className="mb-4">
            <Input placeholder="Buscar sucursal por nombre o dirección..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <DataTable
          columns={[
            { key: 'name', header: 'Sucursal', render: r => <div className="font-semibold">{r.name}</div> },
            { key: 'address', header: 'Dirección', render: r => <div className="text-sm text-primary-500">{r.address}</div> },
            { key: 'created_at', header: 'Creado', render: r => <div className="text-sm text-primary-500">{r.created_at || '—'}</div> },
          ]}
          data={branches.filter(b => {
            if (!search) return true;
            const s = search.toLowerCase();
            return (b.name || '').toLowerCase().includes(s) || (b.address || '').toLowerCase().includes(s);
          })}
          actions={[
            { label: 'Editar', onClick: (r) => openEdit(r) },
            { label: 'Eliminar', variant: 'danger', onClick: (r) => handleDelete(r.id) }
          ]}
          empty={{ title: 'Sin sucursales', description: 'Crea una nueva sucursal para comenzar.' }}
        />
        </>
      )}

      <Modal open={modalOpen} title={editing ? 'Editar Sucursal' : 'Nueva Sucursal'} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
          <Input label="Dirección" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-brand" disabled={saving}>
              {saving ? (editing ? 'Editando...' : 'Guardando...') : (editing ? 'Editar' : 'Guardar')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BranchesPage;
