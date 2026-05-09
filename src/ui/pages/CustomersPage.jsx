import React, { useState, useEffect } from 'react';
import api from '../../infrastructure/api';
import { Users, Search, Plus, Mail, Phone, IdCard, Edit2, Trash2, UserPlus, Filter } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import DataTable from '../components/DataTable';
import { useToast } from '../components';
import { Badge } from '../components/Badge';

const CustomersPage = () => {
  const { show: showToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    identification: '',
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchCustomers();
    }, searchQuery ? 400 : 0); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery, page]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/customers?page=${page}&search=${searchQuery}`);
      setCustomers(response.data.data || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalItems(response.data.total || 0);
    } catch (error) {
      showToast("Error al cargar clientes", { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        identification: customer.identification,
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        identification: '',
        name: '',
        email: '',
        phone: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers', formData);
      showToast(editingCustomer ? "Cliente actualizado" : "Cliente creado", { type: 'success' });
      setIsModalOpen(false);
      fetchCustomers();
    } catch (error) {
      showToast("Error al guardar cliente", { type: 'error' });
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Cliente',
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-black">
            {c.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-primary-900">{c.name}</span>
            <span className="text-[10px] text-primary-400 font-bold uppercase tracking-widest">{c.email || 'Sin correo'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'identification',
      header: 'Identificación',
      render: (c) => (
        <Badge variant="secondary" className="font-mono text-xs tracking-wider">
          {c.identification}
        </Badge>
      )
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (c) => (
        <div className="flex items-center gap-2 text-primary-600">
          <Phone size={14} className="text-primary-300" />
          <span className="text-xs font-semibold">{c.phone || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => handleOpenModal(c)}
            className="p-2 hover:bg-primary-100 rounded-xl transition-colors text-primary-400 hover:text-brand"
          >
            <Edit2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">
      <PageHeader 
        title="Gestión de Clientes" 
        subtitle="Administra la base de datos de tus clientes frecuentes"
        action={
          <Button variant="brand" icon={UserPlus} onClick={() => handleOpenModal()}>
            Nuevo Cliente
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o identificación..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1); // Reset to page 1 on search
                    }}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/50 backdrop-blur-md border border-primary-100 outline-none focus:border-brand transition-all"
                />
            </div>
            <Button variant="outline" icon={Filter} className="hidden md:flex">Filtros</Button>
        </div>
        
        <div className="text-xs font-bold text-primary-400 uppercase tracking-widest">
            Mostrando {customers.length} de {totalItems} Clientes
        </div>
      </div>

      <div className="bg-transparent mb-6">
        <DataTable
          columns={columns}
          data={customers}
          loading={loading}
          pagination={{
            current: page,
            total: totalItems,
            pageSize: 50,
            onChange: setPage
          }}
          className="bg-transparent"
        />
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-primary-100 flex items-center justify-between bg-primary-50/50">
              <h3 className="text-xl font-black text-primary-900">
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-primary-100 rounded-xl transition-colors">
                <Users size={20} className="text-primary-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-primary-400 uppercase tracking-widest">Identificación (Cédula/RUC)</label>
                <input
                  required
                  type="text"
                  value={formData.identification}
                  onChange={(e) => setFormData({...formData, identification: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl bg-primary-50 border border-primary-100 outline-none focus:border-brand transition-all font-bold"
                  placeholder="Ej: 0999999999"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-primary-400 uppercase tracking-widest">Nombre Completo</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl bg-primary-50 border border-primary-100 outline-none focus:border-brand transition-all font-bold"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-primary-400 uppercase tracking-widest">Correo</label>
                    <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-5 py-3 rounded-2xl bg-primary-50 border border-primary-100 outline-none focus:border-brand transition-all font-semibold text-sm"
                    placeholder="email@ejemplo.com"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-primary-400 uppercase tracking-widest">Teléfono</label>
                    <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-5 py-3 rounded-2xl bg-primary-50 border border-primary-100 outline-none focus:border-brand transition-all font-semibold text-sm"
                    placeholder="09..."
                    />
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 py-4 rounded-2xl font-bold" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  variant="brand" 
                  className="flex-1 py-4 rounded-2xl font-black shadow-lg shadow-brand/20"
                >
                  {editingCustomer ? 'Guardar Cambios' : 'Registrar Cliente'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
