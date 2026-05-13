import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Loader2, Package, Table2, Search, ShoppingBag
} from 'lucide-react';
import api, { BASE_URL } from '../../infrastructure/api';
import { useToast } from '../components/Toast';

// Sub-components
import ProductCard from '../components/pos/ProductCard';
import CategoryTabs from '../components/pos/CategoryTabs';
import CartSidebar from '../components/pos/CartSidebar';
import PaymentModal from '../components/pos/PaymentModal';

export default function POSPage() {
  const { show: showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTableId = searchParams.get('table_id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [schedules, setSchedules] = useState([]);
  
  const [selectedTableId, setSelectedTableId] = useState(initialTableId || '');
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [customer, setCustomer] = useState({
    id: null,
    identifier: '9999999999999',
    name: 'CONSUMIDOR FINAL',
    email: '',
    address: 'S/N',
    phone: '9999999999'
  });
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [amountReceived, setAmountReceived] = useState('');
  const [mixedCash, setMixedCash] = useState('');
  const [mixedTransfer, setMixedTransfer] = useState('');
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [lastOrderNumber, setLastOrderNumber] = useState(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);

  useEffect(() => {
    fetchData();
    fetchBanks();

    const handleFCMRefresh = () => fetchData();
    window.addEventListener('fcm-message', handleFCMRefresh);
    return () => window.removeEventListener('fcm-message', handleFCMRefresh);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, tableRes, scheduleRes] = await Promise.all([
        api.get('/products?limit=500'),
        api.get('/categories'),
        api.get('/tables'),
        api.get('/schedules')
      ]);
      setProducts(prodRes.data.data || []);
      setCategories(catRes.data || []);
      setSchedules(scheduleRes.data || []);
      
      const tablesData = Array.isArray(tableRes.data) ? tableRes.data : (tableRes.data.tables || []);
      setTables(tablesData);
    } catch (error) {
      showToast("Error al cargar datos", { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const res = await api.get('/banks');
      setBanks(res.data || []);
    } catch (error) {
      console.error("Error fetching banks:", error);
    }
  };

  const handleSearchCustomer = async () => {
    if (!customer.identifier || customer.identifier.length < 10) return;
    try {
      setSearchingCustomer(true);
      const res = await api.get(`/customers/lookup?identification=${customer.identifier}`);
      if (res.data) {
        setCustomer({
          id: res.data.id,
          identifier: res.data.identification,
          name: res.data.name,
          email: res.data.email || '',
          address: res.data.address || '',
          phone: res.data.phone || ''
        });
        showToast("Cliente encontrado", { type: 'success' });
      } else {
        showToast("Cliente no registrado", { type: 'info' });
      }
    } catch (error) {
      console.error("Error searching customer:", error);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const today = useMemo(() => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }, []);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    
    if (selectedCategory === 'menu_dia') {
      const activeIds = schedules
        .filter(s => Number(s[today]) === 1)
        .map(s => s.product_id);
      list = list.filter(p => activeIds.includes(p.id));
    } else if (selectedCategory) {
      list = list.filter(p => p.category_id === selectedCategory);
    }

    if (search) {
      list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  }, [products, search, selectedCategory, schedules, today]);

  const isTakeawayMode = selectedTableId === '';

  const handleAddToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(item => item.product_id === product.id);
      
      const basePrice = parseFloat(product.price);
      const surcharge = (isTakeawayMode && (product.is_takeaway === 1 || product.is_takeaway === true || product.is_takeaway === '1')) 
        ? parseFloat(product.takeaway_surcharge || 0) 
        : 0;
      const finalPrice = basePrice + surcharge;

      if (exists) {
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1, price: finalPrice } 
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: finalPrice,
        quantity: 1,
        notes: ''
      }];
    });
  };

  useEffect(() => {
    if (cart.length === 0) return;
    
    setCart(prev => prev.map(item => {
      const product = products.find(p => p.id === item.product_id);
      if (!product) return item;

      const basePrice = parseFloat(product.price);
      const surcharge = (isTakeawayMode && (product.is_takeaway === 1 || product.is_takeaway === true || product.is_takeaway === '1')) 
        ? parseFloat(product.takeaway_surcharge || 0) 
        : 0;
      
      return { ...item, price: basePrice + surcharge };
    }));
  }, [isTakeawayMode]);

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeItem = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmit = async (isOnlyOrder = false) => {
    if (cart.length === 0) return;
    try {
      setSaving(true);
      const orderPayload = {
        table_id: selectedTableId || null,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes
        })),
        customer_identifier: customer.identifier,
        customer_name: customer.name,
        total: total
      };

      const res = await api.post('/orders', orderPayload);
      const orderId = res.data.order_id;
      setLastOrderId(orderId);
      setLastOrderNumber(res.data.daily_number || orderId);

      if (isOnlyOrder) {
        showToast("Pedido creado con éxito", { type: 'success' });
        // Local broadcast fallback to notify other tabs (like Kitchen) instantly
        try {
          const channel = new BroadcastChannel('fcm_updates');
          channel.postMessage({ data: { type: 'local_order_update' } });
          setTimeout(() => channel.close(), 100);
        } catch (e) {
          console.error('Local broadcast error:', e);
        }
        
        setCart([]);
        fetchData();
        return;
      }

      const formData = new FormData();
      formData.append('order_id', orderId);
      formData.append('status', 'cobrado');
      formData.append('payment_method', paymentMethod);
      formData.append('customer_id', customer.id || '');
      formData.append('bank_account_id', selectedBankId || '');
      formData.append('amount', total);
      formData.append('cash_amount', paymentMethod === 'efectivo' ? total : (paymentMethod === 'mixto' ? parseFloat(mixedCash || 0) : 0));
      formData.append('transfer_amount', paymentMethod === 'transferencia' ? total : (paymentMethod === 'mixto' ? parseFloat(mixedTransfer || 0) : 0));
      
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      await api.post('/orders/status', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setCheckoutStep(2);
      fetchData();
      showToast("Cobro realizado con éxito", { type: 'success' });
    } catch (error) {
      showToast("Error al procesar", { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const resetPOS = () => {
    setCart([]);
    setShowPaymentModal(false);
    setCheckoutStep(0);
    setCustomer({
      id: null,
      identifier: '9999999999999',
      name: 'CONSUMIDOR FINAL',
      email: '',
      address: 'S/N',
      phone: '9999999999'
    });
    setAmountReceived('');
    setMixedCash('');
    setMixedTransfer('');
    setPaymentMethod('efectivo');
    setSelectedBankId(null);
    setLastOrderId(null);
    setReceiptFile(null);
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="w-10 h-10 text-brand animate-spin" />
        <p className="text-[10px] font-black text-primary-400 uppercase tracking-[0.2em]">Cargando Sistema...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#f4f7f6] flex flex-col p-3 animate-in fade-in duration-500 overflow-hidden">
      {/* Header Compacto con Tabs de Mesa */}
      <div className="bg-white rounded-2xl shadow-sm border border-primary-100 p-2 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-brand font-black text-lg tracking-tight px-3 border-r border-primary-100">POS</div>
          
          <div className="flex bg-primary-50 p-1 rounded-xl border border-primary-100 overflow-x-auto no-scrollbar max-w-2xl">
            <button 
              onClick={() => setSelectedTableId('')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedTableId === '' 
                  ? 'bg-white text-brand shadow-sm' 
                  : 'text-primary-400 hover:text-primary-600'
              }`}
            >
              <ShoppingBag size={14} />
              Para Llevar
            </button>
            {tables.map(t => {
              const isOccupied = t.order_status && t.order_status !== 'cobrado';
              const isSelected = selectedTableId === t.id;
              
              return (
                <button 
                  key={t.id}
                  onClick={() => setSelectedTableId(t.id)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 border ${
                    isSelected 
                      ? 'bg-white text-brand shadow-sm border-brand' 
                      : isOccupied
                        ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                        : 'bg-white text-primary-400 border-primary-100 hover:text-primary-600'
                  }`}
                >
                  <Table2 size={14} className={isOccupied && !isSelected ? 'text-amber-500' : ''} />
                  Mesa {t.number}
                  {isOccupied && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-48 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300 group-focus-within:text-brand transition-colors" size={14} />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-primary-50/50 border border-primary-100 outline-none focus:bg-white focus:border-brand transition-all text-xs font-bold"
            />
          </div>
          <button onClick={() => navigate(-1)} className="p-2 text-primary-400 hover:text-brand transition-colors">
            <ArrowLeft size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {/* Catálogo */}
        <div className="flex-1 flex flex-col min-w-0 space-y-3">
          <CategoryTabs 
            categories={categories} 
            selectedCategory={selectedCategory} 
            onSelectCategory={setSelectedCategory} 
          />
          
          <div className="flex-1 overflow-y-auto p-1 no-scrollbar pb-20">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredProducts.map(p => (
                <ProductCard 
                  key={p.id} 
                  product={p} 
                  isTakeawayMode={isTakeawayMode}
                  getImageUrl={getImageUrl} 
                  onAddToCart={handleAddToCart} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Carrito */}
        <CartSidebar 
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onClearCart={() => setCart([])}
          total={total}
          onProceedToCheckout={() => setShowPaymentModal(true)}
          onSaveOrder={() => handleSubmit(true)}
          saving={saving}
        />
      </div>

      <PaymentModal 
        show={showPaymentModal}
        step={checkoutStep}
        setStep={setCheckoutStep}
        total={total}
        customer={customer}
        setCustomer={setCustomer}
        onSearchCustomer={handleSearchCustomer}
        searchingCustomer={searchingCustomer}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        amountReceived={amountReceived}
        setAmountReceived={setAmountReceived}
        mixedCash={mixedCash}
        setMixedCash={setMixedCash}
        mixedTransfer={mixedTransfer}
        setMixedTransfer={setMixedTransfer}
        banks={banks}
        selectedBankId={selectedBankId}
        setSelectedBankId={setSelectedBankId}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={() => handleSubmit(false)}
        onReset={resetPOS}
        saving={saving}
        lastOrderNumber={lastOrderNumber}
        getImageUrl={getImageUrl}
        receiptFile={receiptFile}
        setReceiptFile={setReceiptFile}
      />
    </div>
  );
}
