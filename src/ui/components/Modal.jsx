import React from 'react';

const Modal = ({ open, title, children, onClose }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 animate-scale-in">
        <div className="flex justify-between items-center mb-4 border-b border-primary-100 pb-4">
          <h3 className="text-lg font-bold text-primary-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-primary-400 hover:text-primary-700 text-xl leading-none transition-colors"
          >&times;</button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
