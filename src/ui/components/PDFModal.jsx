import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Button } from './Button';

export default function PDFModal({ isOpen, onClose, title, pdfUrl }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-6 py-4 border-b border-primary-100 flex items-center justify-between bg-primary-50/50">
          <div>
            <h3 className="text-lg font-black text-primary-900">{title || 'Vista Previa de Impresión'}</h3>
            <p className="text-xs text-primary-400 font-bold uppercase tracking-widest">Documento PDF Generado</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              icon={Download}
              onClick={() => {
                // Ensure we don't double up &download=1
                const url = pdfUrl.includes('download=1') ? pdfUrl : (pdfUrl + '&download=1');
                window.location.href = url;
              }}
            >
              Descargar
            </Button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-primary-100 rounded-xl transition-colors text-primary-400 hover:text-primary-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 bg-primary-100 p-4 relative">
          <iframe 
            src={pdfUrl} 
            className="w-full h-full rounded-2xl border border-primary-200 shadow-inner bg-white"
            title="PDF Preview"
          />
        </div>

        <div className="p-4 bg-white border-t border-primary-100 flex justify-center">
          <Button 
            variant="brand" 
            icon={Printer}
            className="px-10 py-3 rounded-2xl shadow-lg shadow-brand/20"
            onClick={() => {
                const iframe = document.querySelector('iframe');
                if (iframe) {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                }
            }}
          >
            Imprimir Ahora
          </Button>
        </div>
      </div>
    </div>
  );
}
