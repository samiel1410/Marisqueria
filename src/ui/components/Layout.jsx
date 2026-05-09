import React, { useMemo, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './Toast';
import {
  LayoutDashboard, Package, ListOrdered, LogOut,
  Wallet, GitBranch, Users, UserPlus, Table2, UtensilsCrossed,
  ChevronDown, ChevronRight, Tag, Award, CreditCard, Printer, Calendar, FileBarChart,
  ShoppingCart, ChefHat
} from 'lucide-react';
import { clearSession } from '../../infrastructure/api';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  // Keep inventory submenu open if we're on any /inventory route
  const [inventoryOpen, setInventoryOpen] = useState(
    () => location.pathname.startsWith('/inventory')
  );

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const linkClass = (path) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 text-sm ${
      isActive(path)
        ? 'bg-primary-900 text-white shadow-lg shadow-primary-900/20 font-semibold'
        : 'text-primary-600 hover:bg-primary-100 hover:text-primary-900 font-medium'
    }`;

  const subLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
      location.pathname === path
        ? 'bg-brand/10 text-brand font-semibold'
        : 'text-primary-500 hover:bg-primary-100 hover:text-primary-800 font-medium'
    }`;

  return (
    <div className="flex min-h-screen bg-primary-50">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen py-8 px-4 flex flex-col border-r border-primary-200 bg-white sticky top-0 h-screen overflow-y-auto">

        {/* Logo */}
        <div className="mb-8 px-2 flex items-center gap-3">
          <div className="p-2 bg-brand/10 rounded-xl">
            <UtensilsCrossed size={22} className="text-brand" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-primary-900 leading-tight">Krustacio Kascarudo</h2>
            <span className="text-brand font-bold text-xs tracking-widest uppercase">POS</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1">

          <Link to="/dashboard" className={linkClass('/dashboard')}>
            <LayoutDashboard size={18} /> Dashboard
          </Link>

          {/* Inventario con submenú */}
          <div>
            <button
              onClick={() => setInventoryOpen(o => !o)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 text-sm font-medium ${
                location.pathname.startsWith('/inventory')
                  ? 'bg-primary-900 text-white shadow-lg shadow-primary-900/20 font-semibold'
                  : 'text-primary-600 hover:bg-primary-100 hover:text-primary-900'
              }`}
            >
              <Package size={18} />
              <span className="flex-1 text-left">Inventario</span>
              {inventoryOpen
                ? <ChevronDown size={15} />
                : <ChevronRight size={15} />
              }
            </button>

            {inventoryOpen && (
              <div className="ml-6 mt-1 flex flex-col gap-0.5 border-l-2 border-primary-100 pl-3">
                <Link to="/inventory" className={subLinkClass('/inventory')}>
                  <Package size={15} /> Productos
                </Link>
                <Link to="/inventory/categories" className={subLinkClass('/inventory/categories')}>
                  <Tag size={15} /> Categorías
                </Link>
                <Link to="/inventory/brands" className={subLinkClass('/inventory/brands')}>
                  <Award size={15} /> Marcas
                </Link>
                <Link to="/inventory/report" className={subLinkClass('/inventory/report')}>
                  <FileBarChart size={15} /> Reporte de Inventario
                </Link>
                <Link to="/planning" className={subLinkClass('/planning')}>
                  <Calendar size={15} /> Planeación Semanal
                </Link>
              </div>
            )}
          </div>

          <Link to="/pos" className={linkClass('/pos')}>
            <ShoppingCart size={18} /> Punto de Venta
          </Link>

          <Link to="/orders" className={linkClass('/orders')}>
            <ListOrdered size={18} /> Órdenes Activas
          </Link>

          <Link to="/kitchen" target="_blank" className={linkClass('/kitchen')}>
            <ChefHat size={18} /> Pantalla Cocina
          </Link>

          <Link to="/cashier" className={linkClass('/cashier')}>
            <Wallet size={18}/> Caja y Ventas
          </Link>

          <Link to="/customers" className={linkClass('/customers')}>
            <UserPlus size={18} /> Clientes
          </Link>

          <Link to="/printers" className={linkClass('/printers')}>
            <Printer size={18} /> Impresoras
          </Link>

          {isAdmin && (
            <>
              <div className="my-2 border-t border-primary-100" />
              <p className="px-4 text-xs font-bold text-primary-300 uppercase tracking-widest mb-1">Administración</p>
              <Link to="/tables" className={linkClass('/tables')}>
                <Table2 size={18} /> Mesas
              </Link>
              <Link to="/branches" className={linkClass('/branches')}>
                <GitBranch size={18} /> Sucursales
              </Link>
              <Link to="/users" className={linkClass('/users')}>
                <Users size={18} /> Usuarios
              </Link>
              <Link to="/bank-accounts" className={linkClass('/bank-accounts')}>
                <CreditCard size={18} /> Cuentas de Banco
              </Link>
            </>
          )}
        </nav>

        {/* Notifications + logout */}
        <div className="mt-4 pt-4 border-t border-primary-100 flex flex-col gap-2">
          {Notification.permission !== 'granted' && (
            <button
              onClick={() => {
                Notification.requestPermission().then(permission => {
                  if (permission === 'granted') {
                    import('../../infrastructure/firebase').then(m => m.requestForToken());
                  }
                });
              }}
              className="flex items-center gap-3 px-4 py-2 rounded-2xl text-brand font-semibold hover:bg-brand/5 transition-colors w-full text-sm"
            >
              <Award size={18} />
              Activar Avisos
            </button>
          )}

          {currentUser && (
            <div className="px-4 mb-1">
              <p className="text-xs font-semibold text-primary-900 truncate">{currentUser.username}</p>
              <p className="text-xs text-primary-400 capitalize">{currentUser.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-red-500 font-semibold hover:bg-red-50 transition-colors w-full text-sm"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="w-full">
          <ToastProvider>
            <Outlet />
          </ToastProvider>
        </div>
      </main>
    </div>
  );
};

export default Layout;
