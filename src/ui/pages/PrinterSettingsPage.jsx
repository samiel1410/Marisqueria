import React, { useState, useEffect } from 'react';
import { Printer, Bluetooth, Usb, CheckCircle2, RefreshCw, AlertCircle, Settings2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';

const PrinterSettingsPage = () => {
  const [mode, setMode] = useState(localStorage.getItem('printer_mode') || 'qz'); // 'qz' or 'bluetooth'
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(localStorage.getItem('printer_name') || '');
  const [qzStatus, setQzStatus] = useState('loading');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mode === 'qz') {
      checkQzStatus();
    }
  }, [mode]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    localStorage.setItem('printer_mode', newMode);
  };

  const checkQzStatus = async () => {
    setQzStatus('loading');
    setError(null);
    if (window.qz) {
      try {
        if (!window.qz.websocket.isActive()) {
          await window.qz.websocket.connect();
        }
        setQzStatus('connected');
        fetchPrinters();
      } catch (err) {
        setQzStatus('disconnected');
        setError("Servicio QZ Tray no detectado o bloqueado.");
      }
    } else {
      setQzStatus('disconnected');
    }
  };

  const fetchPrinters = async () => {
    if (!window.qz || !window.qz.websocket.isActive()) return;
    setIsScanning(true);
    try {
      const list = await window.qz.printers.find();
      setPrinters(list);
    } catch (err) {
      setError("Error al listar impresoras de QZ Tray");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectPrinter = (name) => {
    setSelectedPrinter(name);
    localStorage.setItem('printer_name', name);
  };

  const handleTestPrint = async (printerName) => {
    if (!window.qz || !window.qz.websocket.isActive()) {
      alert("QZ Tray no está conectado.");
      return;
    }
    try {
      const config = window.qz.configs.create(printerName);
      const printData = [{
        type: 'html',
        format: 'plain',
        data: `
          <div style="font-family: 'Courier New', Courier, monospace; width: 260px; text-align: center; border: 1px dashed #ccc; padding: 10px; box-sizing: border-box;">
            <h3 style="margin: 0; font-size: 16px;">MARISQUERÍA</h3>
            <p style="margin: 5px 0; font-size: 12px; font-weight: bold;">PRUEBA DE CONEXIÓN</p>
            <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
            <p style="font-size: 11px; margin-bottom: 5px;">Impresora configurada vía QZ Tray.</p>
            <p style="font-size: 11px; margin: 0;">${new Date().toLocaleString()}</p>
          </div>
        `
      }];
      await window.qz.print(config, printData);
    } catch (err) {
      alert("Error en la impresión: " + err.message);
    }
  };

  const scanBluetooth = async () => {
    if (!navigator.bluetooth) {
      alert("Tu navegador no soporta Bluetooth Web. Usa Chrome o Edge.");
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true
      });
      alert(`Conectado a: ${device.name}. (Nota: La impresión Bluetooth Web requiere drivers específicos o QZ Tray para ESC/POS).`);
    } catch (err) {
      console.log("Bluetooth error:", err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Configuración de Impresora" 
        subtitle="Elige el método de conexión para tus tickets de venta."
        icon={Settings2}
      />

      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => handleModeChange('qz')}
          className={`relative p-8 rounded-[2rem] border-2 transition-all flex items-center gap-6 ${
            mode === 'qz' 
              ? 'border-sky-500 bg-sky-50/30 shadow-xl shadow-sky-100' 
              : 'border-slate-100 bg-white hover:border-slate-200 text-slate-400'
          }`}
        >
          <div className={`p-5 rounded-2xl ${mode === 'qz' ? 'bg-sky-500 text-white' : 'bg-slate-100'}`}>
            <Usb size={32} />
          </div>
          <div className="text-left">
            <h3 className={`text-xl font-bold ${mode === 'qz' ? 'text-slate-800' : 'text-slate-500'}`}>QZ Tray</h3>
            <p className="text-sm font-medium text-slate-400">Cable USB / Red Local</p>
          </div>
          {mode === 'qz' && <CheckCircle2 className="absolute top-6 right-6 text-sky-500" size={24} />}
        </button>

        <button 
          onClick={() => handleModeChange('bluetooth')}
          className={`relative p-8 rounded-[2rem] border-2 transition-all flex items-center gap-6 ${
            mode === 'bluetooth' 
              ? 'border-indigo-500 bg-indigo-50/30 shadow-xl shadow-indigo-100' 
              : 'border-slate-100 bg-white hover:border-slate-200 text-slate-400'
          }`}
        >
          <div className={`p-5 rounded-2xl ${mode === 'bluetooth' ? 'bg-indigo-500 text-white' : 'bg-slate-100'}`}>
            <Bluetooth size={32} />
          </div>
          <div className="text-left">
            <h3 className={`text-xl font-bold ${mode === 'bluetooth' ? 'text-slate-800' : 'text-slate-500'}`}>Bluetooth</h3>
            <p className="text-sm font-medium text-slate-400">Conexión Inalámbrica Web</p>
          </div>
          {mode === 'bluetooth' && <CheckCircle2 className="absolute top-6 right-6 text-indigo-500" size={24} />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {mode === 'qz' ? (
          <>
            {/* QZ Tray Content */}
            <div className="lg:col-span-1">
              <Card className="p-6 h-full">
                <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <RefreshCw size={18} className={qzStatus === 'loading' ? 'animate-spin' : ''} />
                  Estado del Servicio
                </h4>
                <div className={`p-4 rounded-2xl border flex items-center justify-between mb-4 ${
                  qzStatus === 'connected' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
                }`}>
                  <span className={`font-bold ${qzStatus === 'connected' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {qzStatus === 'connected' ? 'Servicio Activo' : 'Servicio Inactivo'}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${qzStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                </div>
                <Button variant="outline" className="w-full" onClick={checkQzStatus}>Reintentar Conexión</Button>
                
                <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">Importante</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Para usar este modo, debes tener la aplicación <b>QZ Tray</b> abierta en tu computadora de escritorio.
                  </p>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="p-8">
                <h4 className="text-xl font-bold text-slate-800 mb-6">Selecciona tu Impresora</h4>
                {printers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {printers.map((printer, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectPrinter(printer)}
                        className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left ${
                          selectedPrinter === printer ? 'border-sky-500 bg-sky-50/50' : 'border-slate-50 hover:bg-slate-50'
                        }`}
                      >
                        <Printer className={selectedPrinter === printer ? 'text-sky-500' : 'text-slate-300'} />
                        <span className={`flex-1 font-bold truncate ${selectedPrinter === printer ? 'text-sky-900' : 'text-slate-600'}`}>{printer}</span>
                        {selectedPrinter === printer && (
                          <Button size="sm" className="h-8 px-3 bg-sky-500 text-[10px]" onClick={(e) => { e.stopPropagation(); handleTestPrint(printer); }}>PRUEBA</Button>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 font-medium">No se detectaron impresoras instaladas.</div>
                )}
              </Card>
            </div>
          </>
        ) : (
          /* Bluetooth Content */
          <div className="lg:col-span-3">
            <Card className="p-12 text-center max-w-2xl mx-auto">
              <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
                <Bluetooth size={48} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Impresión por Bluetooth</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Utiliza la tecnología Bluetooth de tu navegador para conectar directamente con impresoras térmicas portátiles.
              </p>
              <Button 
                size="lg" 
                className="bg-indigo-600 hover:bg-indigo-700 px-12 rounded-2xl h-14 text-lg"
                onClick={scanBluetooth}
              >
                Buscar Dispositivos
              </Button>
              <div className="mt-12 flex items-center justify-center gap-8 border-t border-slate-100 pt-8 text-slate-400">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest"><CheckCircle2 size={16}/> Chrome</div>
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest"><CheckCircle2 size={16}/> Edge</div>
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest"><CheckCircle2 size={16}/> Opera</div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrinterSettingsPage;
