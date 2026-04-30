import { initializeApp } from "firebase/app";
import { getMessaging, onMessage, getToken } from "firebase/messaging";

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

export const requestForToken = () => {
  return getToken(messaging, { vapidKey: 'BHiqvtQxottxOkvDEsSmgN50n0o8yI4qbZKFh6VyboG-yH0LPusRqtVX4PQpMBFgnB094KN5YjAy0DZH3XrDKxI' })
    .then((currentToken) => {
      if (currentToken) {
        console.log('current token for client: ', currentToken);
        // Send token to server to subscribe to topics
        api.post('/notifications/subscribe', { token: currentToken, topic: 'new_orders' })
          .then(() => console.log('Subscribed to new_orders topic'))
          .catch(err => console.error('Error subscribing to topic:', err));
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    })
    .catch((err) => {
      console.log('An error occurred while retrieving token. ', err);
    });
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Payload received: ", payload);
      resolve(payload);
    });
  });
