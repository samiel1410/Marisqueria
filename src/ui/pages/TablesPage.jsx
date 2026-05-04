import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../../infrastructure/api';
import { Plus, Save, X, Pencil, Trash2, UtensilsCrossed, Fish } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const CELL  = 80;   // px per size unit
const GRID  = 20;   // snap grid
const PAD   = 28;   // space for chairs around table

const STATUS = {
  disponible: { 
    bg: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
    border: '#16a34a', 
    text: '#fff', 
    label: 'Disponible',
    glow: 'rgba(34, 197, 94, 0.4)'
  },
  ocupada: { 
    bg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
    border: '#ea580c', 
    text: '#fff', 
    label: 'Ocupada',
    glow: 'rgba(249, 115, 22, 0.4)'
  },
  reservada: { 
    bg: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', 
    border: '#7c3aed', 
    text: '#fff', 
    label: 'Reservada',
    glow: 'rgba(167, 139, 250, 0.4)'
  },
};

const snap = (v) => Math.round(v / GRID) * GRID;

// ─── Chair dots around a table ────────────────────────────────────────────────
function ChairDots({ shape, w, h, seats }) {
  const chairStyle = {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 4,
    background: '#fff',
    border: '2px solid #cbd5e1',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
  };

  if (shape === 'circle') {
    const r = Math.min(w, h) / 2;
    return Array.from({ length: seats }).map((_, i) => {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      const dist  = r + 16;
      const cx    = w / 2 + dist * Math.cos(angle) - 7;
      const cy    = h / 2 + dist * Math.sin(angle) - 7;
      return (
        <div key={i} style={{
          ...chairStyle,
          left: cx, top: cy,
          borderRadius: '50%',
        }}/>
      );
    });
  }

  const cols = Math.max(1, Math.round(w / CELL));
  const rows = Math.max(1, Math.round(h / CELL));
  const chairs = [];

  for (let i = 0; i < cols; i++) {
    const x = (i + 0.5) * (w / cols) - 7;
    chairs.push(
      <div key={`t${i}`} style={{ ...chairStyle, left:x, top:-18 }}/>,
      <div key={`b${i}`} style={{ ...chairStyle, left:x, top:h+4 }}/>,
    );
  }
  for (let i = 0; i < rows; i++) {
    const y = (i + 0.5) * (h / rows) - 7;
    chairs.push(
      <div key={`l${i}`} style={{ ...chairStyle, left:-18, top:y }}/>,
      <div key={`r${i}`} style={{ ...chairStyle, left:w+4,  top:y }}/>,
    );
  }
  return chairs;
}

// ─── Single table card ────────────────────────────────────────────────────────
function TableCard({ table, selected, editMode, onPointerDown, onClick, onEdit, onDelete }) {
  const w = Math.max(CELL, table.width  * CELL);
  const h = Math.max(CELL, table.height * CELL);
  const c = STATUS[table.status] || STATUS.disponible;
  const isCircle = table.shape === 'circle';

  return (
    <div
      className={`transition-all duration-300 ${editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:scale-105'}`}
      style={{
        position: 'absolute',
        left: table.pos_x + PAD,
        top:  table.pos_y + PAD,
        width: w + PAD * 2,
        height: h + PAD * 2,
        userSelect: 'none',
        touchAction: 'none',
        zIndex: selected ? 10 : 1,
      }}
      onPointerDown={editMode ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); onPointerDown(e, table); } : undefined}
      onClick={(e) => { e.stopPropagation(); onClick(table); }}
    >
      {/* Chairs */}
      <div style={{ position:'absolute', left:PAD, top:PAD, width:w, height:h }}>
        <ChairDots shape={table.shape} w={w} h={h} seats={table.seats || 4}/>
      </div>

      {/* Table body */}
      <div 
        className="glass border-2"
        style={{
          position: 'absolute',
          left: PAD, top: PAD, width: w, height: h,
          background: c.bg,
          borderColor: selected ? '#fff' : 'transparent',
          borderRadius: isCircle ? '50%' : table.shape === 'rectangle' ? 12 : 16,
          boxShadow: selected
            ? `0 0 20px ${c.glow}, 0 0 0 4px rgba(255,255,255,0.3)`
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Shine effect */}
        <div style={{
          position: 'absolute', top: '10%', left: '10%', width: '30%', height: '20%',
          background: 'rgba(255,255,255,0.2)', borderRadius: '50%', filter: 'blur(5px)',
          transform: 'rotate(-45deg)'
        }} />

        <span style={{ color: c.text, fontSize: w > 100 ? 28 : 22, fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
          {table.number}
        </span>
        <div style={{ 
          background: 'rgba(0,0,0,0.1)', 
          padding: '2px 8px', 
          borderRadius: '20px', 
          marginTop: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          <span style={{ color: c.text, fontSize: 10, fontWeight: 600 }}>
            {table.seats || 4}p
          </span>
        </div>
      </div>

      {/* Edit / Delete buttons when selected in edit mode */}
      {editMode && selected && (
        <div className="animate-scale-in" style={{ position: 'absolute', right: 0, top: 0, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 20 }}>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(table); }}
            className="w-10 h-10 rounded-full bg-white text-blue-600 shadow-xl border border-blue-100 flex items-center justify-center hover:bg-blue-50 transition-colors"
            title="Editar"
          >
            <Pencil size={18} />
          </button>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(table.id); }}
            className="w-10 h-10 rounded-full bg-white text-red-600 shadow-xl border border-red-100 flex items-center justify-center hover:bg-red-50 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Table Modal (create / edit) ──────────────────────────────────────────────
function TableModal({ open, onClose, onSaved, editing }) {
  const [form, setForm] = useState({ number:'', shape:'square', seats:4, width:1, height:1 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing
      ? { number: editing.number, shape: editing.shape||'square', seats: editing.seats||4, width: editing.width||1, height: editing.height||1 }
      : { number:'', shape:'square', seats:4, width:1, height:1 }
    );
  }, [open, editing]);

  const setShape = (s) => setForm(f => ({ ... f, shape: s, height: s === 'circle' ? f.width : f.height }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const h = form.shape === 'circle' ? form.width : form.height;
      if (editing) {
        await api.post('/tables/update', { positions: [{ id: editing.id, pos_x: editing.pos_x, pos_y: editing.pos_y, width: form.width, height: h, shape: form.shape, seats: form.seats }] });
      } else {
        await api.post('/tables', { number: form.number, shape: form.shape, seats: form.seats, width: form.width, height: h, pos_x: 40, pos_y: 40 });
      }
      onSaved(); onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (!open) return null;

  const pw = Math.max(CELL, form.width * CELL) * 0.55;
  const ph = Math.max(CELL, (form.shape === 'circle' ? form.width : form.height) * CELL) * 0.55;
  const c  = STATUS.disponible;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="flex justify-between items-center p-6 border-b border-primary-100 bg-primary-50/50">
          <h3 className="text-xl font-bold text-primary-900">{editing ? 'Editar Mesa' : 'Configurar Nueva Mesa'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Preview Section */}
          <div className="relative flex justify-center items-center bg-primary-900 rounded-2xl py-8 overflow-hidden" style={{ 
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }}>
            <div style={{ position:'relative', width: pw + PAD*2, height: ph + PAD*2 }}>
              <div style={{ position:'absolute', left:PAD, top:PAD, width:pw, height:ph }}>
                <ChairDots shape={form.shape} w={pw} h={ph} seats={form.seats}/>
              </div>
              <div style={{
                position:'absolute', left:PAD, top:PAD, width:pw, height:ph,
                background: c.bg, border:`2px solid rgba(255,255,255,0.3)`,
                borderRadius: form.shape==='circle' ? '50%' : form.shape==='rectangle' ? 8 : 12,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
              }}>
                <span style={{ color:'#fff', fontSize:18, fontWeight:800 }}>{form.number || '?'}</span>
              </div>
            </div>
            <div className="absolute bottom-3 right-4">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Vista Previa</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {!editing && (
              <div className="col-span-2">
                <label className="label">Número de Mesa</label>
                <input type="number" min="1" required value={form.number}
                  onChange={e => setForm(f=>({...f,number:e.target.value}))}
                  className="input" placeholder="Ej: 15"/>
              </div>
            )}

            <div className="col-span-2">
              <label className="label">Forma de la Mesa</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v:'square',    label:'Cuadrada',    icon: <div className="w-5 h-5 bg-current rounded-sm"/> },
                  { v:'rectangle', label:'Rectangular', icon: <div className="w-7 h-4 bg-current rounded-sm"/> },
                  { v:'circle',    label:'Circular',    icon: <div className="w-5 h-5 bg-current rounded-full"/> },
                ].map(s => (
                  <button key={s.v} type="button" onClick={() => setShape(s.v)}
                    className={`flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all duration-300 ${
                      form.shape===s.v ? 'border-brand bg-brand/5 text-brand shadow-sm' : 'border-primary-100 text-primary-400 hover:border-primary-200'
                    }`}>
                    {s.icon}
                    <span className="text-[11px] font-bold uppercase tracking-wider">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">{form.shape==='circle' ? 'Diámetro' : 'Ancho'}</label>
              <select value={form.width} onChange={e=>setForm(f=>({...f,width:Number(e.target.value)}))} className="input">
                <option value={1}>Pequeño</option>
                <option value={2}>Mediano</option>
                <option value={3}>Grande</option>
              </select>
            </div>

            {form.shape !== 'circle' && (
              <div>
                <label className="label">Largo</label>
                <select value={form.height} onChange={e=>setForm(f=>({...f,height:Number(e.target.value)}))} className="input">
                  <option value={1}>Estándar</option>
                  <option value={2}>Alargado</option>
                </select>
              </div>
            )}

            <div className="col-span-2">
              <div className="flex justify-between items-end mb-2">
                <label className="label mb-0">Capacidad de Personas</label>
                <span className="text-xl font-black text-brand">{form.seats}</span>
              </div>
              <input type="range" min={1} max={12} value={form.seats}
                onChange={e=>setForm(f=>({...f,seats:Number(e.target.value)}))}
                className="w-full h-2 bg-primary-100 rounded-lg appearance-none cursor-pointer accent-brand"/>
              <div className="flex justify-between text-[10px] font-bold text-primary-300 mt-2 px-1">
                <span>1 PERS.</span><span>6 PERS.</span><span>12 PERS.</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-brand flex-1 shadow-lg">
              {saving ? 'Guardando...' : (editing ? 'Guardar Cambios' : 'Crear Mesa')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const FLOOR_W = 1000;
const FLOOR_H = 600;

export default function TablesPage() {
  const [tables, setTables]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editMode, setEditMode]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [scale, setScale]         = useState(1);

  const fetchOrderData = async (tableId) => {
    setActiveOrder(null);
    setLoadingOrder(true);
    try {
      const res = await api.get(`/orders/table?table_id=${tableId}`);
      if (res.data && res.data.order) {
        setActiveOrder(res.data.order);
      }
    } catch (err) {
      console.error('Error fetching order:', err);
    } finally {
      setLoadingOrder(false);
    }
  };

  const wrapRef  = useRef(null);
  const floorRef = useRef(null);
  const dragRef  = useRef({ id: null, ox: 0, oy: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const res  = await api.get('/tables');
      const data = Array.isArray(res.data) ? res.data : (res.data.tables || []);
      setTables(data.map(t => ({
        ...t,
        pos_x:  Number(t.pos_x)  || 0,
        pos_y:  Number(t.pos_y)  || 0,
        width:  Number(t.width)  || 1,
        height: Number(t.height) || 1,
        seats:  Number(t.seats)  || 4,
        shape:  t.shape || 'square',
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Compute scale so the floor fits the container
  useEffect(() => {
    const update = () => {
      if (wrapRef.current) {
        setScale(wrapRef.current.clientWidth / FLOOR_W);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Pointer drag ──────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e, table) => {
    if (!editMode) return;
    dragRef.current = {
      id: table.id,
      ox: e.clientX / scale - table.pos_x,
      oy: e.clientY / scale - table.pos_y,
    };
    setSelected(table.id);
  }, [editMode, scale]);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.id || !editMode) return;
    const rawX = e.clientX / scale - dragRef.current.ox;
    const rawY = e.clientY / scale - dragRef.current.oy;
    const x = Math.max(0, Math.min(FLOOR_W - 100, snap(rawX)));
    const y = Math.max(0, Math.min(FLOOR_H - 100, snap(rawY)));
    setTables(prev => prev.map(t =>
      t.id === dragRef.current.id ? { ...t, pos_x: x, pos_y: y } : t
    ));
  }, [editMode, scale]);

  const onPointerUp = useCallback(() => {
    dragRef.current = { id: null, ox: 0, oy: 0 };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar mesa?')) return;
    await api.post('/tables/delete', { id });
    setSelected(null);
    load();
  };

  const saveLayout = async () => {
    setSaving(true);
    try {
      const positions = tables.map(t => ({
        id: t.id, pos_x: t.pos_x, pos_y: t.pos_y,
        width: t.width, height: t.height, shape: t.shape, seats: t.seats,
      }));
      await api.post('/tables/update', { positions });
      setEditMode(false);
      setSelected(null);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const counts = {
    disponible: tables.filter(t => t.status === 'disponible').length,
    ocupada:    tables.filter(t => t.status === 'ocupada').length,
    reservada:  tables.filter(t => t.status === 'reservada').length,
  };

  return (
    <div className="animate-fade-in p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-black text-primary-900 tracking-tight flex items-center gap-3">
            Plano de <span className="text-brand">Mesas</span>
          </h1>
          <p className="text-primary-500 font-medium mt-1 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-brand animate-pulse"/>
            {tables.length} mesas configuradas · {tables.reduce((a,t) => a + (t.seats||4), 0)} personas de capacidad
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-soft border border-primary-100">
          {editMode ? (
            <>
              <button onClick={() => { setEditMode(false); setSelected(null); load(); }}
                className="btn btn-ghost px-4 py-2">
                Cancelar
              </button>
              <button onClick={saveLayout} disabled={saving}
                className="btn btn-brand px-6 py-2 shadow-brand-light">
                <Save size={18}/> {saving ? 'Guardando...' : 'Guardar Layout'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditingTable(null); setModalOpen(true); }}
                className="btn btn-outline px-4 py-2">
                <Plus size={18}/> Nueva Mesa
              </button>
              <button onClick={() => setEditMode(true)}
                className="btn btn-primary px-6 py-2 shadow-lg">
                <Pencil size={18}/> Editar Layout
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar / Legend */}
      <div className="glass rounded-2xl p-3 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 px-2">
          {Object.entries(STATUS).map(([key, c]) => (
            <div key={key} className="flex items-center gap-2 group cursor-default">
              <div className="relative">
                <span className="absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: c.glow }}/>
                <span className="relative block w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ background: c.bg }}/>
              </div>
              <div className="flex flex-col -space-y-1">
                <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">{c.label}</span>
                <span className="text-sm font-black text-primary-900">{counts[key]||0}</span>
              </div>
            </div>
          ))}
        </div>
        
        {editMode && (
          <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100 animate-pulse-soft">
            <span className="text-lg">📍</span>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
              Modo Edición: Arrastra las mesas para organizar el salón
            </span>
          </div>
        )}
      </div>

      {/* Floor wrapper */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border-2 border-dashed border-primary-200 text-primary-400">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"/>
          <span className="font-bold uppercase tracking-widest text-xs">Cargando Salón...</span>
        </div>
      ) : (
        <div
          ref={wrapRef}
          className="relative rounded-[2rem] shadow-2xl overflow-hidden border-[12px] border-primary-900"
          style={{
            width: '100%',
            height: FLOOR_H * scale,
            background: '#1a1a1a', // Dark border depth
          }}
          onPointerMove={editMode ? onPointerMove : undefined}
          onPointerUp={editMode ? onPointerUp : undefined}
          onPointerLeave={editMode ? onPointerUp : undefined}
          onClick={() => setSelected(null)}
        >
          {/* Scaled floor canvas */}
          <div
            ref={floorRef}
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: FLOOR_W,
              height: FLOOR_H,
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
              background: `
                radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 100%),
                repeating-linear-gradient(90deg, #2c1810 0px, #2c1810 78px, #3d2419 80px),
                repeating-linear-gradient(180deg, transparent 0px, transparent 19px, rgba(0,0,0,0.1) 20px)
              `,
              boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)'
            }}
          >
            {/* Grid dots in edit mode */}
            {editMode && (
              <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
                {Array.from({ length: Math.floor(FLOOR_W / GRID) + 1 }).map((_, xi) =>
                  Array.from({ length: Math.floor(FLOOR_H / GRID) + 1 }).map((_, yi) => (
                    <circle key={`${xi}-${yi}`} cx={xi*GRID} cy={yi*GRID} r={1} fill="rgba(255,255,255,0.1)"/>
                  ))
                )}
              </svg>
            )}

            {tables.map(t => (
              <TableCard
                key={t.id}
                table={t}
                selected={selected === t.id}
                editMode={editMode}
                onPointerDown={onPointerDown}
                onClick={(t) => {
                  setSelected(t.id);
                  if (!editMode) {
                    if (t.status === 'ocupada') {
                      fetchOrderData(t.id);
                    } else if (t.status === 'disponible') {
                      window.location.href = `/pos?table_id=${t.id}`;
                    }
                  } else {
                    setActiveOrder(null);
                  }
                }}
                onEdit={(t) => { setEditingTable(t); setModalOpen(true); }}
                onDelete={handleDelete}
              />
            ))}

            {tables.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                <div className="w-24 h-24 border-4 border-current border-dashed rounded-3xl mb-6 opacity-20"/>
                <span className="text-2xl font-black uppercase tracking-widest">Salón Vacío</span>
                <p className="text-sm font-medium mt-2">Comienza añadiendo tu primera mesa</p>
              </div>
            )}
          </div>
          
          {/* Inner Shadow Overlay for depth */}
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.4)]"/>
        </div>
      )}

      {/* Order Drawer */}
      {(activeOrder || loadingOrder) && (
        <div className="fixed top-0 right-0 h-screen w-full md:w-96 bg-white shadow-2xl z-[60] animate-slide-in-right overflow-hidden flex flex-col">
          <div className="p-6 border-b border-primary-100 flex justify-between items-center bg-primary-50/50">
            <div>
              <h2 className="text-xl font-black text-primary-900">Mesa {tables.find(t => t.id === selected)?.number}</h2>
              <p className="text-xs font-bold text-brand uppercase tracking-widest">Detalle de Orden Activa</p>
            </div>
            <button 
              onClick={() => setActiveOrder(null)}
              className="p-2 hover:bg-white rounded-full shadow-sm transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {loadingOrder ? (
              <div className="flex flex-col items-center justify-center h-64 text-primary-400">
                <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"/>
                <span className="text-xs font-bold uppercase tracking-widest">Consultando Pedido...</span>
              </div>
            ) : activeOrder ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center p-4 bg-brand/5 rounded-2xl border border-brand/10">
                  <div>
                    <p className="text-[10px] font-bold text-primary-400 uppercase">Orden ID</p>
                    <p className="font-bold text-primary-900">#{activeOrder.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-primary-400 uppercase">Estado</p>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-wider">
                      {activeOrder.status}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-primary-900 mb-4 flex items-center gap-2">
                    <UtensilsCrossed size={16} className="text-brand" />
                    Productos Consumidos
                  </h3>
                  <div className="space-y-3">
                    {activeOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start group">
                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary-100 rounded-lg text-xs font-bold text-primary-600">
                            {item.quantity}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-primary-900 leading-tight">{item.product_name}</p>
                            <p className="text-[10px] font-medium text-primary-400">${Number(item.price).toFixed(2)} c/u</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-primary-900">
                          ${(item.quantity * item.price).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-primary-100">
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-primary-900">Total a Pagar</p>
                    <p className="text-2xl font-black text-brand">${Number(activeOrder.total).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center opacity-40">
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                  <Fish size={32} />
                </div>
                <p className="text-sm font-bold">No se encontró la orden.</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-primary-50/50 border-t border-primary-100">
            <button 
              onClick={() => window.location.href = `/orders/${activeOrder?.id}`}
              className="btn btn-brand w-full shadow-lg shadow-brand/20"
              disabled={!activeOrder}
            >
              Ir al Detalle de Orden
            </button>
          </div>
        </div>
      )}

      {/* Overlay backdrop when drawer is open */}
      {(activeOrder || loadingOrder) && (
        <div 
          className="fixed inset-0 bg-primary-900/20 backdrop-blur-[2px] z-[55] animate-fade-in"
          onClick={() => setActiveOrder(null)}
        />
      )}

      <TableModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTable(null); }}
        onSaved={load}
        editing={editingTable}
      />
    </div>
  );
}
