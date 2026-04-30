import React from 'react';

const LoadingMask = ({ open = false, message = 'Procesando...' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 flex items-center gap-4 shadow-lg">
        <svg className="animate-spin h-6 w-6 text-brand" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <div className="text-sm font-medium text-primary-900">{message}</div>
      </div>
    </div>
  );
};

export default LoadingMask;
