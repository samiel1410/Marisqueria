import { useState, useEffect, useRef } from 'react';
import api from '../../infrastructure/api';
import { Plus, X, Package, Search, Loader2, Edit, Trash2, ArrowUpDown, FileText, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import DataTable from '../components/DataTable';

// ─── helpers ────────────────────────────────────────────────────────────────
const UNITS = ['unidades', 'kg', 'g', 'litros', 'ml', 'cajas', 'porciones'];

const emptyForm = {
  name: '', price: '', stock: '', min_stock: '5', unit: 'unidades',
  category_id: '', brand_id: '', image: null, imagePreview: null,
  branch_stocks: [],   // [{ branch_id, stock }]
  manages_inventory: 1,
  is_takeaway: 0,
  takeaway_surcharge: 0,
};

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_URL || '/api/public';
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

// ─── ActionMenu ──────────────────────────────────────────────────────────────
const ActionMenu = ({ product, openEdit, setMovementProduct, setKardexProduct, handleDelete }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0, isUp: false });
  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleScroll = () => {
      if (open) setOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('scroll', handleScroll, true); // true to catch all scrolling
    
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const handleToggle = (e) => {
    if (!open) {
      const rect = e.currentTarget.getBoundingClientRect();
      const menuHeight = 180; // approximate height of the menu
      
      let topPos = rect.bottom + 4;
      let isUp = false;
      
      // If it would go off the bottom of the screen, open it upwards instead
      if (topPos + menuHeight > window.innerHeight) {
        topPos = rect.top - menuHeight - 4;
        isUp = true;
      }

      setCoords({
        top: topPos,
        right: window.innerWidth - rect.right,
        isUp
      });
    }
    setOpen(!open);
  };

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button onClick={handleToggle} className="p-2 rounded-xl hover:bg-primary-100 text-primary-500 transition-colors">
        <MoreVertical size={20} />
      </button>
      {open && (
        <div 
          style={{ top: coords.top, right: coords.right }}
          className={`fixed w-48 bg-white rounded-xl shadow-xl border border-primary-200 z-[9999] py-1 overflow-hidden ${coords.isUp ? 'animate-fade-in' : 'animate-fade-in-up'}`}
        >
          <button onClick={() => { setOpen(false); openEdit(product); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-50 hover:text-brand transition-colors">
            <Edit size={16} /> Editar
          </button>
          <button onClick={() => { setOpen(false); setMovementProduct(product); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-50 hover:text-brand transition-colors">
            <ArrowUpDown size={16} /> Movimiento
          </button>
          <button onClick={() => { setOpen(false); setKardexProduct(product); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-50 hover:text-brand transition-colors">
            <FileText size={16} /> Kardex
          </button>
          <div className="h-px bg-primary-100 my-1"></div>
          <button onClick={() => { setOpen(false); handleDelete(product.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 size={16} /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
};

// ─── ProductModal ────────────────────────────────────────────────────────────
function ProductModal({ open, onClose, product, categories, brands, branches, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const isEdit = !!product;

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name || '',
        price: product.price || '',
        stock: product.stock || '',
        min_stock: product.min_stock ?? 5,
        unit: product.unit || 'unidades',
        category_id: product.category_id || '',
        brand_id: product.brand_id || '',
        image: null,
        imagePreview: product.image_path ? getImageUrl(product.image_path) : null,
        branch_stocks: product.branch_stocks || [],
        manages_inventory: product.manages_inventory !== undefined ? product.manages_inventory : 1,
        is_takeaway: product.is_takeaway !== undefined ? product.is_takeaway : 0,
        takeaway_surcharge: product.takeaway_surcharge || 0,
      });
    } else {
      setForm({ ...emptyForm, branch_stocks: branches.map(b => ({ branch_id: b.id, stock: 0 })) });
    }
  }, [open, product, branches]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, image: file, imagePreview: URL.createObjectURL(file) }));
  };

  const setBranchStock = (branchId, stock) => {
    setForm(f => {
      const bs = [...f.branch_stocks];
      const idx = bs.findIndex(x => String(x.branch_id) === String(branchId));
      if (idx >= 0) bs[idx] = { ...bs[idx], stock };
      else bs.push({ branch_id: branchId, stock });
      return { ...f, branch_stocks: bs };
    });
  };

  const getBranchStock = (branchId) => {
    const found = form.branch_stocks.find(x => String(x.branch_id) === String(branchId));
    return found ? found.stock : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const fd = new FormData();
      ['name','price','stock','min_stock','unit','category_id','brand_id','manages_inventory', 'is_takeaway', 'takeaway_surcharge'].forEach(k => {
        if (form[k] !== '' && form[k] !== null) fd.append(k, form[k]);
      });
      if (form.image) fd.append('image', form.image);
      fd.append('branch_stocks', JSON.stringify(form.branch_stocks));
      if (isEdit) {
        fd.append('id', product.id);
        await api.post('/products/update', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-primary-100">
          <h3 className="text-lg font-bold">{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={onClose} className="text-primary-400 hover:text-primary-700"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image */}
          <div>
            <label className="block text-sm font-semibold text-primary-700 mb-2">Imagen</label>
            <div className="flex items-center gap-4">
              {form.imagePreview
                ? <img src={form.imagePreview} alt="preview" className="w-20 h-20 object-cover rounded-xl border"/>
                : <div className="w-20 h-20 rounded-xl border-2 border-dashed border-primary-200 flex items-center justify-center text-primary-300"><Package size={28}/></div>
              }
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current.click()}>
                {form.imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage}/>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre *" required value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}/>
            <Input label="Precio ($) *" type="number" step="0.01" min="0" required value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))}/>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select label="Categoría *" required value={form.category_id}
                  onChange={e => setForm(f=>({...f,category_id:e.target.value}))}
                  options={categories.map(c=>({value:c.id,label:c.name}))}/>
              </div>
              <button 
                type="button"
                onClick={() => document.getElementById('open-categories-btn')?.click()}
                className="mb-[2px] w-10 h-10 flex items-center justify-center bg-primary-100 text-brand rounded-xl hover:bg-brand hover:text-white transition-colors"
                title="Crear categoría rápida"
              >
                <Plus size={20} />
              </button>
            </div>
            <Select label="Marca" value={form.brand_id}
              onChange={e => setForm(f=>({...f,brand_id:e.target.value}))}
              options={[{value:'',label:'Sin marca'},...brands.map(b=>({value:b.id,label:b.name}))]}/>
            <Select label="Unidad" value={form.unit}
              onChange={e => setForm(f=>({...f,unit:e.target.value}))}
              options={UNITS.map(u=>({value:u,label:u}))}/>
              
            {!!form.manages_inventory && (
              <Input label="Stock mínimo" type="number" min="0" value={form.min_stock} onChange={e => setForm(f=>({...f,min_stock:e.target.value}))}/>
            )}
            
            <div className={`flex items-center gap-2 pt-2 ${!form.manages_inventory ? 'md:col-span-2' : ''}`}>
              <input type="checkbox" id="manages_inventory" checked={!!form.manages_inventory} onChange={e => setForm(f=>({...f,manages_inventory:e.target.checked ? 1 : 0}))} className="w-4 h-4 text-brand rounded border-primary-300 focus:ring-brand"/>
              <label htmlFor="manages_inventory" className="text-sm font-semibold text-primary-700 cursor-pointer">
                Maneja Inventario
              </label>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-l pl-4 border-primary-100">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_takeaway" checked={!!form.is_takeaway} onChange={e => setForm(f=>({...f,is_takeaway:e.target.checked ? 1 : 0}))} className="w-4 h-4 text-brand rounded border-primary-300 focus:ring-brand"/>
                <label htmlFor="is_takeaway" className="text-sm font-semibold text-primary-700 cursor-pointer">
                  Configurar Precio "Para Llevar"
                </label>
              </div>
              {!!form.is_takeaway && (
                <div className="animate-in slide-in-from-left-2 duration-200">
                  <Input label="Recargo por llevar ($)" type="number" step="0.01" min="0" value={form.takeaway_surcharge} onChange={e => setForm(f=>({...f,takeaway_surcharge:e.target.value}))}/>
                  <p className="text-[10px] text-primary-400 mt-1 italic">Este valor se sumará al precio base cuando la orden sea "Para Llevar".</p>
                </div>
              )}
            </div>
          </div>

          {/* Branch stocks */}
          {!!form.manages_inventory && branches.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-primary-700 mb-2">Stock por Sucursal</label>
              <div className="space-y-2">
                {branches.map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                    <span className="flex-1 text-sm font-medium text-primary-700">{b.name}</span>
                    <input type="number" min="0" value={getBranchStock(b.id)}
                      onChange={e => setBranchStock(b.id, parseInt(e.target.value)||0)}
                      className="w-24 px-3 py-1.5 rounded-lg border-2 border-primary-200 text-sm outline-none focus:border-brand"/>
                    <span className="text-xs text-primary-400">{form.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="brand" loading={saving}>
              {saving ? (isEdit ? 'Guardando...' : 'Creando...') : (isEdit ? 'Guardar cambios' : 'Crear producto')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MovementModal ────────────────────────────────────────────────────────────
function MovementModal({ open, onClose, product, branches, onSaved }) {
  const [form, setForm] = useState({ type: 'entrada', quantity: '', branch_id: '', reason: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm({ type: 'entrada', quantity: '', branch_id: '', reason: '' }); }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.post('/inventory/movement', {
        product_id: product.id,
        branch_id: form.branch_id || null,
        type: form.type,
        quantity: parseInt(form.quantity),
        reason: form.reason,
      });
      onSaved();
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-primary-100">
          <h3 className="text-lg font-bold">Movimiento — {product?.name}</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Select label="Tipo" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
            options={[{value:'entrada',label:'Entrada'},{value:'salida',label:'Salida'},{value:'ajuste',label:'Ajuste (valor absoluto)'}]}/>
          <Input label="Cantidad *" type="number" min="1" required value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))}/>
          {branches.length > 0 && (
            <Select label="Sucursal (opcional)" value={form.branch_id} onChange={e=>setForm(f=>({...f,branch_id:e.target.value}))}
              options={[{value:'',label:'Stock general'},...branches.map(b=>({value:b.id,label:b.name}))]}/>
          )}
          <Input label="Motivo" value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="Ej: Compra proveedor, merma..."/>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="brand" loading={saving}>
              {saving ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── KardexModal ─────────────────────────────────────────────────────────────
function KardexModal({ open, onClose, product }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    setLoading(true);
    api.get(`/inventory/movements?product_id=${product.id}`)
      .then(r => setMovements(r.data.movements || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, product]);

  const printPDF = () => window.print();

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-primary-100">
          <div>
            <h3 className="text-lg font-bold">Kardex — {product?.name}</h3>
            <p className="text-sm text-primary-500">Historial de movimientos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={FileText} onClick={printPDF}>PDF</Button>
            <button onClick={onClose}><X size={20}/></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand" size={32}/></div>
          ) : movements.length === 0 ? (
            <p className="text-center text-primary-400 py-10">Sin movimientos registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-50 text-primary-600">
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-right">Cantidad</th>
                  <th className="px-3 py-2 text-right">Stock Ant.</th>
                  <th className="px-3 py-2 text-right">Stock Nuevo</th>
                  <th className="px-3 py-2 text-left">Sucursal</th>
                  <th className="px-3 py-2 text-left">Motivo</th>
                  <th className="px-3 py-2 text-left">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id} className="border-b border-primary-50 hover:bg-primary-50/50">
                    <td className="px-3 py-2 text-primary-500">{new Date(m.created_at).toLocaleString('es-ES')}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.type==='entrada' ? 'bg-green-100 text-green-700' :
                        m.type==='salida'  ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'}`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{m.quantity}</td>
                    <td className="px-3 py-2 text-right text-primary-500">{m.previous_stock}</td>
                    <td className="px-3 py-2 text-right font-bold">{m.new_stock}</td>
                    <td className="px-3 py-2 text-primary-500">{m.branch_name || '—'}</td>
                    <td className="px-3 py-2 text-primary-500">{m.reason || '—'}</td>
                    <td className="px-3 py-2 text-primary-500">{m.user_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CategoriesModal ─────────────────────────────────────────────────────────
function CategoriesModal({ open, onClose, categories, onChanged }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('alimento');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await api.post('/categories', { name: name.trim(), type });
      setName('');
      setType('alimento');
      onChanged();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar categoría? Los productos asociados quedarán sin categoría.')) return;
    await api.post('/categories/delete', { id });
    onChanged();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-primary-100">
          <h3 className="text-lg font-bold">Gestionar Categorías</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          <form onSubmit={handleAdd} className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nueva categoría..."
              className="w-full px-4 py-2 rounded-xl border-2 border-primary-200 outline-none focus:border-brand text-sm"/>
            <div className="flex gap-2">
              <select 
                value={type} 
                onChange={e => setType(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-primary-200 outline-none focus:border-brand text-xs bg-white"
              >
                <option value="alimento">Alimento</option>
                <option value="bebida">Bebida</option>
              </select>
              <Button type="submit" variant="brand" size="sm" loading={saving}>Agregar</Button>
            </div>
          </form>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories.length === 0 && <p className="text-sm text-primary-400 text-center py-4">Sin categorías</p>}
            {categories.map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-2 bg-primary-50 rounded-xl">
                <span className="text-sm font-medium">{c.name}</span>
                <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BrandsModal ──────────────────────────────────────────────────────────────
function BrandsModal({ open, onClose, brands, onChanged }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await api.post('/brands', { name: name.trim() });
      setName('');
      onChanged();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar marca?')) return;
    await api.post('/brands/delete', { id });
    onChanged();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-primary-100">
          <h3 className="text-lg font-bold">Gestionar Marcas</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nueva marca..."
              className="flex-1 px-4 py-2 rounded-xl border-2 border-primary-200 outline-none focus:border-brand text-sm"/>
            <Button type="submit" variant="brand" size="sm" loading={saving}>Agregar</Button>
          </form>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {brands.length === 0 && <p className="text-sm text-primary-400 text-center py-4">Sin marcas</p>}
            {brands.map(b => (
              <div key={b.id} className="flex items-center justify-between px-4 py-2 bg-primary-50 rounded-xl">
                <span className="text-sm font-medium">{b.name}</span>
                <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── InventoryPage ────────────────────────────────────────────────────────────
const InventoryPage = () => {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands]         = useState([]);
  const [branches, setBranches]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  
  // Pagination & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct]     = useState(null);
  const [movementProduct, setMovementProduct]   = useState(null);
  const [kardexProduct, setKardexProduct]       = useState(null);
  const [showBrandsModal, setShowBrandsModal]         = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchLookups = async () => {
    setLoading(true);
    try {
      const [catRes, brandRes, branchRes] = await Promise.all([
        api.get('/categories'),
        api.get('/brands'),
        api.get('/branches'),
      ]);
      setCategories(catRes.data || []);
      setBrands(brandRes.data.brands || []);
      setBranches(branchRes.data.branches || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit,
        search: debouncedSearch,
        branch_id: filterBranch
      });
      const res = await api.get(`/products?${params.toString()}`);
      setProducts(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => { fetchLookups(); }, []);
  useEffect(() => { fetchProducts(); }, [page, limit, debouncedSearch, filterBranch]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar producto?')) return;
    await api.post('/products/delete', { id });
    fetchProducts();
  };

  const openEdit = async (product) => {
    try {
      const res = await api.get(`/products/show?id=${product.id}`);
      setEditingProduct(res.data.product);
    } catch {
      setEditingProduct(product);
    }
    setShowProductModal(true);
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <PageHeader
        title="Inventario"
        subtitle="Gestiona productos, marcas, stock y movimientos"
        action={
          <div className="flex gap-2">
            <Button id="open-categories-btn" variant="outline" size="sm" onClick={() => setShowCategoriesModal(true)}>Categorías</Button>
            <Button variant="outline" size="sm" onClick={() => setShowBrandsModal(true)}>Marcas</Button>
            <Button variant="brand" icon={Plus} onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>
              Nuevo Producto
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 items-end">
        <Input icon={Search} placeholder="Buscar por nombre, categoría o marca..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-sm"/>
        <div className="w-52">
          <Select label="Sucursal" value={filterBranch} 
            onChange={e => {
              setFilterBranch(e.target.value);
              setPage(1);
            }}
            options={[{value:'',label:'Todas'},...branches.map(b=>({value:b.id,label:b.name}))]}/>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand" size={40}/></div>
      ) : (
        <div className="relative">
          {productsLoading && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-3xl">
              <Loader2 className="animate-spin text-brand" size={32}/>
            </div>
          )}
          <DataTable
            columns={[
              { key: 'image', header: '', render: r => (
                r.image_path
                  ? <img src={getImageUrl(r.image_path)} alt={r.name} className="w-10 h-10 object-cover rounded-lg"/>
                  : <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"><Package size={18} className="text-primary-400"/></div>
              )},
              { key: 'name', header: 'Producto', render: r => (
                <div>
                  <p className="font-semibold text-primary-900">{r.name}</p>
                  <p className="text-xs text-primary-400">{r.brand_name || ''}</p>
                </div>
              )},
              { key: 'category_name', header: 'Categoría', render: r => <Badge variant="default">{r.category_name || '—'}</Badge> },
              { key: 'price', header: 'Precio', render: r => <span className="font-semibold text-success">${parseFloat(r.price||0).toFixed(2)}</span> },
              { key: 'stock', header: 'Stock', render: r => (
                r.manages_inventory == 1 ? (
                  <span className={`font-bold ${r.stock <= 0 ? 'text-red-500' : r.stock <= (r.min_stock||5) ? 'text-amber-500' : 'text-primary-700'}`}>
                    {r.stock} {r.unit}
                  </span>
                ) : (
                  <span className="text-primary-400 font-medium">Ilimitado</span>
                )
              )},
              { key: 'status', header: 'Estado', render: r => (
                r.manages_inventory == 1 ? (
                  r.stock <= 0
                    ? <Badge variant="danger" dot dotColor="bg-red-500">Agotado</Badge>
                    : r.stock <= (r.min_stock||5)
                      ? <Badge variant="warning" dot dotColor="bg-amber-500">Stock Bajo</Badge>
                      : <Badge variant="success" dot dotColor="bg-green-500">Disponible</Badge>
                ) : (
                  <Badge variant="default" dot dotColor="bg-primary-400">N/A</Badge>
                )
              )},
              { key: 'actions', header: 'Acciones', cellClass: 'text-right', render: r => (
                <ActionMenu product={r} openEdit={openEdit} setMovementProduct={setMovementProduct} setKardexProduct={setKardexProduct} handleDelete={handleDelete} />
              )},
            ]}
            data={products}
            pagination={{
              current: page,
              total: total,
              pageSize: limit,
              onChange: setPage
            }}
            empty={{ title: 'Sin productos', description: 'No se encontraron productos.', icon: Package }}
          />
        </div>
      )}

      {/* Summary - Simplified for paginated view */}
      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="card p-5">
            <p className="text-sm text-primary-500 mb-1">Total Registros</p>
            <p className="text-2xl font-bold text-primary-900">{total}</p>
          </div>
          <div className="card p-5 opacity-50">
            <p className="text-sm text-primary-500 mb-1">Valor Inventario (Página)</p>
            <p className="text-2xl font-bold text-primary-900">
              ${products.reduce((a,p) => a + (parseFloat(p.price||0) * (p.stock||0)), 0).toFixed(2)}
            </p>
          </div>
          <div className="card p-5 opacity-50">
            <p className="text-sm text-primary-500 mb-1">Agotados (Página)</p>
            <p className="text-2xl font-bold text-danger">{products.filter(p=>(p.stock||0)===0).length}</p>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProductModal
        open={showProductModal}
        onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
        product={editingProduct}
        categories={categories}
        brands={brands}
        branches={branches}
        onSaved={fetchProducts}
      />
      <MovementModal
        open={!!movementProduct}
        onClose={() => setMovementProduct(null)}
        product={movementProduct}
        branches={branches}
        onSaved={fetchProducts}
      />
      <KardexModal
        open={!!kardexProduct}
        onClose={() => setKardexProduct(null)}
        product={kardexProduct}
      />
      <BrandsModal
        open={showBrandsModal}
        onClose={() => setShowBrandsModal(false)}
        brands={brands}
        onChanged={() => api.get('/brands').then(r => setBrands(r.data.brands || []))}
      />
      <CategoriesModal
        open={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        categories={categories}
        onChanged={() => api.get('/categories').then(r => setCategories(r.data || []))}
      />
    </div>
  );
};

export default InventoryPage;
