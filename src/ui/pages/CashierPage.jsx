import React, { useState, useEffect } from 'react';
import api from '../../infrastructure/api';
import { DollarSign, History, Loader2, Plus, Wallet, Pencil, Printer, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import DataTable from '../components/DataTable';
import { Badge } from '../components/Badge';

import {
  BreakdownEditModal,
  PrintModal,
  RegisterModal,
  OpenCashForm,
  RegisterDetail,
  ActionMenu,
} from './Cashier';

export default function CashierPage() {
  const [registers, setRegisters]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedReg, setSelectedReg] = useState(null);
  const [cashStatus, setCashStatus]   = useState(null);
  const [movements, setMovements]     = useState([]);
  const [history, setHistory]         = useState([]);

  // Modales
  const [showRegModal, setShowRegModal]         = useState(false);
  const [editingReg, setEditingReg]             = useState(null);
  const [showPrintModal, setShowPrintModal]     = useState(false);
  const [printSessionId, setPrintSessionId]     = useState(null);
  const [showEditBreakdown, setShowEditBreakdown] = useState(false);
  const [editSession, setEditSession]           = useState(null);
  const [deletingReg, setDeletingReg]           = useState(null);

  useEffect(() => { loadRegisters(); }, []);

  const loadRegisters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cash-registers');
      setRegisters(res.data.registers || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSelectRegister = async (reg) => {
    setSelectedReg(reg);
    setLoading(true);
    try {
      const [sRes, mRes, hRes] = await Promise.all([
        api.get(`/cash/status?register_id=${reg.id}`),
        api.get(`/cash/movements?register_id=${reg.id}`),
        api.get(`/cash/history?register_id=${reg.id}`),
      ]);
      setCashStatus(sRes.data);
      setMovements(mRes.data.movements || []);
      setHistory(hRes.data.history || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleEditFromMenu = async (reg) => {
    setLoading(true);
    try {
      const res = await api.get(`/cash/history?register_id=${reg.id}&limit=1`);
      if (res.data.history?.length > 0) {
        setEditSession(res.data.history[0]);
        setShowEditBreakdown(true);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDeleteRegister = async () => {
    if (!deletingReg) return;
    try {
      await api.post('/cash-registers/delete', { id: deletingReg.id });
      loadRegisters();
      if (selectedReg?.id === deletingReg.id) setSelectedReg(null);
    } catch (err) { 
      console.error(err);
      const msg = err.response?.data?.error || 'No se pudo eliminar la caja';
      alert(msg); // O usar un componente de notificación si existe
    }
    finally { setDeletingReg(null); }
  };

  const openPrint = (id) => { setPrintSessionId(id); setShowPrintModal(true); };
  const openEditBreakdown = (sess) => { setEditSession(sess); setShowEditBreakdown(true); };

  // ── Columnas tabla principal ──────────────────────────────────────────────
  const registerColumns = [
    {
      key: 'name', header: 'Nombre',
      render: r => <span className="font-black text-primary-900">{r.name}</span>,
    },
    {
      key: 'branch_name', header: 'Sucursal',
      render: r => <span className="font-bold text-primary-400 uppercase text-[10px] tracking-widest">{r.branch_name}</span>,
    },
    {
      key: 'f_apertura', header: 'F. Apertura',
      render: r => {
        if (!r.last_opened_at) return <span className="text-xs text-primary-300">—</span>;
        const [date, time] = r.last_opened_at.split(' ');
        return (
          <div className="flex flex-col">
            <span className="text-xs font-black text-primary-600">{date}</span>
            <span className="text-[11px] text-primary-400 font-bold uppercase tracking-tighter">{time?.substring(0, 5)}</span>
          </div>
        );
      },
    },
    {
      key: 'm_apertura', header: 'M. Apertura',
      render: r => <span className="font-black text-primary-700 tabular-nums">${parseFloat(r.last_opening_balance || 0).toFixed(2)}</span>,
    },
    {
      key: 'f_cierre', header: 'F. Cierre',
      render: r => {
        if (!r.last_closed_at) return <span className="text-xs text-primary-300">—</span>;
        const [date, time] = r.last_closed_at.split(' ');
        return (
          <div className="flex flex-col">
            <span className="text-xs font-black text-primary-600">{date}</span>
            <span className="text-[11px] text-primary-400 font-bold uppercase tracking-tighter">{time?.substring(0, 5)}</span>
          </div>
        );
      },
    },
    {
      key: 'm_cierre', header: 'M. Cierre',
      render: r => <span className="font-black text-primary-700 tabular-nums">${parseFloat(r.last_closing_balance || 0).toFixed(2)}</span>,
    },
    {
      key: 'status', header: 'Estado',
      render: r => r.status === 'open'
        ? <Badge variant="success" className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-50 text-emerald-600 border-emerald-100">Abierta</Badge>
        : <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-primary-50 text-primary-400 border-primary-100">Cerrada</Badge>,
    },
    {
      key: 'balance', header: 'Balance',
      render: r => {
        if (r.status === 'open' || !r.last_closed_at) return <Badge variant="info" className="text-[10px] font-black uppercase px-2 py-0.5 opacity-60">Pendiente</Badge>;
        const diff = parseFloat(r.last_difference || 0);
        if (Math.abs(diff) < 0.01) return <Badge variant="success" className="text-[10px] font-black uppercase px-2 py-0.5">Cuadra</Badge>;
        return (
          <Badge variant={diff > 0 ? 'info' : 'danger'} className="text-[10px] font-black uppercase px-2 py-0.5">
            {diff > 0 ? 'Sobrante' : 'Faltante'} ${Math.abs(diff).toFixed(2)}
          </Badge>
        );
      },
    },
    {
      key: 'actions', header: '',
      render: r => (
        <div className="flex justify-end">
          <ActionMenu
            register={r}
            onSelect={handleSelectRegister}
            onEdit={handleEditFromMenu}
            onDelete={setDeletingReg}
            onPrint={openPrint}
          />
        </div>
      ),
    },
  ];

  // ── Columnas historial ────────────────────────────────────────────────────
  const historyColumns = [
    {
      key: 'id', header: 'ID',
      render: h => <span className="font-bold text-primary-400">#{h.id}</span>,
    },
    {
      key: 'user', header: 'Usuario',
      render: h => <span className="font-bold text-primary-900">{h.username}</span>,
    },
    {
      key: 'f_apertura', header: 'Apertura',
      render: h => {
        const [date, time] = (h.opened_at || '').split(' ');
        return (
          <div className="flex flex-col">
            <span className="text-xs font-black text-primary-600">{date}</span>
            <span className="text-[11px] text-primary-400 font-bold uppercase tracking-tighter">{time?.substring(0, 5)}</span>
          </div>
        );
      },
    },
    {
      key: 'm_apertura', header: 'M. Apertura',
      render: h => <span className="font-black text-primary-700 tabular-nums">${parseFloat(h.opening_balance || 0).toFixed(2)}</span>,
    },
    {
      key: 'f_cierre', header: 'Cierre',
      render: h => {
        if (!h.closed_at) return <Badge variant="success" className="text-[10px] font-black animate-pulse uppercase tracking-widest">En Curso</Badge>;
        const [date, time] = h.closed_at.split(' ');
        return (
          <div className="flex flex-col">
            <span className="text-xs font-black text-primary-600">{date}</span>
            <span className="text-[11px] text-primary-400 font-bold uppercase tracking-tighter">{time?.substring(0, 5)}</span>
          </div>
        );
      },
    },
    {
      key: 'm_cierre', header: 'M. Cierre',
      render: h => <span className="font-black text-primary-700 tabular-nums">${parseFloat(h.closing_balance || 0).toFixed(2)}</span>,
    },
    {
      key: 'balance', header: 'Balance',
      render: h => {
        if (!h.closed_at) return <Badge variant="info" className="text-[10px] font-black uppercase px-2 py-0.5 opacity-60">Pendiente</Badge>;
        const diff = parseFloat(h.difference || 0);
        if (Math.abs(diff) < 0.01) return <Badge variant="success" className="text-[10px] font-black uppercase px-2 py-0.5">Cuadra</Badge>;
        return (
          <Badge variant={diff > 0 ? 'info' : 'danger'} className="text-[10px] font-black uppercase px-2 py-0.5">
            {diff > 0 ? 'Sobrante' : 'Faltante'} ${Math.abs(diff).toFixed(2)}
          </Badge>
        );
      },
    },
    {
      key: 'actions', header: '',
      render: h => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEditBreakdown(h)} className="p-2 text-primary-300 hover:text-brand hover:bg-brand/10 rounded-xl transition-all" title="Editar">
            <Pencil size={16} />
          </button>
          <button onClick={() => openPrint(h.id)} className="p-2 text-primary-300 hover:text-brand hover:bg-brand/10 rounded-xl transition-all" title="Imprimir">
            <Printer size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (loading && registers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand" size={40} />
        <p className="text-primary-400 font-bold animate-pulse">Cargando sistema de caja...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-2">
      <PageHeader
        title="Gestión de Cajas"
        subtitle="Administra tus cajas registradoras, aperturas y cierres."
        icon={Wallet}
      >
        <Button variant="brand" icon={Plus} onClick={() => { setEditingReg(null); setShowRegModal(true); }}>
          Nueva Caja
        </Button>
      </PageHeader>

      {!selectedReg ? (
        /* ── Lista de cajas ─────────────────────────────────── */
        <div className="animate-in fade-in zoom-in duration-500">
          <DataTable columns={registerColumns} data={registers} />
          {registers.length === 0 && (
            <div className="mt-4 py-24 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-primary-100 shadow-sm">
              <div className="w-24 h-24 bg-primary-50 rounded-[2rem] flex items-center justify-center mb-6 text-primary-200">
                <DollarSign size={48} />
              </div>
              <h3 className="text-2xl font-black text-primary-900 mb-2">No hay cajas</h3>
              <p className="text-primary-400 font-bold mb-10">Comienza creando tu primera caja registradora.</p>
              <Button variant="brand" size="lg" icon={Plus} onClick={() => { setEditingReg(null); setShowRegModal(true); }}>Crear ahora</Button>
            </div>
          )}
        </div>
      ) : (
        /* ── Detalle de caja seleccionada ───────────────────── */
        <div className="space-y-10">
          {cashStatus?.status === 'open' ? (
            <RegisterDetail
              register={selectedReg}
              cashStatus={cashStatus}
              movements={movements}
              onClose={() => setSelectedReg(null)}
              onReload={() => handleSelectRegister(selectedReg)}
              onPrint={openPrint}
              onEditBreakdown={openEditBreakdown}
            />
          ) : (
            <div className="max-w-4xl mx-auto">
              <OpenCashForm
                register={selectedReg}
                onOpened={() => handleSelectRegister(selectedReg)}
                onBack={() => setSelectedReg(null)}
              />
            </div>
          )}

          {/* ── Historial ──────────────────────────────────── */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-white shadow-sm border border-primary-100 text-primary-400 rounded-2xl">
                <History size={20} />
              </div>
              <h3 className="text-lg font-black text-primary-900 uppercase tracking-wider">Historial de Sesiones</h3>
            </div>
            <DataTable columns={historyColumns} data={history} />
            {history.length === 0 && (
              <p className="text-center font-bold text-primary-300 py-10">No hay registros previos en esta caja.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Modales ─────────────────────────────────────────── */}
      <RegisterModal
        open={showRegModal}
        onClose={() => setShowRegModal(false)}
        editing={editingReg}
        onSaved={(newReg) => { loadRegisters(); if (newReg) handleSelectRegister(newReg); }}
      />

      <PrintModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        sessionId={printSessionId}
      />

      <BreakdownEditModal
        open={showEditBreakdown}
        onClose={() => setShowEditBreakdown(false)}
        session={editSession}
        onSaved={() => { if (selectedReg) handleSelectRegister(selectedReg); else loadRegisters(); }}
      />

      <ConfirmModal
        open={!!deletingReg}
        title="Eliminar Caja"
        message={`¿Estás seguro de eliminar "${deletingReg?.name}"? Esta acción no se puede deshacer.`}
        variant="danger"
        onConfirm={handleDeleteRegister}
        onClose={() => setDeletingReg(null)}
      />
    </div>
  );
}
