import api, { BASE_URL } from './api';

/**
 * Configures QZ Tray security to allow silent printing.
 * This should be called once before any print request.
 */
export const initQZSecurity = () => {
  if (!window.qz) return;

  // Set the digital certificate
  window.qz.security.setCertificatePromise(function(resolve, reject) {
    console.log("QZ: Fetching certificate...");
    api.get('/qz/certificate', { responseType: 'text' })
      .then(response => {
        console.log("QZ: Certificate loaded");
        resolve(response.data);
      })
      .catch(err => {
        console.error("QZ: Error loading certificate:", err);
        reject(err);
      });
  });

  // Set the signature promise
  window.qz.security.setSignaturePromise(function(toSign) {
    return function(resolve, reject) {
      console.log("QZ: Signing message...", toSign);
      fetch(`${BASE_URL}/qz/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: toSign
      })
        .then(response => response.text())
        .then(data => {
          const trimmed = data.trim();
          console.log("QZ: Signature received (trimmed):", trimmed);
          resolve(trimmed);
        })
        .catch(err => {
          console.error("QZ: Error signing message:", err);
          reject(err);
        });
    };
  });
};

export const handleRemotePrint = async (orderId) => {
  const printer = localStorage.getItem('printer_name');
  const mode = localStorage.getItem('printer_mode') || 'qz';

  console.log(`Processing remote print request for Order #${orderId}. Mode: ${mode}, Printer: ${printer}`);

  if (mode !== 'qz') {
    console.warn("Modo de impresión no es QZ Tray.");
    return;
  }

  if (!window.qz) {
    alert("QZ Tray no está cargado en el navegador. Revisa tu conexión a internet o los scripts en index.html.");
    return;
  }

  if (!printer) {
    alert("No has configurado ninguna impresora. Ve a Configuración > Impresoras.");
    return;
  }

  try {
    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
    }
    
    // Determine if it's a direct host/IP or a system printer name
    const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(printer);
    const config = isIp 
      ? window.qz.configs.create({ host: printer, port: 9100 }) 
      : window.qz.configs.create(printer);

    const response = await api.get(`/orders/print?order_id=${orderId}`);
    const data = response.data;

    const printData = [
      {
        type: 'pixel',
        format: 'html',
        flavor: 'plain',
        options: { pageWidth: 2.28, units: 'in' },
        data: `
          <div style="font-family: 'Courier New', Courier, monospace; width: 58mm; margin: 0 auto; padding: 0 2mm; font-size: 10px; color: #000; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 10px;">
              <h2 style="margin: 0; font-size: 16px; font-weight: bold;">KRUSTACIO KASCARUDO</h2>
              <p style="margin: 0; font-size: 11px;">Nota de Venta</p>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span><b>Pedido:</b> #${data.daily_number || data.id}</span>
              <span><b>Mesa:</b> ${data.table_number || 'Llevar'}</span>
            </div>
            <div style="margin-bottom: 4px;"><b>Fecha:</b> ${data.created_at}</div>
            <div style="margin-bottom: 2px;"><b>Cliente:</b> ${data.customer_name || 'CONSUMIDOR FINAL'}</div>
            <div style="margin-bottom: 10px;"><b>ID:</b> ${data.customer_id_number || '9999999999'}</div>
            
            <div style="border-top: 1px dashed #000; margin-bottom: 5px;"></div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="border-bottom: 1px dashed #000;">
                  <th style="text-align: left; padding: 4px 0;">Cant.</th>
                  <th style="text-align: left; padding: 4px 0;">Producto</th>
                  <th style="text-align: right; padding: 4px 0;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map(item => `
                  <tr>
                    <td style="vertical-align: top; padding: 4px 0;">${item.quantity}</td>
                    <td style="vertical-align: top; padding: 4px 0;">${item.product_name}</td>
                    <td style="vertical-align: top; text-align: right; padding: 4px 0;">$${(item.quantity * item.price).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="border-top: 1px dashed #000; margin-top: 5px; margin-bottom: 5px;"></div>
            
            <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 5px;">
              <span>TOTAL:</span>
              <span>$${parseFloat(data.total).toFixed(2)}</span>
            </div>
            
            ${data.payments && data.payments.length > 0 ? `
              <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px;">
                <p style="margin: 0 0 5px 0; font-weight: bold; font-size: 11px;">MÉTODOS DE PAGO:</p>
                ${data.payments.map(p => `
                  <div style="display: flex; justify-content: space-between; font-size: 11px;">
                    <span>${p.payment_method.toUpperCase()}${p.bank_name ? ` (${p.bank_name})` : ''}</span>
                    <span>$${parseFloat(p.amount).toFixed(2)}</span>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="margin-top: 10px; text-align: center; font-weight: bold; font-size: 12px; border: 1px solid #000; padding: 2px;">
                PENDIENTE DE PAGO
              </div>
            `}

            <div style="text-align: center; margin-top: 20px; border-top: 1px solid #eee; pt-10">
              <p style="margin: 0; font-style: italic;">¡Gracias por su preferencia!</p>
            </div>
          </div>
        `
      }
    ];
    
    await window.qz.print(config, printData);
    console.log("Print successful");
  } catch (err) {
    console.error("QZ Tray remote print error:", err);
    alert("Error de impresión: " + err.message);
  }
};

export const handleRemoteKitchenPrint = async (orderId) => {
  const printer = localStorage.getItem('printer_name');
  const mode = localStorage.getItem('printer_mode') || 'qz';

  console.log(`Processing remote kitchen print request for Order #${orderId}. Mode: ${mode}, Printer: ${printer}`);

  if (mode !== 'qz') {
    console.warn("Modo de impresión no es QZ Tray.");
    return;
  }

  if (!window.qz) {
    alert("QZ Tray no está cargado en el navegador.");
    return;
  }

  if (!printer) {
    alert("No has configurado ninguna impresora.");
    return;
  }

  try {
    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
    }
    
    const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(printer);
    const config = isIp 
      ? window.qz.configs.create({ host: printer, port: 9100 }) 
      : window.qz.configs.create(printer);

    const response = await api.get(`/orders/print-kitchen?order_id=${orderId}&raw_html=1`, {
      responseType: 'text'
    });
    
    const htmlData = response.data;
    const printData = [{ type: 'pixel', format: 'html', flavor: 'plain', data: htmlData }];
    
    await window.qz.print(config, printData);
    console.log("Kitchen Print successful");
  } catch (err) {
    console.error("QZ Tray remote kitchen print error:", err);
    alert("Error de impresión de comanda: " + err.message);
  }
};

export const handleRemoteCashPrint = async (sessionId) => {
  const printer = localStorage.getItem('printer_name');
  const mode = localStorage.getItem('printer_mode') || 'qz';

  if (mode === 'qz' && window.qz && printer) {
    try {
      if (!window.qz.websocket.isActive()) {
        await window.qz.websocket.connect();
      }
      
      // Determine if it's a direct host/IP or a system printer name
      const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(printer);
      const config = isIp 
        ? window.qz.configs.create({ host: printer, port: 9100 }) 
        : window.qz.configs.create(printer);

      // Fetch the raw HTML from the server
      const response = await api.get(`/cash/session-print?id=${sessionId}&download=1&raw_html=1`, {
        responseType: 'text' // Important to get raw string instead of JSON
      });
      
      const htmlData = response.data;
      const printData = [{ type: 'pixel', format: 'html', flavor: 'plain', data: htmlData }];
      await window.qz.print(config, printData);
      console.log("HTML Print successful");
    } catch (err) {
      console.error("QZ Tray HTML print error:", err);
    }
  } else {
    console.warn("Printer not configured or mode not set to QZ Tray. Cannot auto-print.");
  }
};

export const handleRemoteInventoryPrint = async (filter, branchId) => {
  const printer = localStorage.getItem('printer_name');
  const mode = localStorage.getItem('printer_mode') || 'qz';

  if (mode === 'qz' && window.qz && printer) {
    try {
      if (!window.qz.websocket.isActive()) {
        await window.qz.websocket.connect();
      }
      
      // Determine if it's a direct host/IP or a system printer name
      const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(printer);
      const config = isIp 
        ? window.qz.configs.create({ host: printer, port: 9100 }) 
        : window.qz.configs.create(printer);

      const query = `filter=${filter || 'all'}${branchId ? `&branch_id=${branchId}` : ''}`;
      const response = await api.get(`/inventory/report-print?${query}&raw_html=1`, {
        responseType: 'text'
      });
      
      const htmlData = response.data;
      const printData = [{ type: 'pixel', format: 'html', flavor: 'plain', data: htmlData }];
      await window.qz.print(config, printData);
      console.log("Inventory Print successful");
    } catch (err) {
      console.error("QZ Tray Inventory print error:", err);
    }
  } else {
    console.warn("Printer not configured or mode not set to QZ Tray.");
  }
};
