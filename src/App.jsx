import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './ui/pages/LoginPage';
import DashboardPage from './ui/pages/DashboardPage';
import InventoryPage from './ui/pages/InventoryPage';
import OrdersPage from './ui/pages/OrdersPage';
import CashierPage from './ui/pages/CashierPage';
import POSPage from './ui/pages/POSPage';
import Layout from './ui/components/Layout';
import api, { isSessionValid, clearSession } from './infrastructure/api';
import { requestForToken, messaging } from './infrastructure/firebase';
import { onMessage } from 'firebase/messaging';
import { handleRemotePrint, initQZSecurity } from './infrastructure/PrinterService';
import './index.css';

// Initialize QZ Security early
initQZSecurity();

const BranchesPage       = React.lazy(() => import('./ui/pages/BranchesPage'));
const UsersPage          = React.lazy(() => import('./ui/pages/UsersPage'));
const TablesPage         = React.lazy(() => import('./ui/pages/TablesPage'));
const CategoriesPage     = React.lazy(() => import('./ui/pages/CategoriesPage'));
const BrandsPage         = React.lazy(() => import('./ui/pages/BrandsPage'));
const BankAccountsPage   = React.lazy(() => import('./ui/pages/BankAccountsPage'));
const PrinterSettingsPage = React.lazy(() => import('./ui/pages/PrinterSettingsPage'));
const WeeklyPlanningPage  = React.lazy(() => import('./ui/pages/WeeklyPlanningPage'));
const InventoryReportPage = React.lazy(() => import('./ui/pages/InventoryReportPage'));
const KitchenDisplayPage  = React.lazy(() => import('./ui/pages/KitchenDisplayPage'));
const CustomersPage       = React.lazy(() => import('./ui/pages/CustomersPage'));

const Lazy = ({ children }) => <React.Suspense fallback={<div className="p-8 text-primary-400">Cargando...</div>}>{children}</React.Suspense>;

// Checks token validity on mount and when the tab regains focus
const ProtectedRoute = ({ children }) => {
  const [valid, setValid] = useState(() => isSessionValid());

  useEffect(() => {
    const check = () => {
      if (!isSessionValid()) {
        clearSession();
        setValid(false);
      }
    };

    // Check immediately
    check();

    // Re-check every minute
    const interval = setInterval(check, 60 * 1000);

    // Re-check when tab becomes visible again (user returns to the tab)
    const handleVisibility = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', handleVisibility);

    // Re-check when window regains focus
    window.addEventListener('focus', check);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', check);
    };
  }, []);

  if (!valid) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  useEffect(() => {
    // Check permission and request token on mount if already granted
    const initNotifications = async () => {
      try {
        let permission = Notification.permission;
        if (permission === 'granted') {
          requestForToken();
        } else {
          console.warn("Notification permission not granted. Waiting for user to click 'Habilitar Alertas'.");
        }
      } catch (err) {
        console.error("Error checking notification permission:", err);
      }
    };

    initNotifications();

    // Channel for cross-tab communication
    const channel = new BroadcastChannel('fcm_updates');

    // Variable outside the listener to track recent prints
    const recentPrints = new Set();

    // Listen for foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      const { type, order_id, origin_host } = payload.data || {};

      console.log('======================================================');
      console.log('🔔 LLEGÓ NOTIFICACIÓN FCM A LA WEB (FOREGROUND):', payload);
      console.log('TIPO:', type);
      console.log('ORDER ID:', order_id);
      console.log('ORIGIN:', origin_host);
      console.log('======================================================');
      
      // Filter by origin_host to avoid cross-environment triggers (dev vs prod)
      if (origin_host && origin_host !== window.location.host) {
        console.warn(`[FCM] Ignorando mensaje de otro entorno (${origin_host}). Nosotros somos: ${window.location.host}`);
        return;
      }
      
      // Broadcast to other tabs
      channel.postMessage(payload);
      
      // Anti-rebote (Debounce) para evitar impresiones dobles del mismo tipo y ID en 10 segundos
      const printKey = `${payload?.data?.type}_${payload?.data?.order_id || payload?.data?.session_id}`;
      if (recentPrints.has(printKey)) {
        console.log('Ignorando petición de impresión duplicada:', printKey);
      } else {
        recentPrints.add(printKey);
        setTimeout(() => recentPrints.delete(printKey), 10000);

        // Handle automatic printing if it's a print request
        if (type === 'print_request' && order_id) {
          console.log('Triggering remote print for order:', order_id);
          handleRemotePrint(order_id);
        } else if (type === 'print_kitchen_request' && order_id) {
          console.log('Triggering remote kitchen print for order:', order_id);
          import('./infrastructure/PrinterService').then(({ handleRemoteKitchenPrint }) => {
            handleRemoteKitchenPrint(order_id);
          });
        } else if (type === 'print_cash_request' && payload?.data?.session_id) {
          import('./infrastructure/PrinterService').then(({ handleRemoteCashPrint }) => {
            handleRemoteCashPrint(payload.data.session_id);
          });
        } else if (type === 'print_inventory_request') {
          import('./infrastructure/PrinterService').then(({ handleRemoteInventoryPrint }) => {
            handleRemoteInventoryPrint(payload.data.filter, payload.data.branch_id);
          });
        }
      }

      // Show browser notification if there is a notification block
      if (Notification.permission === 'granted') {
        if (payload?.notification) {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
          });
        } else if (payload?.data && payload?.data?.type) {
          // Si es un data-only message, mostrar notificación manual amigable
          let title = "Nueva Notificación";
          let body = "Hay una nueva actualización en el sistema.";
          
          if (payload.data.type === 'print_kitchen_request') {
            title = "Imprimiendo Comanda";
            body = "Comanda de cocina enviada a la impresora.";
          } else if (payload.data.type === 'print_request') {
            title = "Imprimiendo Ticket";
            body = "Ticket de venta enviado a la impresora.";
          }
          new Notification(title, { body, icon: '/firebase-logo.png' });
        }
      }

      // Dispatch custom event for components to listen in THIS tab
      console.log('Dispatching fcm-message event to current window...');
      window.dispatchEvent(new CustomEvent('fcm-message', { detail: payload }));
    });

    // Listen for messages from OTHER tabs
    channel.onmessage = (event) => {
      console.log('%c FCM RECEIVED from another tab:', 'background: #ff8800; color: white; font-weight: bold;', event.data);
      window.dispatchEvent(new CustomEvent('fcm-message', { detail: event.data }));
    };

    return () => {
      unsubscribe();
      channel.close();
    };
  }, []);

  // Note: Polling removed to rely exclusively on FCM events as per user request

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/kitchen" element={<ProtectedRoute><Lazy><KitchenDisplayPage /></Lazy></ProtectedRoute>} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPage />} />
          <Route path="inventory"  element={<InventoryPage />} />
          <Route path="inventory/categories" element={<Lazy><CategoriesPage /></Lazy>} />
          <Route path="inventory/brands"     element={<Lazy><BrandsPage /></Lazy>} />
          <Route path="inventory/report"     element={<Lazy><InventoryReportPage /></Lazy>} />
          <Route path="orders"     element={<OrdersPage />} />
          <Route path="pos"        element={<POSPage />} />
          <Route path="cashier"    element={<CashierPage />} />
          <Route path="branches"   element={<Lazy><BranchesPage /></Lazy>} />
          <Route path="users"      element={<Lazy><UsersPage /></Lazy>} />
          <Route path="tables"     element={<Lazy><TablesPage /></Lazy>} />
          <Route path="bank-accounts" element={<Lazy><BankAccountsPage /></Lazy>} />
          <Route path="printers" element={<Lazy><PrinterSettingsPage /></Lazy>} />
          <Route path="planning" element={<Lazy><WeeklyPlanningPage /></Lazy>} />
          <Route path="customers" element={<Lazy><CustomersPage /></Lazy>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
