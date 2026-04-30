import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter(x => x.id !== id)), duration);
  }, []);

  const value = { show };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-6 right-6 z-60 flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded shadow-md text-sm text-white ${t.type === 'success' ? 'bg-green-500' : t.type === 'error' ? 'bg-red-500' : 'bg-primary-900'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export default ToastProvider;
