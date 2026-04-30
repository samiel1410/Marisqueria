import React from 'react';
import { X, Printer } from 'lucide-react';
import api from '../../../infrastructure/api';
import { Button } from '../../components/Button';

export default function PrintModal({ open, onClose, sessionId }) {
  if (!open) return null;
  const token = localStorage.getItem('token');
  const pdfUrl = `${api.defaults.baseURL}/cash/session-print?id=${sessionId}&download=1&token=${token}`;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-lg"><Printer size={20}/></div>
            <h3 className="text-lg font-bold">Resumen de Caja</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="flex-1 bg-gray-100 p-4">
          <iframe src={pdfUrl} className="w-full h-full rounded-xl border shadow-inner bg-white" title="PDF Preview" />
        </div>
        <div className="p-4 border-t flex justify-end">
          <Button variant="brand" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
}
