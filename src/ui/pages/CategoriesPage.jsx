import { useState, useEffect } from 'react';
import api from '../../infrastructure/api';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import DataTable from '../components/DataTable';

function CategoryModal({ open, onClose, editing, onSaved }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(editing?.name || '');
  }, [open, editing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await api.post('/categories/update', { id: editing.id, name: name.trim() });
      } else {
        await api.post('/categories', { name: name.trim() });
      }
      onSaved();
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex justify-between items-center p-6 border-b border-primary-100">
          <h3 className="text-lg font-bold">{editing ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
          <button onClick={onClose} className="text-primary-400 hover:text-primary-700 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="Nombre *" required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Ceviches, Bebidas..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="brand" loading={saving}>
              {saving ? (editing ? 'Guardando...' : 'Creando...') : (editing ? 'Guardar' : 'Crear')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar categoría? Los productos asociados quedarán sin categoría.')) return;
    await api.post('/categories/delete', { id });
    load();
  };

  const openEdit = (cat) => { setEditing(cat); setModalOpen(true); };
  const openCreate = () => { setEditing(null); setModalOpen(true); };

  const filtered = categories.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <PageHeader
        title="Categorías"
        subtitle="Organiza tus productos por categoría"
        action={<Button variant="brand" icon={Plus} onClick={openCreate}>Nueva Categoría</Button>}
      />

      <div className="mb-6">
        <Input placeholder="Buscar categoría..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <DataTable
        columns={[
          { key: 'icon', header: '', render: () => (
            <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center">
              <Tag size={16} className="text-brand" />
            </div>
          )},
          { key: 'name', header: 'Nombre', render: r => <span className="font-semibold text-primary-900">{r.name}</span> },
          { key: 'created_at', header: 'Creado', render: r => (
            <span className="text-sm text-primary-400">{new Date(r.created_at).toLocaleDateString('es-ES')}</span>
          )},
        ]}
        data={filtered}
        loading={loading}
        actions={[
          { label: 'Editar',    onClick: r => openEdit(r) },
          { label: 'Eliminar', variant: 'danger', onClick: r => handleDelete(r.id) },
        ]}
        empty={{ title: 'Sin categorías', description: 'Crea tu primera categoría para organizar los productos.', icon: Tag }}
      />

      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
}
