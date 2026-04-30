import React, { useState, useEffect } from 'react';
import api from '../../infrastructure/api';
import { Calendar, Check, X, Search, Plus, Loader2, Info } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { useToast } from '../components/Toast';

const DAYS = [
  { id: 'monday', label: 'Lunes' },
  { id: 'tuesday', label: 'Martes' },
  { id: 'wednesday', label: 'Miércoles' },
  { id: 'thursday', label: 'Jueves' },
  { id: 'friday', label: 'Viernes' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' }
];

const WeeklyPlanningPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null); // Which day is being edited
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/schedules');
      setProducts(Array.isArray(response.data) ? response.data : []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      setProducts([]);
      setLoading(false);
    }
  };

  const toggleProductDay = async (productId, dayId, currentValue) => {
    const newValue = currentValue ? 0 : 1;
    console.log(`[Planner] Toggling Product ${productId} on Day ${dayId} to ${newValue}`);
    
    // Update local state instantly for snappy UI
    const updatedProducts = products.map(p => {
      if (p.product_id === productId) {
        return { ...p, [dayId]: newValue };
      }
      return p;
    });
    setProducts(updatedProducts);

    const product = updatedProducts.find(p => p.product_id === productId);

    setSaving(productId);
    try {
      const payload = {
        product_id: product.product_id,
        monday: product.monday,
        tuesday: product.tuesday,
        wednesday: product.wednesday,
        thursday: product.thursday,
        friday: product.friday,
        saturday: product.saturday,
        sunday: product.sunday
      };
      console.log("[Planner] Saving payload:", payload);
      
      const response = await api.post('/schedules', payload);
      console.log("[Planner] Saved successfully:", response.data);
    } catch (error) {
      console.error("[Planner] Error al guardar el plato:", error.response?.data || error.message);
      addToast('Error al guardar: ' + (error.response?.data?.error || 'Ver consola'), 'error');
      // Revert on error
      fetchSchedules(); 
    } finally {
      setSaving(null);
    }
  };

  const filteredProductsForModal = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <PageHeader 
        title="Planeación Semanal" 
        subtitle="Configura qué platos deben estar disponibles cada día de la semana."
        icon={Calendar}
      />

      <div className="flex items-center gap-2 text-brand bg-brand/10 px-4 py-3 rounded-2xl border border-brand/20 w-fit mb-4">
        <Info size={20} />
        <p className="text-sm font-bold">Haz clic en cualquier día para administrar sus platos.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-brand" size={40} />
          <p className="text-slate-500 font-bold">Cargando planeación...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {DAYS.map(day => {
            const activeProducts = products.filter(p => Number(p[day.id]) === 1);
            
            return (
              <Card 
                key={day.id} 
                className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-2 border-transparent hover:border-brand/30"
                onClick={() => setSelectedDay(day)}
              >
                {/* Day Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between group-hover:bg-brand/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand font-bold">
                      {day.label.charAt(0)}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{day.label}</h3>
                  </div>
                  <Badge variant="brand" className="px-3">
                    {activeProducts.length} {activeProducts.length === 1 ? 'plato' : 'platos'}
                  </Badge>
                </div>
                
                {/* Day Content */}
                <div className="p-5">
                  {activeProducts.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 font-medium flex flex-col items-center gap-2">
                      <Plus size={24} className="text-slate-300" />
                      Añadir platos
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {activeProducts.map(p => (
                        <div key={p.product_id} className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
                          {p.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-sm font-bold text-brand flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Plus size={16} /> Configurar día
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Render the modal INLINE so React doesn't unmount it on re-render */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Menú para el {selectedDay.label}</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Selecciona los platos que estarán disponibles.</p>
              </div>
              <button 
                onClick={() => { setSelectedDay(null); setSearchTerm(''); }}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-slate-100">
               <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar plato..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand outline-none transition-all font-medium text-sm"
                />
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredProductsForModal.length === 0 ? (
                 <div className="text-center py-12 text-slate-400 font-medium">No se encontraron platos.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                  {filteredProductsForModal.map(product => {
                    const isActive = Number(product[selectedDay.id]) === 1;
                    return (
                      <button
                        key={product.product_id}
                        onClick={() => toggleProductDay(product.product_id, selectedDay.id, isActive)}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all ${
                          isActive 
                            ? 'border-brand bg-brand/5 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex-1 pr-4">
                          <p className={`font-bold text-sm ${isActive ? 'text-brand' : 'text-slate-700'}`}>
                            {product.name}
                          </p>
                          <p className="text-xs font-semibold text-slate-400 uppercase mt-0.5 tracking-tight">
                            {product.category_name}
                          </p>
                        </div>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                          isActive ? 'bg-brand text-white' : 'bg-slate-100 text-slate-300'
                        }`}>
                          {saving === product.product_id ? (
                             <Loader2 size={14} className="animate-spin" />
                          ) : isActive ? (
                             <Check size={16} strokeWidth={3} />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
              <Button variant="brand" fullWidth onClick={() => { setSelectedDay(null); setSearchTerm(''); }}>
                Listo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPlanningPage;
