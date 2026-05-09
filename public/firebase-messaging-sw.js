importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAtYB65LKbCFMi_RjMIsBlIS6yZ_Qkwxo4",
  authDomain: "marisqueria-98af1.firebaseapp.com",
  projectId: "marisqueria-98af1",
  storageBucket: "marisqueria-98af1.firebasestorage.app",
  messagingSenderId: "642738023956",
  appId: "1:642738023956:web:3db8825c84ce8870c48101"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Forward the message to any open tabs so they can trigger QZ Tray
  const channel = new BroadcastChannel('fcm_updates');
  channel.postMessage(payload);

  // Optionally show a notification if there's data we want to display
  if (payload.notification) {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/firebase-logo.png'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  } else if (payload.data && payload.data.type) {
    let title = "Nueva Notificación";
    let body = "Hay una nueva actualización en el sistema.";
    
    if (payload.data.type === 'print_kitchen_request') {
      title = "Imprimiendo Comanda";
      body = "Comanda de cocina enviada a la impresora.";
    } else if (payload.data.type === 'print_request') {
      title = "Imprimiendo Ticket";
      body = "Ticket de venta enviado a la impresora.";
    }

    self.registration.showNotification(title, { body, icon: '/firebase-logo.png' });
  }
});
