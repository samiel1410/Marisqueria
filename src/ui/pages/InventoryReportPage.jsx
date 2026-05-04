import { useState, useEffect } from 'react';
import api from '../../infrastructure/api';
import { FileDown, Search, Loader2, Package, Filter, Printer } from 'lucide-react';
import { Button } from '../components/Button';
import { Select } from '../components/Input';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import DataTable from '../components/DataTable';
import * as XLSX from 'xlsx';

const InventoryReportPage = () => {
  const [data, setData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState('all'); // all, manages, not_manages
  const [filterBranch, setFilterBranch] = useState('');
  
  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.branches || []);
    } catch (err) { console.error(err); }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter: filterType,
        branch_id: filterBranch
      });
      const res = await api.get(`/inventory/report?${params.toString()}`);
      setData(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filterType, filterBranch]);

  const exportToExcel = () => {
    if (data.length === 0) return;
    setExporting(true);
    
    try {
      const reportData = data.map(item => ({
        'Producto': item.name,
        'Categoría': item.category_name || 'Sin categoría',
        'Marca': item.brand_name || 'Sin marca',
        'Precio': parseFloat(item.price || 0),
        'Stock Actual': item.manages_inventory == 1 ? item.current_stock : 'Ilimitado',
        'Unidad': item.unit,
        'Maneja Inventario': item.manages_inventory == 1 ? 'Sí' : 'No',
        'Stock Mínimo': item.manages_inventory == 1 ? item.min_stock : 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(reportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");
      
      const fileName = `Reporte_Inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Error exporting Excel:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <PageHeader
        title="Reporte de Inventario"
        subtitle="Analiza el estado actual de tus productos y existencias"
        action={
          <div className="flex gap-2">
            <Button 
              variant="brand" 
              icon={FileDown} 
              onClick={exportToExcel}
              disabled={loading || data.length === 0 || exporting}
              loading={exporting}
            >
              Exportar a Excel
            </Button>
            <Button 
              variant="outline" 
              icon={Printer} 
              onClick={() => window.print()}
              disabled={loading || data.length === 0}
            >
              Imprimir
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="card p-6 mb-8 bg-white shadow-sm border border-primary-100 rounded-2xl">
        <div className="flex flex-wrap gap-6 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-primary-700 mb-2 flex items-center gap-2">
              <Filter size={16} className="text-brand" />
              Tipo de Producto
            </label>
            <Select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              options={[
                { value: 'all', label: 'Todos los productos' },
                { value: 'manages', label: 'Solo los que manejan inventario' },
                { value: 'not_manages', label: 'Solo los que NO manejan inventario' }
              ]}
            />
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-primary-700 mb-2 flex items-center gap-2">
              <Package size={16} className="text-brand" />
              Sucursal
            </label>
            <Select 
              value={filterBranch} 
              onChange={e => setFilterBranch(e.target.value)}
              options={[
                { value: '', label: 'Stock Consolidado (Todas)' },
                ...branches.map(b => ({ value: b.id, label: b.name }))
              ]}
            />
          </div>
          
          <div className="flex items-center gap-4 py-2">
            <div className="text-right">
              <p className="text-xs text-primary-400 font-medium uppercase tracking-wider">Total Productos</p>
              <p className="text-xl font-bold text-primary-900">{data.length}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-brand" size={40}/>
            <p className="text-primary-500 font-medium">Generando reporte...</p>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden rounded-2xl border border-primary-100 shadow-sm">
          <DataTable
            columns={[
              { key: 'name', header: 'Producto', render: r => (
                <div>
                  <p className="font-semibold text-primary-900">{r.name}</p>
                  <p className="text-xs text-primary-400">{r.brand_name || 'Sin marca'}</p>
                </div>
              )},
              { key: 'category_name', header: 'Categoría', render: r => (
                <Badge variant="default">{r.category_name || '—'}</Badge>
              )},
              { key: 'price', header: 'Precio', render: r => (
                <span className="font-semibold text-success">${parseFloat(r.price||0).toFixed(2)}</span>
              )},
              { key: 'stock', header: 'Stock Actual', render: r => (
                r.manages_inventory == 1 ? (
                  <div className="flex flex-col">
                    <span className={`font-bold ${r.current_stock <= 0 ? 'text-red-500' : r.current_stock <= (r.min_stock||5) ? 'text-amber-500' : 'text-primary-700'}`}>
                      {r.current_stock} {r.unit}
                    </span>
                    {r.current_stock <= (r.min_stock||5) && r.current_stock > 0 && (
                      <span className="text-[10px] text-amber-600 font-medium">Por debajo del mínimo ({r.min_stock})</span>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline">Ilimitado</Badge>
                )
              )},
              { key: 'manages', header: 'Maneja Inv.', render: r => (
                r.manages_inventory == 1 
                  ? <Badge variant="success">Sí</Badge> 
                  : <Badge variant="default">No</Badge>
              )},
            ]}
            data={data}
            empty={{ 
              title: 'No hay datos', 
              description: 'No se encontraron productos con los filtros seleccionados.', 
              icon: Package 
            }}
          />
        </div>
      )}
      
      {/* Printable summary */}
      <div className="hidden print:block mt-8 border-t pt-4">
        <p className="text-sm text-primary-500">Reporte generado el: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default InventoryReportPage;
