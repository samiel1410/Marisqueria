import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Clean up old service workers (like those from vite-plugin-pwa)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      if (!registration.active?.scriptURL.includes('firebase-messaging-sw.js')) {
        registration.unregister()
      }
    }
  })
}

createRoot(document.getElementById('root')).render(
  <App />
)
