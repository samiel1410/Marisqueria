import React from 'react';
import { Trash2, Package, Plus, Minus, ShoppingCart } from 'lucide-react';

const CartSidebar = ({ 
  cart, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart, 
  total, 
  onProceedToCheckout,
  onSaveOrder,
  saving
}) => {
  return (
    <div className="w-[380px] bg-white border-l border-primary-100 flex flex-col shadow-2xl relative z-10">
      <div className="p-6 border-b border-primary-100 flex items-center justify-between bg-primary-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h3 className="font-black text-lg uppercase tracking-tight leading-none">Orden</h3>
            <p className="text-primary-400 text-[10px] font-black uppercase tracking-widest mt-1">{cart.length} productos</p>
          </div>
        </div>
        <button 
          onClick={onClearCart}
          className="p-2.5 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"
          title="Vaciar Carrito"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-primary-50/30">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-primary-300 gap-4 opacity-60">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-primary-100">
              <Package size={32} strokeWidth={1.5} />
            </div>
            <p className="font-black uppercase text-[10px] tracking-[0.2em]">Carrito Vacío</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.product_id} className="group bg-white rounded-2xl p-4 border border-primary-100 hover:border-brand/30 hover:shadow-lg hover:shadow-primary-900/5 transition-all animate-in slide-in-from-right-2">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-primary-900 text-xs uppercase truncate mb-1">{item.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-brand font-black text-sm">${parseFloat(item.price).toFixed(2)}</span>
                    <span className="text-[9px] font-bold text-primary-500 uppercase tracking-widest">/ ud.</span>
                  </div>
                </div>
                
                <div className="flex items-center bg-primary-50 rounded-xl border border-primary-100 p-0.5">
                  <button 
                    onClick={() => onUpdateQuantity(item.product_id, -1)}
                    className="w-7 h-7 flex items-center justify-center text-primary-600 hover:text-brand hover:bg-white rounded-lg transition-all"
                  >
                    <Minus size={12} strokeWidth={3} />
                  </button>
                  <span className="w-8 text-center font-black text-primary-900 text-xs">{item.quantity}</span>
                  <button 
                    onClick={() => onUpdateQuantity(item.product_id, 1)}
                    className="w-7 h-7 flex items-center justify-center text-primary-600 hover:text-brand hover:bg-white rounded-lg transition-all"
                  >
                    <Plus size={12} strokeWidth={3} />
                  </button>
                </div>

                <button 
                  onClick={() => onRemoveItem(item.product_id)}
                  className="w-8 h-8 flex items-center justify-center text-primary-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-primary-50 flex justify-between items-center">
                <span className="text-[9px] font-black text-primary-400 uppercase tracking-widest">Subtotal</span>
                <span className="font-black text-primary-900 text-sm">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-6 bg-white border-t border-primary-100 space-y-5 shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-primary-500 uppercase tracking-[0.15em]">Total a pagar</p>
            <p className="text-4xl font-black text-primary-900 tracking-tighter leading-none">${total.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">
              Final
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onSaveOrder}
            disabled={saving || cart.length === 0}
            className="flex flex-col items-center justify-center gap-1.5 py-4 bg-primary-50 text-primary-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary-100 transition-all border border-primary-200 active:scale-95 disabled:opacity-50"
          >
            Solo Pedido
          </button>
          <button 
            onClick={onProceedToCheckout}
            disabled={saving || cart.length === 0}
            className="flex flex-col items-center justify-center gap-1.5 py-4 bg-brand text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-brand/20 hover:opacity-95 transition-all active:scale-95 disabled:opacity-50"
          >
            Cobrar Ahora
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartSidebar;
