import React, { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../infrastructure/api';
import { 
  X, 
  Search, 
  UserPlus, 
  CreditCard, 
  Banknote, 
  ArrowRight,
  CheckCircle2,
  Printer,
  ChevronRight,
  QrCode,
  Plus,
  MessageCircle,
  Download
} from 'lucide-react';
import { handleRemotePrint } from '../../infrastructure/PrinterService';

const CheckoutModal = ({ isOpen, onClose, order, onCheckoutSuccess }) => {
  const [step, setStep] = useState(1); // 1: Customer, 2: Payment, 3: Success/Print
  const [identification, setIdentification] = useState('');
  const [customer, setCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    identification: '',
    name: '',
    email: '',
    phone: ''
  });
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [cashPart, setCashPart] = useState(0);
  const [transferPart, setTransferPart] = useState(0);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [tenderedAmount, setTenderedAmount] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIdentification('');
      setCustomer(null);
      setShowNewCustomerForm(false);
      setPaymentMethod('efectivo');
      const balance = Number(order?.total || 0) - Number(order?.total_paid || 0);
      setCashPart(balance);
      setTransferPart(0);
      setSelectedBankId(null);
      setTenderedAmount('');
      fetchBanks();
    }
  }, [isOpen, order]);

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (error) {
      console.error("Error fetching banks:", error);
    }
  };

  const handleSearchCustomer = async () => {
    if (!identification) return;
    setLoading(true);
    try {
      const response = await api.get(`/customers/lookup?identification=${identification}`);
      setCustomer(response.data);
      setShowNewCustomerForm(false);
    } catch (error) {
      setCustomer(null);
      setCustomerForm({ ...customerForm, identification: identification, name: '' });
      setShowNewCustomerForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (customerForm.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerForm.email)) {
        alert("Por favor ingrese un correo electrónico válido (ejemplo: usuario@correo.com).");
        return;
      }
    }

    setLoading(true);
    try {
      const response = await api.post('/customers', customerForm);
      setCustomer({ ...customerForm, id: response.data.id });
      setShowNewCustomerForm(false);
    } catch (error) {
      alert("Error al guardar cliente. Verifique los datos ingresados.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalCheckout = async () => {
    const balance = Number(order.total) - Number(order.total_paid || 0);
    const amountThisTime = paymentMethod === 'mixto' 
      ? (Number(cashPart) + Number(transferPart))
      : (paymentMethod === 'efectivo' ? Number(cashPart) : Number(transferPart));

    if (amountThisTime > balance + 0.01) {
      alert("El monto ingresado excede el saldo pendiente: $" + balance.toFixed(2));
      return;
    }
    
    if (paymentMethod === 'efectivo' && tenderedAmount !== '' && Number(tenderedAmount) < balance) {
      alert("El monto recibido no cubre el total a cobrar.");
      return;
    }

    if (amountThisTime <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }

    setLoading(true);
    try {
      const data = {
        order_id: order.id,
        status: 'cobrado',
        payment_method: paymentMethod,
        customer_id: customer?.id || null,
        cash_amount: paymentMethod === 'mixto' ? cashPart : (paymentMethod === 'efectivo' ? cashPart : 0),
        transfer_amount: paymentMethod === 'mixto' ? transferPart : (paymentMethod === 'transferencia' ? transferPart : 0),
        bank_account_id: (paymentMethod === 'transferencia' || paymentMethod === 'mixto') ? selectedBankId : null,
        amount: amountThisTime
      };
      const response = await api.post('/orders/status', data);
      setCheckoutResult(response.data);
      setStep(3);
      if (onCheckoutSuccess) onCheckoutSuccess();
    } catch (error) {
      alert("Error al procesar el cobro");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    await handleRemotePrint(order.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Cerrar Orden #{order.id}</h2>
            <p className="text-slate-500 font-medium">Mesa {order.table_number} • Total: ${order.total}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-slate-600 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Progress Bar */}
          <div className="flex items-center gap-4 mb-8">
            <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-sky-500' : 'bg-slate-100'}`} />
            <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-sky-500' : 'bg-slate-100'}`} />
            <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-100'}`} />
          </div>

          {/* Step 1: Customer Data */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="text-sky-500" size={20} />
                  Datos del Cliente
                </h3>
                <p className="text-sm text-slate-500 font-medium">Busca por identificación o ingresa un consumidor final.</p>
              </div>

              {!showNewCustomerForm ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text" 
                        placeholder="Identificación (Cédula/RUC)"
                        value={identification}
                        onChange={e => setIdentification(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearchCustomer()}
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <button 
                      onClick={handleSearchCustomer}
                      disabled={loading}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-6 rounded-2xl font-bold transition-all disabled:opacity-50"
                    >
                      {loading ? '...' : 'Buscar'}
                    </button>
                  </div>

                  {customer && (
                    <div className="bg-sky-50 rounded-2xl p-5 border border-sky-100 flex items-center justify-between animate-in fade-in duration-300">
                      <div>
                        <p className="font-bold text-sky-900">{customer.name}</p>
                        <p className="text-sm text-sky-600 font-medium">{customer.email || 'Sin correo'}</p>
                      </div>
                      <button onClick={() => setStep(2)} className="bg-sky-500 text-white p-2 rounded-xl shadow-lg shadow-sky-200 hover:bg-sky-600 transition-all">
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-2">
                    <button 
                      onClick={() => {
                        setCustomer({ id: null, name: 'CONSUMIDOR FINAL', identification: '9999999999999' });
                        setStep(2);
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all text-slate-700 font-bold"
                    >
                      <span>Usar Consumidor Final</span>
                      <ChevronRight size={18} className="text-slate-400" />
                    </button>
                    <button 
                      onClick={() => setShowNewCustomerForm(true)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border border-dashed border-slate-200 hover:bg-slate-50 transition-all text-sky-600 font-bold"
                    >
                      <span>Registrar Nuevo Cliente</span>
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        value={customerForm.name}
                        onChange={e => setCustomerForm({...customerForm, name: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email</label>
                      <input 
                        type="email" 
                        value={customerForm.email}
                        onChange={e => setCustomerForm({...customerForm, email: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Teléfono</label>
                      <input 
                        type="text" 
                        value={customerForm.phone}
                        onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setShowNewCustomerForm(false)}
                      className="flex-1 py-3.5 rounded-2xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all"
                    >
                      Volver
                    </button>
                    <button 
                      onClick={handleSaveCustomer}
                      className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-sky-100"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Payment Method */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard className="text-sky-500" size={20} />
                  Forma de Pago
                </h3>
                <p className="text-sm text-slate-500 font-medium">Selecciona cómo pagará el cliente.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'efectivo' 
                      ? 'border-sky-500 bg-sky-50/50 text-sky-600 shadow-xl shadow-sky-100' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-400'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${paymentMethod === 'efectivo' ? 'bg-sky-500 text-white' : 'bg-slate-100'}`}>
                    <Banknote size={24} />
                  </div>
                  <span className="font-bold text-sm">Efectivo</span>
                </button>

                <button 
                  onClick={() => setPaymentMethod('transferencia')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'transferencia' 
                      ? 'border-sky-500 bg-sky-50/50 text-sky-600 shadow-xl shadow-sky-100' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-400'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${paymentMethod === 'transferencia' ? 'bg-sky-500 text-white' : 'bg-slate-100'}`}>
                    <QrCode size={24} />
                  </div>
                  <span className="font-bold text-sm">Transferencia</span>
                </button>

                <button 
                  onClick={() => {
                    setPaymentMethod('mixto');
                    setCashPart(order.total / 2);
                    setTransferPart(order.total / 2);
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'mixto' 
                      ? 'border-sky-500 bg-sky-50/50 text-sky-600 shadow-xl shadow-sky-100' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-400'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${paymentMethod === 'mixto' ? 'bg-sky-500 text-white' : 'bg-slate-100'}`}>
                    <CreditCard size={24} />
                  </div>
                  <span className="font-bold text-sm">Mixto</span>
                </button>
              </div>

              {paymentMethod === 'efectivo' && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total a Cobrar</span>
                    <span className="text-xl font-black text-slate-800">${(Number(order.total) - Number(order.total_paid || 0)).toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Dinero Recibido</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input 
                          type="number" 
                          value={tenderedAmount}
                          onChange={e => setTenderedAmount(e.target.value)}
                          placeholder={(Number(order.total) - Number(order.total_paid || 0)).toFixed(2)}
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-bold text-lg text-slate-700 bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Vuelto / Cambio</label>
                      <div className="h-[46px] bg-white border border-slate-200 rounded-xl flex items-center px-3">
                        <span className={`font-black text-xl ${
                          (Number(tenderedAmount || (Number(order.total) - Number(order.total_paid || 0))) - (Number(order.total) - Number(order.total_paid || 0))) >= 0 
                            ? 'text-emerald-500' 
                            : 'text-red-500'
                        }`}>
                          ${Math.max(0, (Number(tenderedAmount || (Number(order.total) - Number(order.total_paid || 0))) - (Number(order.total) - Number(order.total_paid || 0)))).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'mixto' && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2 duration-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Monto Efectivo</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input 
                        type="number" 
                        value={cashPart}
                        onChange={e => setCashPart(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Monto Transferencia</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input 
                        type="number" 
                        value={transferPart}
                        onChange={e => setTransferPart(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(paymentMethod === 'transferencia' || paymentMethod === 'mixto') && (
                <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-300">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Cuenta de Destino</p>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                    {banks.map(bank => (
                      <div 
                        key={bank.id} 
                        onClick={() => setSelectedBankId(bank.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${
                          selectedBankId === bank.id ? 'border-sky-500 bg-sky-50/50' : 'border-slate-100 bg-slate-50/30'
                        }`}
                      >
                        <div>
                          <p className={`font-bold text-sm ${selectedBankId === bank.id ? 'text-sky-900' : 'text-slate-800'}`}>{bank.bank_name}</p>
                          <p className="text-xs text-slate-500 font-medium">{bank.account_type || 'Ahorros'} • {bank.account_number}</p>
                        </div>
                        {bank.qr_path && (
                          <div className="bg-white p-1 rounded-lg border border-slate-200">
                            <QrCode size={20} className="text-slate-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-6">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 rounded-2xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Atrás
                </button>
                <button 
                  onClick={handleFinalCheckout}
                  disabled={loading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                >
                  {loading ? 'Procesando...' : 'Finalizar Cobro'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success & Print */}
          {step === 3 && (
            <div className="py-12 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100">
                <CheckCircle2 size={56} strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-slate-800">¡Cobro Exitoso!</h3>
                <p className="text-slate-500 font-medium max-w-xs">La orden #{order.id} ha sido cancelada y la mesa está disponible.</p>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-xs pt-6">
                <button 
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-3 bg-sky-500 hover:bg-sky-600 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-sky-200"
                >
                  <Printer size={20} />
                  Imprimir Comprobante
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      const token = localStorage.getItem('token');
                      const url = `${BASE_URL}/orders/print?order_id=${order.id}&token=${token}`;
                      const text = encodeURIComponent(`¡Hola! Aquí tienes tu nota de venta de Krustacio Kascarudo: ${url}`);
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                    }}
                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold transition-all"
                  >
                    <MessageCircle size={18} />
                    WhatsApp
                  </button>
                  <button 
                    onClick={() => {
                      const token = localStorage.getItem('token');
                      window.location.href = `${BASE_URL}/orders/print?order_id=${order.id}&token=${token}&download=1`;
                    }}
                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all"
                  >
                    <Download size={18} />
                    Descargar
                  </button>
                </div>

                <button 
                  onClick={onClose}
                  className="py-4 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
