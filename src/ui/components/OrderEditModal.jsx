import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Plus, Minus, Trash2, Save, ShoppingBag, Tag, ChevronRight } from 'lucide-react';
import api from '../../infrastructure/api';
import { Button } from './Button';
import { Badge } from './Badge';
import { useToast } from './Toast';

export default function OrderEditModal({ isOpen, onClose, orderId, onSaveSuccess }) {
  const { show: showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
      fetchProducts();
      fetchCategories();
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/print?order_id=${orderId}`);
      setOrder(response.data);
    } catch (error) {
      showToast("Error al cargar detalles de la orden", { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products?limit=200');
      setProducts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleUpdateQuantity = (productId, delta) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.product_id === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    }));
  };

  const handleRemoveItem = (productId) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.filter(item => item.product_id !== productId)
    }));
  };

  const handleAddItem = (product) => {
    setOrder(prev => {
      const items = prev.items || [];
      const exists = items.find(i => i.product_id === product.id);
      if (exists) {
        return {
          ...prev,
          items: items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        };
      }
      return {
        ...prev,
        items: [...items, { 
          product_id: product.id, 
          product_name: product.name, 
          quantity: 1, 
          price: product.price 
        }]
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/orders/update', {
        order_id: orderId,
        items: order.items.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
      });
      showToast("Orden actualizada correctamente", { type: 'success' });
      onSaveSuccess();
      onClose();
    } catch (error) {
      showToast("No se pudo guardar los cambios", { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category_id.toString() === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const calculateTotal = () => {
    if (!order || !order.items) return 0;
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header con gradiente */}
        <div className="px-10 py-8 bg-gradient-to-r from-primary-900 to-primary-800 text-white relative">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-3xl font-black tracking-tight">Editar Orden #{orderId}</h3>
                <Badge variant="brand" className="bg-white/20 text-white border-none px-3 py-1 text-xs">Editando ahora</Badge>
              </div>
              <p className="text-primary-200 font-bold uppercase text-[10px] tracking-[0.2em] opacity-80">Modificar productos, cantidades y extras</p>
            </div>
            <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all group">
              <X size={24} className="text-white transition-transform group-hover:rotate-90" />
            </button>
          </div>
          {/* Decoración fondo */}
          <div className="absolute top-0 right-0 w-64 h-full bg-white/5 skew-x-[-20deg] translate-x-32" />
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Current Order Items */}
          <div className="w-5/12 flex flex-col border-r border-slate-100 bg-slate-50/30">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur">
                <div className="flex items-center gap-2">
                    <ShoppingBag className="text-primary-900" size={20} />
                    <span className="text-sm font-black text-primary-900 uppercase tracking-tight">Tu Pedido Actual</span>
                </div>
                <Badge variant="brand" className="rounded-full px-3 font-bold">{order?.items?.length || 0} Prod</Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading || !order ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                  <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-900 rounded-full animate-spin" />
                  <p className="font-bold text-sm uppercase tracking-widest">Cargando...</p>
                </div>
              ) : order.items?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag size={40} className="opacity-20 text-primary-900" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest">Orden vacía</p>
                  <p className="text-xs font-medium mt-1">Añade productos de la derecha</p>
                </div>
              ) : (
                order.items?.map((item) => (
                  <div key={item.product_id} className="flex items-center gap-4 p-4 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-left-4 duration-300">
                    <div className="flex-1">
                      <p className="font-black text-slate-800 text-base leading-tight mb-1">{item.product_name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-success-dark bg-success/10 px-2 py-0.5 rounded-lg uppercase">${parseFloat(item.price).toFixed(2)} unit.</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                        <button 
                            onClick={() => handleUpdateQuantity(item.product_id, -1)} 
                            className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-xl text-slate-500 transition-all hover:text-primary-900 shadow-sm hover:shadow-md"
                        >
                          <Minus size={14} strokeWidth={3} />
                        </button>
                        <span className="w-10 text-center text-sm font-black text-primary-900">{item.quantity}</span>
                        <button 
                            onClick={() => handleUpdateQuantity(item.product_id, 1)} 
                            className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-xl text-slate-500 transition-all hover:text-primary-900 shadow-sm hover:shadow-md"
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                      <p className="text-sm font-black text-primary-900">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    
                    <button 
                      onClick={() => handleRemoveItem(item.product_id)}
                      className="p-3 text-slate-300 hover:text-danger hover:bg-danger/5 rounded-2xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-8 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Resumen del Pago</span>
                    <span className="text-sm font-bold text-slate-600 italic">Total Neto</span>
                </div>
                <span className="text-4xl font-black text-primary-900">${calculateTotal().toFixed(2)}</span>
              </div>
              <Button 
                variant="brand" 
                className="w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand/20 text-base flex items-center justify-center gap-3"
                icon={Save}
                disabled={saving || !order || !order.items || order.items.length === 0}
                onClick={handleSave}
              >
                {saving ? 'Guardando cambios...' : 'Confirmar Cambios'}
              </Button>
            </div>
          </div>

          {/* Right: Product Selector */}
          <div className="w-7/12 flex flex-col bg-white">
            {/* Search & Categories */}
            <div className="p-6 space-y-4 border-b border-slate-50">
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand transition-colors">
                  <Search size={22} />
                </div>
                <input
                  type="text"
                  placeholder="¿Qué producto deseas añadir?"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-14 pr-6 py-4.5 rounded-[2rem] border-2 border-slate-100 outline-none focus:border-brand/40 focus:ring-4 focus:ring-brand/5 bg-slate-50/50 transition-all font-bold text-slate-700 placeholder:text-slate-300"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    selectedCategory === 'all' 
                      ? 'bg-primary-900 text-white shadow-lg' 
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  Todo
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id.toString())}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                      selectedCategory === cat.id.toString()
                        ? 'bg-brand text-white shadow-lg shadow-brand/20' 
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-4 content-start bg-slate-50/30">
              {filteredProducts.length === 0 ? (
                <div className="col-span-2 py-20 flex flex-col items-center text-slate-300">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">No hay resultados</p>
                </div>
              ) : (
                filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAddItem(p)}
                      className="relative p-5 bg-white rounded-[2rem] border border-slate-100 hover:border-brand hover:shadow-2xl hover:shadow-brand/10 transition-all text-left group overflow-hidden animate-in fade-in duration-500"
                    >
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                          <Badge variant="secondary" className="mb-3 text-[9px] bg-slate-100 text-slate-500 border-none font-black tracking-widest px-2">{p.category_name}</Badge>
                          <h4 className="text-lg font-black text-slate-800 leading-tight group-hover:text-primary-900 transition-colors line-clamp-2">{p.name}</h4>
                        </div>
                        <div className="mt-6 flex items-center justify-between">
                          <span className="text-xl font-black text-success-dark">${parseFloat(p.price).toFixed(2)}</span>
                          <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-all transform group-hover:scale-110 shadow-sm">
                            <Plus size={20} strokeWidth={3} />
                          </div>
                        </div>
                      </div>
                      {/* Efecto hover */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-brand/5 rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:scale-[3] transition-transform duration-500" />
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
