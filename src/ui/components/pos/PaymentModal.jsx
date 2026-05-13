import React from 'react';
import { Plus, Search, Loader2, Package, Trash2, Save, CheckCircle2, Printer, RefreshCw, Layers, Camera, Image as ImageIcon, X } from 'lucide-react';

const PaymentModal = ({
  show,
  step,
  total,
  customer,
  setCustomer,
  onSearchCustomer,
  searchingCustomer,
  paymentMethod,
  setPaymentMethod,
  amountReceived,
  setAmountReceived,
  mixedCash,
  setMixedCash,
  mixedTransfer,
  setMixedTransfer,
  banks,
  selectedBankId,
  setSelectedBankId,
  onClose,
  onSubmit,
  onReset,
  saving,
  lastOrderId,
  lastOrderNumber,
  getImageUrl,
  setStep,
  receiptFile,
  setReceiptFile
}) => {
  

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-primary-50 flex items-center justify-between bg-primary-900 text-white">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              {step === 0 ? 'DATOS DEL CLIENTE' : step === 1 ? 'MÉTODO DE PAGO' : 'VENTA EXITOSA'}
            </h3>
            <p className="text-white text-lg font-black uppercase tracking-widest mt-1">
              {step < 2 ? `TOTAL A COBRAR: $${total.toFixed(2)}` : 'Venta completada'}
            </p>
          </div>
          {step < 2 && (
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
              <Plus className="rotate-45" size={24} />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {step < 2 && (
          <div className="px-10 py-4 bg-primary-50/50 flex items-center gap-3">
            {[0, 1, 2].map(s => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm transition-all shadow-sm ${
                  step >= s ? 'bg-brand text-white' : 'bg-white text-primary-300 border border-primary-100'
                }`}>
                  {s + 1}
                </div>
                {s < 2 && <div className={`flex-1 h-1 rounded-full ${step > s ? 'bg-brand' : 'bg-primary-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {step === 0 && (
            <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-primary-900 uppercase tracking-widest">Información de Facturación</h4>
                <button 
                  onClick={() => {
                    setCustomer({
                      id: null,
                      identifier: '9999999999999',
                      name: 'CONSUMIDOR FINAL',
                      email: '',
                      address: 'S/N',
                      phone: '9999999999'
                    });
                    setStep(1);
                  }}
                  className="px-4 py-2 bg-brand/10 text-brand font-black uppercase text-[10px] tracking-widest rounded-lg border border-brand/20 hover:bg-brand hover:text-white transition-all shadow-sm"
                >
                  Consumidor Final
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary-600 uppercase ml-1">Cédula / RUC</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={customer.identifier}
                        onChange={(e) => setCustomer({...customer, identifier: e.target.value})}
                        onKeyDown={(e) => e.key === 'Enter' && onSearchCustomer()}
                        className="w-full pl-3 pr-10 py-3 rounded-xl bg-primary-50 border border-primary-200 outline-none focus:bg-white focus:border-brand font-bold text-base text-primary-900 transition-all shadow-sm"
                        placeholder="ID..."
                      />
                      <button 
                        onClick={onSearchCustomer}
                        disabled={searchingCustomer}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-primary-200 text-primary-500 hover:text-brand transition-all shadow-sm"
                      >
                        {searchingCustomer ? <Loader2 size={16} className="animate-spin text-brand" /> : <Search size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary-600 uppercase ml-1">Nombre Completo</label>
                    <input 
                      type="text"
                      value={customer.name}
                      onChange={(e) => setCustomer({...customer, name: e.target.value})}
                      className="w-full px-3 py-3 rounded-xl bg-primary-50 border border-primary-200 outline-none focus:bg-white focus:border-brand font-bold text-base text-primary-900 transition-all shadow-sm"
                      placeholder="Nombre..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary-600 uppercase ml-1">Teléfono</label>
                    <input 
                      type="text"
                      value={customer.phone}
                      onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                      className="w-full px-3 py-3 rounded-xl bg-primary-50 border border-primary-200 outline-none focus:bg-white focus:border-brand font-bold text-base text-primary-900 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary-600 uppercase ml-1">Email</label>
                    <input 
                      type="email"
                      value={customer.email}
                      onChange={(e) => setCustomer({...customer, email: e.target.value})}
                      className="w-full px-3 py-3 rounded-xl bg-primary-50 border border-primary-200 outline-none focus:bg-white focus:border-brand font-bold text-base text-primary-900 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary-600 uppercase ml-1">Dirección</label>
                  <input 
                    type="text"
                    value={customer.address}
                    onChange={(e) => setCustomer({...customer, address: e.target.value})}
                    className="w-full px-3 py-3 rounded-xl bg-primary-50 border border-primary-200 outline-none focus:bg-white focus:border-brand font-bold text-base text-primary-900 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'efectivo', label: 'Efectivo', icon: Trash2 },
                  { id: 'transferencia', label: 'Transferencia', icon: Package },
                  { id: 'mixto', label: 'Mixto', icon: Layers }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-5 rounded-[1.5rem] border-2 flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === method.id 
                        ? 'bg-brand/10 border-brand text-brand shadow-lg scale-[1.02]' 
                        : 'bg-white border-primary-100 text-primary-500 hover:border-primary-300 hover:bg-primary-50/50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                      paymentMethod === method.id ? 'bg-brand text-white' : 'bg-primary-50 text-primary-400'
                    }`}>
                      <method.icon size={24} />
                    </div>
                    <span className={`text-xs font-black uppercase tracking-widest ${paymentMethod === method.id ? 'text-brand' : 'text-primary-600'}`}>
                      {method.label}
                    </span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'efectivo' && (
                <div className="bg-primary-50 rounded-[1.5rem] p-6 flex items-center gap-8 border border-primary-200 animate-in zoom-in-95 shadow-inner">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-black text-primary-700 uppercase tracking-widest ml-1">Monto Recibido</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-primary-400">$</span>
                      <input 
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="w-full pl-10 pr-4 py-4 bg-white border-2 border-primary-200 rounded-2xl outline-none focus:border-brand font-black text-4xl text-primary-900 transition-all shadow-sm"
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="w-px h-16 bg-primary-200" />
                  <div className="flex-1">
                    <span className="text-xs font-black text-primary-700 uppercase tracking-widest block mb-1">Cambio</span>
                    <div className={`text-5xl font-black tracking-tighter transition-all ${
                      amountReceived && parseFloat(amountReceived) >= total ? 'text-emerald-600 drop-shadow-sm' : 'text-primary-300'
                    }`}>
                      ${(amountReceived && parseFloat(amountReceived) > total ? (parseFloat(amountReceived) - total) : 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'mixto' && (
                <div className="space-y-4 animate-in zoom-in-95">
                  <div className="bg-primary-50 rounded-[1.5rem] p-6 border border-primary-200 grid grid-cols-2 gap-6 shadow-inner">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-primary-700 uppercase ml-1">Efectivo</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-primary-400">$</span>
                        <input 
                          type="number"
                          value={mixedCash}
                          onChange={(e) => {
                            let val = parseFloat(e.target.value || 0);
                            if (val > total) val = total;
                            setMixedCash(val.toString());
                            setMixedTransfer((total - val).toFixed(2));
                          }}
                          className="w-full pl-7 pr-3 py-3 bg-white border-2 border-primary-200 rounded-xl outline-none focus:border-brand font-black text-2xl text-primary-900 transition-all shadow-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-primary-700 uppercase ml-1">Transferencia</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-primary-400">$</span>
                        <input 
                          type="number"
                          value={mixedTransfer}
                          onChange={(e) => {
                            let val = parseFloat(e.target.value || 0);
                            if (val > total) val = total;
                            setMixedTransfer(val.toString());
                            setMixedCash((total - val).toFixed(2));
                          }}
                          className="w-full pl-7 pr-3 py-3 bg-white border-2 border-primary-200 rounded-xl outline-none focus:border-brand font-black text-2xl text-primary-900 transition-all shadow-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-primary-900 uppercase tracking-widest ml-1">Cuenta para la Transferencia</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {banks.map(bank => (
                        <button
                          key={bank.id}
                          onClick={() => setSelectedBankId(bank.id)}
                          className={`p-3 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${
                            selectedBankId === bank.id 
                              ? 'bg-blue-50 border-blue-500 shadow-md scale-[1.01]' 
                              : 'bg-white border-primary-200 text-primary-600 hover:border-primary-400 hover:bg-primary-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                            selectedBankId === bank.id ? 'bg-blue-600 text-white' : 'bg-primary-100 text-primary-500'
                          }`}>
                            <Package size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className={`font-black text-xs uppercase truncate ${selectedBankId === bank.id ? 'text-blue-900' : 'text-primary-900'}`}>
                              {bank.bank_name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'transferencia' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <h4 className="text-xs font-black text-primary-900 uppercase tracking-widest ml-1">Seleccione una Cuenta</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {banks.map(bank => (
                      <button
                        key={bank.id}
                        onClick={() => setSelectedBankId(bank.id)}
                        className={`p-4 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${
                          selectedBankId === bank.id 
                            ? 'bg-blue-50 border-blue-500 shadow-lg scale-[1.02]' 
                            : 'bg-white border-primary-200 text-primary-600 hover:border-primary-400 hover:bg-primary-50'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                          selectedBankId === bank.id ? 'bg-blue-600 text-white' : 'bg-primary-100 text-primary-500'
                        }`}>
                          <Package size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className={`font-black text-sm uppercase truncate ${selectedBankId === bank.id ? 'text-blue-900' : 'text-primary-900'}`}>
                            {bank.bank_name}
                          </p>
                          <p className={`text-[10px] font-bold uppercase mt-0.5 ${selectedBankId === bank.id ? 'text-blue-700/70' : 'text-primary-500'}`}>
                            {bank.account_number}
                          </p>
                        </div>
                        {bank.qr_path && (
                          <div className="ml-auto w-10 h-10 bg-white p-1 rounded-md border border-primary-200 shrink-0 shadow-sm">
                            <img src={getImageUrl(bank.qr_path)} alt="QR" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subida de Comprobante */}
              {(paymentMethod === 'transferencia' || paymentMethod === 'mixto') && (
                <div className="space-y-3 animate-in zoom-in-95">
                  <h4 className="text-xs font-black text-primary-900 uppercase tracking-widest ml-1">Comprobante de Pago</h4>
                  <div className="flex items-center gap-4">
                    {!receiptFile ? (
                      <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary-200 rounded-2xl bg-primary-50/50 hover:bg-primary-50 hover:border-brand transition-all cursor-pointer group">
                        <ImageIcon className="text-primary-300 group-hover:text-brand transition-colors mb-2" size={32} />
                        <span className="text-[10px] font-black uppercase text-primary-400 group-hover:text-brand transition-colors">Adjuntar Imagen</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => setReceiptFile(e.target.files[0])}
                        />
                      </label>
                    ) : (
                      <div className="flex-1 relative rounded-2xl overflow-hidden border-2 border-brand bg-primary-50 h-32">
                        <img 
                          src={URL.createObjectURL(receiptFile)} 
                          alt="Comprobante" 
                          className="w-full h-full object-contain"
                        />
                        <button 
                          onClick={() => setReceiptFile(null)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="max-w-md mx-auto py-8 text-center space-y-6 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h4 className="text-3xl font-black text-primary-900 uppercase tracking-tight">¡VENTA EXITOSA!</h4>
                <p className="text-primary-600 font-bold text-base mt-2">La orden #{lastOrderNumber || lastOrderId} ha sido procesada.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => window.open(`${import.meta.env.VITE_API_URL}/orders/print?order_id=${lastOrderId}`, '_blank')}
                  className="p-5 bg-primary-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Printer size={18} />
                  Imprimir
                </button>
                <button 
                  onClick={onReset}
                  className="p-5 bg-white border-2 border-primary-200 text-primary-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:border-brand hover:text-brand transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <RefreshCw size={18} />
                  Nueva Venta
                </button>
              </div>
            </div>
          )}
        </div>

        {step < 2 && (
          <div className="p-6 bg-primary-50 border-t border-primary-100 flex gap-4">
            <button 
              onClick={() => step === 0 ? onClose() : setStep(0)}
              className="px-10 py-4 bg-white border-2 border-primary-300 text-primary-700 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-primary-100 transition-all active:scale-95 shadow-sm"
            >
              {step === 0 ? 'Cancelar' : 'Anterior'}
            </button>
            <button 
              onClick={() => {
                if (step === 0) setStep(1);
                else onSubmit();
              }}
              disabled={saving || (step === 1 && (
                (paymentMethod === 'efectivo' && (!amountReceived || parseFloat(amountReceived) < total)) ||
                (paymentMethod === 'transferencia' && !selectedBankId) ||
                (paymentMethod === 'mixto' && (!mixedCash || !mixedTransfer || (parseFloat(mixedCash) + parseFloat(mixedTransfer) < total)))
              ))}
              className="flex-1 py-4 bg-brand text-white font-black uppercase text-xs tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg active:scale-95 disabled:bg-primary-200 disabled:shadow-none"
            >
              {saving ? (
                <Loader2 className="mx-auto animate-spin" size={20} />
              ) : (
                step === 0 ? 'SIGUIENTE: PAGO' : 'FINALIZAR COBRO'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
