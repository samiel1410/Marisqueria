import React, { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../infrastructure/api';
import { 
  Plus, 
  Trash2, 
  CreditCard, 
  Camera,
  X,
  Banknote,
  Building
} from 'lucide-react';

const BankAccountsPage = () => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [form, setForm] = useState({
    bank_name: '',
    account_number: '',
    account_type: 'Ahorros',
    owner_name: '',
    owner_id: '',
    qr: null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBanks();
  }, []);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching banks:", error);
      setLoading(false);
    }
  };

  const handleOpenModal = (bank = null) => {
    if (bank) {
      setEditingBank(bank);
      setForm({
        bank_name: bank.bank_name,
        account_number: bank.account_number,
        account_type: bank.account_type || 'Ahorros',
        owner_name: bank.owner_name || '',
        owner_id: bank.owner_id || '',
        qr: null
      });
    } else {
      setEditingBank(null);
      setForm({
        bank_name: '',
        account_number: '',
        account_type: 'Ahorros',
        owner_name: '',
        owner_id: '',
        qr: null
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (form[key] !== null) {
          formData.append(key, form[key]);
        }
      });
      if (editingBank) formData.append('id', editingBank.id);
      
      await api.post('/banks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowModal(false);
      fetchBanks();
    } catch (error) {
      alert("Error al guardar cuenta bancaria");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de desactivar esta cuenta?")) return;
    try {
      await api.post('/banks/delete', { id });
      fetchBanks();
    } catch (error) {
      console.error("Error deleting bank:", error);
    }
  };

  const handleQrUpload = async (id, file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('qr', file);
    formData.append('id', id);

    try {
      await api.post('/banks/upload-qr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchBanks();
      setUploading(false);
    } catch (error) {
      setUploading(false);
      alert("Error al subir imagen");
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cuentas Bancarias</h1>
          <p className="text-slate-500 mt-1">Gestiona las cuentas donde tus clientes realizarán transferencias.</p>
        </div>
      </div>


      <div className="flex justify-between items-center pt-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Listado de Cuentas
        </h2>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-sky-100"
        >
          <Plus size={20} /> Nueva Cuenta
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-slate-400">Cargando cuentas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banks.map((bank) => (
            <div key={bank.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-sky-50 p-3 rounded-xl text-sky-600"><Building size={24} /></div>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenModal(bank)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"><Plus size={18} /></button>
                    <button onClick={() => handleDelete(bank.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
                <h3 className="font-bold text-lg text-slate-800">{bank.bank_name}</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p className="flex justify-between"><span>N° Cuenta:</span> <span className="font-medium text-slate-800">{bank.account_number}</span></p>
                  <p className="flex justify-between"><span>Titular:</span> <span className="font-medium text-slate-800">{bank.owner_name}</span></p>
                  <p className="flex justify-between"><span>Cédula/RUC:</span> <span className="font-medium text-slate-800">{bank.owner_id}</span></p>
                </div>
              </div>
              <div className="border-t border-slate-50 bg-slate-50/50 p-4">
                {bank.qr_path ? (
                  <div className="relative group/qr">
                    <img src={getImageUrl(bank.qr_path)} alt="QR" className="w-full h-32 object-contain rounded-lg bg-white p-2 border border-slate-100" />
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-lg">
                      <Camera className="text-white" /><input type="file" className="hidden" onChange={(e) => handleQrUpload(bank.id, e.target.files[0])} />
                    </label>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-sky-300 hover:bg-sky-50 transition-all">
                    <Camera className="text-slate-300" /><span className="text-xs font-medium text-slate-400">Subir QR</span>
                    <input type="file" className="hidden" onChange={(e) => handleQrUpload(bank.id, e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">{editingBank ? 'Editar Cuenta' : 'Nueva Cuenta'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Banco</label>
                <input type="text" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">N° Cuenta</label>
                  <input type="text" value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo</label>
                  <select value={form.account_type} onChange={e => setForm({...form, account_type: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200">
                    <option value="Ahorros">Ahorros</option>
                    <option value="Corriente">Corriente</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Titular</label>
                  <input type="text" value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Cédula / RUC</label>
                  <input type="text" value={form.owner_id} onChange={e => setForm({...form, owner_id: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Imagen QR de Transferencia</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="space-y-1 text-center">
                    <Camera className="mx-auto h-12 w-12 text-slate-300" />
                    <div className="flex text-sm text-slate-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-bold text-sky-500 hover:text-sky-600 focus-within:outline-none">
                        <span>Subir un archivo</span>
                        <input 
                          type="file" 
                          className="sr-only" 
                          accept="image/*"
                          onChange={e => setForm({...form, qr: e.target.files[0]})}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-slate-400">PNG, JPG, GIF hasta 10MB</p>
                    {form.qr && <p className="text-xs text-emerald-500 font-bold">✓ {form.qr.name}</p>}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200">Cancelar</button>
                <button type="submit" className="flex-1 bg-sky-500 text-white px-4 py-2.5 rounded-xl font-bold disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccountsPage;
