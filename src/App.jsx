import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './ui/pages/LoginPage';
import DashboardPage from './ui/pages/DashboardPage';
import InventoryPage from './ui/pages/InventoryPage';
import OrdersPage from './ui/pages/OrdersPage';
import CashierPage from './ui/pages/CashierPage';
import Layout from './ui/components/Layout';
import { isSessionValid, clearSession } from './infrastructure/api';
import { requestForToken, messaging } from './infrastructure/firebase';
import { onMessage } from 'firebase/messaging';
import { handleRemotePrint } from './infrastructure/PrinterService';
import './index.css';

const BranchesPage       = React.lazy(() => import('./ui/pages/BranchesPage'));
const UsersPage          = React.lazy(() => import('./ui/pages/UsersPage'));
const TablesPage         = React.lazy(() => import('./ui/pages/TablesPage'));
const CategoriesPage     = React.lazy(() => import('./ui/pages/CategoriesPage'));
const BrandsPage         = React.lazy(() => import('./ui/pages/BrandsPage'));
const BankAccountsPage   = React.lazy(() => import('./ui/pages/BankAccountsPage'));
const PrinterSettingsPage = React.lazy(() => import('./ui/pages/PrinterSettingsPage'));
const WeeklyPlanningPage  = React.lazy(() => import('./ui/pages/WeeklyPlanningPage'));

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
    // Only request token if permission is already granted
    if (Notification.permission === 'granted') {
      requestForToken();
    }

    // Listen for foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Notification received in App.jsx:', payload);
      
      // Handle automatic printing if it's a print request
      if (payload?.data?.type === 'print_request' && payload?.data?.order_id) {
        handleRemotePrint(payload.data.order_id);
      } else if (payload?.data?.type === 'print_cash_request' && payload?.data?.session_id) {
        import('./infrastructure/PrinterService').then(({ handleRemoteCashPrint }) => {
          handleRemoteCashPrint(payload.data.session_id);
        });
      }

      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
        });
      }

      // Dispatch custom event for components to listen
      window.dispatchEvent(new CustomEvent('fcm-message', { detail: payload }));
    });

    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPage />} />
          <Route path="inventory"  element={<InventoryPage />} />
          <Route path="inventory/categories" element={<Lazy><CategoriesPage /></Lazy>} />
          <Route path="inventory/brands"     element={<Lazy><BrandsPage /></Lazy>} />
          <Route path="orders"     element={<OrdersPage />} />
          <Route path="cashier"    element={<CashierPage />} />
          <Route path="branches"   element={<Lazy><BranchesPage /></Lazy>} />
          <Route path="users"      element={<Lazy><UsersPage /></Lazy>} />
          <Route path="tables"     element={<Lazy><TablesPage /></Lazy>} />
          <Route path="bank-accounts" element={<Lazy><BankAccountsPage /></Lazy>} />
          <Route path="printers" element={<Lazy><PrinterSettingsPage /></Lazy>} />
          <Route path="planning" element={<Lazy><WeeklyPlanningPage /></Lazy>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
