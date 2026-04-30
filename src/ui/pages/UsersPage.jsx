import React, { useEffect, useState } from 'react';
import api from '../../infrastructure/api';
import Modal from '../components/Modal';
import { Input, Select, } from '../components/Input';
import UsersTable from '../components/UsersTable';
import LoadingMask from '../components/LoadingMask';

const Roles = ['admin','empleado','cajero','mesero','cocina'];

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'empleado', branch_id: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, bRes] = await Promise.all([api.get('/users'), api.get('/branches')]);
      setUsers(uRes.data.users || []);
      setBranches(bRes.data.branches || []);
    } catch (e) { 
      console.error('Error loading data:', e);
      // Don't show alert here, let the API interceptor handle it
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ username: '', password: '', role: 'empleado', branch_id: '' }); setModalOpen(true); };
  const openEdit = (u) => { setEditing(u); setForm({ username: u.username || '', password: '', role: u.role || 'empleado', branch_id: u.branch_id || '' }); setModalOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return; // Prevent double submission
    setSaving(true);
    try {
      if (editing) {
        await api.post('/users/update', { id: editing.id, username: form.username, password: form.password || null, role: form.role, branch_id: form.branch_id || null });
      } else {
        await api.post('/users', { username: form.username, password: form.password, role: form.role, branch_id: form.branch_id || null });
      }
      setModalOpen(false);
      await load();
    } catch (err) { 
      console.error('Error saving user:', err);
      // API interceptor already shows error message
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar usuario?')) return;
    if (saving) return; // Prevent double submission
    setSaving(true);
    try { 
      await api.post('/users/delete', { id }); 
      await load(); 
    } catch (e) { 
      console.error('Error deleting user:', e);
      // API interceptor already shows error message
    }
    setSaving(false);
  };

  const filtered = users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (branchFilter && String(u.branch_id) !== String(branchFilter)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.username || '').toLowerCase().includes(s) || (u.name || '').toLowerCase().includes(s);
  });

  return (
    <div>
      <LoadingMask open={saving} message={editing ? 'Guardando usuario...' : 'Creando usuario...'} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <button className="btn btn-brand" onClick={openCreate}>Nuevo Usuario</button>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input placeholder="Buscar usuario..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} options={[{value:'',label:'Todos los roles'},...Roles.map(r=>({value:r,label:r}))]} />
        <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} options={[{value:'',label:'Todas las sucursales'}, ...branches.map(b=>({value:b.id,label:b.name}))]} />
      </div>

      <UsersTable users={filtered} branches={branches} onEdit={openEdit} onDelete={handleDelete} />

      <Modal open={modalOpen} title={editing ? 'Editar Usuario' : 'Nuevo Usuario'} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Usuario" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} />
          <Input label="Contraseña" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-primary-700 mb-1">Rol</label>
              <Select
                value={form.role}
                onChange={(e) => setForm({...form, role: e.target.value})}
                options={Roles.map(r => ({ value: r, label: r }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-primary-700 mb-1">Sucursal</label>
              <Select
                value={form.branch_id}
                onChange={(e) => setForm({...form, branch_id: e.target.value})}
                options={[{ value: '', label: 'Sin sucursal' }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
              />
            </div>
          </div>
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

export default UsersPage;
