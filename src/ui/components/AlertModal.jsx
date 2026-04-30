import React from 'react';
import { Button } from './Button';
import { Info, X, CheckCircle, AlertCircle } from 'lucide-react';

export const AlertModal = ({ 
  open, 
  title = 'Información', 
  message, 
  onClose,
  variant = 'info' // 'info', 'success', 'warning', 'error'
}) => {
  if (!open) return null;

  const getIcon = () => {
    switch(variant) {
      case 'success': return <CheckCircle size={24} />;
      case 'error': return <AlertCircle size={24} />;
      case 'warning': return <AlertCircle size={24} />;
      default: return <Info size={24} />;
    }
  };

  const getColorClasses = () => {
    switch(variant) {
      case 'success': return 'bg-green-100 text-green-600';
      case 'error': return 'bg-red-100 text-red-600';
      case 'warning': return 'bg-orange-100 text-orange-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
        <div className={`p-6 border-b border-slate-100 flex flex-col items-center text-center`}>
          <div className={`p-4 rounded-full mb-4 ${getColorClasses()}`}>
            {getIcon()}
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
          <p className="text-slate-600 text-[15px] leading-relaxed whitespace-pre-line">{message}</p>
        </div>
        <div className="p-4 bg-slate-50 flex justify-center">
          <Button variant="brand" className="w-full" onClick={onClose}>Aceptar</Button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
