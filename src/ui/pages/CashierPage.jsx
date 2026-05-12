import React, { useState, useEffect } from 'react';
import api from '../../infrastructure/api';
import { DollarSign, History, Loader2, Plus, Wallet, Pencil, Printer, Lock } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import DataTable from '../components/DataTable';
import { Badge } from '../components/Badge';

import {
  BreakdownEditModal,
  PrintModal,
  OpenCashForm,
  RegisterDetail,
} from './Cashier';

export default function CashierPage() {
  const [loading, setLoading] = useState(true);
  const [cashStatus, setCashStatus] = useState(null);
  const [movements, setMovements] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Estado para ver una caja histórica específica
  const [viewingHistorical, setViewingHistorical] = useState(null);

  // Modales
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSessionId, setPrintSessionId] = useState(null);
  const [showEditBreakdown, setShowEditBreakdown] = useState(false);
  const [editSession, setEditSession] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Obtener estado actual de la sucursal (global)
      const sRes = await api.get('/cash/status');
      setCashStatus(sRes.data);

      if (sRes.data.status === 'open') {
        const mRes = await api.get(`/cash/movements?session_id=${sRes.data.session.id}`);
        setMovements(mRes.data.movements || []);
      }

      // Obtener historial global de la sucursal
      const hRes = await api.get('/cash/history');
      setHistory(hRes.data.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenHistorical = async (session) => {
    setLoading(true);
    try {
      const detailsRes = await api.get(`/cash/session-details?id=${session.id}`);
      setViewingHistorical({
        status: 'closed',
        session: detailsRes.data.session,
        current_sales: detailsRes.data.session.total_sales,
        movements_balance: 0,
        expected_balance: detailsRes.data.session.expected_balance
      });
      // Cargar movimientos de esa sesión específica
      const mRes = await api.get(`/cash/movements?session_id=${session.id}`);
      setMovements(mRes.data.movements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openPrint = (id) => {
    setPrintSessionId(id);
    setShowPrintModal(true);
  };

  const handleEditFromHistory = (session) => {
    setEditSession(session);
    setShowEditBreakdown(true);
  };

  // ── Columnas historial ────────────────────────────────────────────────────
  const historyColumns = [
    {
      key: 'name', header: 'Caja',
      render: h => <span className="font-black text-primary-900">{h.register_name || `Caja #${h.register_id}`}</span>,
    },
    {
      key: 'user', header: 'Responsable',
      render: h => <span className="font-bold text-primary-600 text-xs">{h.username}</span>,
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
        if (!h.closed_at) return <Badge variant="success" className="text-[10px] font-black animate-pulse uppercase tracking-widest">Abierta</Badge>;
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
        if (!h.closed_at) return <Badge variant="info" className="text-[10px] font-black uppercase px-2 py-0.5 opacity-60">En Curso</Badge>;
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
          <button onClick={() => handleOpenHistorical(h)} className="p-2 text-primary-300 hover:text-brand hover:bg-brand/10 rounded-xl transition-all" title="Ver Detalles">
            <Plus size={16} />
          </button>
          <button onClick={() => handleEditFromHistory(h)} className="p-2 text-primary-300 hover:text-brand hover:bg-brand/10 rounded-xl transition-all" title="Editar Desglose">
            <Pencil size={16} />
          </button>
          <button onClick={() => openPrint(h.id)} className="p-2 text-primary-300 hover:text-brand hover:bg-brand/10 rounded-xl transition-all" title="Imprimir">
            <Printer size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (loading && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand" size={40} />
        <p className="text-primary-400 font-bold animate-pulse">Cargando estado de caja...</p>
      </div>
    );
  }

  const activeCaja = viewingHistorical || (cashStatus?.status === 'open' ? cashStatus : null);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-2">
      <PageHeader
        title="Caja"
        subtitle="Control de ingresos, egresos y cierre diario."
        icon={Wallet}
      />

      {activeCaja ? (
        <div className="space-y-10">
          <RegisterDetail
            register={{ name: activeCaja.session.register_name || 'Caja' }}
            cashStatus={activeCaja}
            movements={movements}
            isViewing={!!viewingHistorical}
            onClose={() => {
              if (viewingHistorical) setViewingHistorical(null);
              loadData();
            }}
            onReload={loadData}
            onPrint={openPrint}
            onEditBreakdown={(sess) => { setEditSession(sess); setShowEditBreakdown(true); }}
          />

          {!viewingHistorical && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-white shadow-sm border border-primary-100 text-primary-400 rounded-2xl">
                  <History size={20} />
                </div>
                <h3 className="text-lg font-black text-primary-900 uppercase tracking-wider">Cajas Anteriores</h3>
              </div>
              <DataTable columns={historyColumns} data={history} />
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-primary-100 shadow-sm p-12 lg:p-24">
            <div className="w-24 h-24 bg-primary-50 rounded-[2rem] flex items-center justify-center mb-6 text-primary-200">
              <Lock size={48} />
            </div>
            <h3 className="text-2xl font-black text-primary-900 mb-2">Caja Cerrada</h3>
            <p className="text-primary-400 font-bold mb-10 text-center max-w-md">
              No hay una caja abierta actualmente en esta sucursal. Abre una nueva para comenzar a registrar ventas.
            </p>
            
            <div className="w-full max-w-4xl">
              <OpenCashForm
                onOpened={loadData}
                onBack={() => {}} // No necesario aquí
              />
            </div>
          </div>

          <div className="mt-12">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-white shadow-sm border border-primary-100 text-primary-400 rounded-2xl">
                  <History size={20} />
                </div>
                <h3 className="text-lg font-black text-primary-900 uppercase tracking-wider">Historial de Cajas</h3>
              </div>
              <DataTable columns={historyColumns} data={history} />
          </div>
        </div>
      )}

      <PrintModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        sessionId={printSessionId}
      />

      <BreakdownEditModal
        open={showEditBreakdown}
        onClose={() => setShowEditBreakdown(false)}
        session={editSession}
        onSaved={loadData}
      />
    </div>
  );
}
