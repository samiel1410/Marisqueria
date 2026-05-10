import { initializeApp } from "firebase/app";
import { getMessaging, onMessage, getToken, deleteToken } from "firebase/messaging";

// TODO: Replace with your actual Firebase Web config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAtYB65LKbCFMi_RjMIsBlIS6yZ_Qkwxo4",
  authDomain: "marisqueria-98af1.firebaseapp.com",
  projectId: "marisqueria-98af1",
  storageBucket: "marisqueria-98af1.firebasestorage.app",
  messagingSenderId: "642738023956",
  appId: "1:642738023956:web:3db8825c84ce8870c48101" // This needs to be obtained from Firebase Console -> Web App
};

import api from "./api";

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const requestForToken = async () => {
  console.log('%c[FCM]%c Requesting token...', 'color: #3b82f6; font-weight: bold;', '');
  
  try {
    if (!localStorage.getItem('fcm_token_reset_v4')) {
      await deleteToken(messaging);
      localStorage.setItem('fcm_token_reset_v4', 'true');
      console.log('%c[FCM]%c Old ghost token wiped successfully.', 'color: #3b82f6; font-weight: bold;', '');
    }
  } catch (e) {
    console.log('%c[FCM]%c Error deleting token:', 'color: #ef4444; font-weight: bold;', '', e);
  }

  return getToken(messaging, { vapidKey: 'BHiqvtQxottxOkvDEsSmgN50n0o8yI4qbZKFh6VyboG-yH0LPusRqtVX4PQpMBFgnB094KN5YjAy0DZH3XrDKxI' })
    .then((currentToken) => {
      if (currentToken) {
        console.log('%c[FCM]%c Token obtained:', 'color: #10b981; font-weight: bold;', '', currentToken.substring(0, 10) + '...');
        // Send token to server to subscribe to topics
        api.post('/notifications/subscribe', { token: currentToken, topic: 'new_orders' })
          .then(() => console.log('%c[FCM]%c Successfully subscribed to new_orders', 'color: #10b981; font-weight: bold;', ''))
          .catch(err => {
            console.error('%c[FCM]%c Error subscribing to topic:', 'color: #ef4444; font-weight: bold;', '', err);
            // Si falla la suscripción, avisamos que el tiempo real podría estar afectado
            window.dispatchEvent(new CustomEvent('fcm-status', { detail: 'error_subscription' }));
          });
      } else {
        console.warn('%c[FCM]%c No registration token available.', 'color: #f59e0b; font-weight: bold;', '');
        window.dispatchEvent(new CustomEvent('fcm-status', { detail: 'no_token' }));
      }
    })
    .catch((err) => {
      console.error('%c[FCM]%c Retrieval error:', 'color: #ef4444; font-weight: bold;', '', err);
      window.dispatchEvent(new CustomEvent('fcm-status', { detail: 'error' }));
    });
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Payload received: ", payload);
      resolve(payload);
    });
  });
