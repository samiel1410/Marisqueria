import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Printer, Pencil, Trash2, Eye, LayoutDashboard } from 'lucide-react';

export default function ActionMenu({ register, onSelect, onView, onEdit, onEditRegister, onDelete, onPrint }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const btnRef = useRef(null);

  const handleOpen = (e) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    const rect = btnRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 6, left: rect.right - 192 });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const isOpen = register.open_sessions > 0;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-2.5 text-primary-300 hover:text-brand hover:bg-brand/10 rounded-2xl transition-all active:scale-95"
      >
        <MoreVertical size={20} />
      </button>

      {open && (
        <div
          style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }}
          className="w-48 bg-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-primary-100 p-2"
        >
          {/* Opción principal dependiendo del estado */}

          {/* Siempre disponible: Ver detalles */}
          <button
            onClick={() => { onView(register); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary-50 text-primary-700 transition-all"
          >
            <Eye size={16} className="shrink-0 text-primary-400" />
            <span className="text-[11px] font-black uppercase tracking-wider">Ver Caja</span>
          </button>

          <div className="h-px bg-primary-50 my-1 mx-3" />

          <button
            onClick={() => { onEdit(register); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary-50 text-primary-700 transition-all"
          >
            <Pencil size={16} className="shrink-0 text-primary-400" />
            <span className="text-[11px] font-black uppercase tracking-wider">Editar Desglose</span>
          </button>

          <button
            onClick={() => { onPrint(register.last_session_id); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary-50 text-primary-700 transition-all"
          >
            <Printer size={16} className="shrink-0 text-primary-400" />
            <span className="text-[11px] font-black uppercase tracking-wider">Imprimir Reporte</span>
          </button>

          <div className="h-px bg-primary-100 my-1 mx-3" />

          <button
            onClick={() => { onDelete(register); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 transition-all"
          >
            <Trash2 size={16} className="shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-wider">Eliminar Caja</span>
          </button>
        </div>
      )}
    </div>
  );
}
