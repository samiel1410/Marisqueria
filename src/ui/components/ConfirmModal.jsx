import React from 'react';
import { Button } from './Button';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmModal = ({ 
  open, 
  title = 'Confirmar acción', 
  message, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar', 
  onConfirm, 
  onClose,
  variant = 'brand'
}) => {
  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
        <div className={`p-6 border-b border-slate-100 flex items-center gap-4 ${isDanger ? 'bg-red-50/50' : 'bg-slate-50/50'}`}>
          <div className={`p-3 rounded-xl ${isDanger ? 'bg-red-100 text-red-600' : 'bg-brand/10 text-brand'}`}>
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 flex-1">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-[15px] leading-relaxed whitespace-pre-line">{message}</p>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>{cancelText}</Button>
          <Button variant={variant} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
