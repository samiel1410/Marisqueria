import axios from 'axios';

const getBaseUrl = () => {
  // Vite selecciona automáticamente el valor de .env o .env.production según el comando (npm run dev vs npm run build)
  return import.meta.env.VITE_API_URL || '/api/public';
};

export const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// Handle responses
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return Promise.reject(error);
  }

  if (error.response) {
    const msg = error.response.data?.error || error.response.data?.message || error.response.statusText;
    console.error('API error:', msg);
  } else if (error.request) {
    console.error('No response from server');
  }

  return Promise.reject(error);
});

// Decode JWT expiry without a library
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // ms
  } catch {
    return null;
  }
}

// Returns true if token exists and is not expired
export function isSessionValid() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  const expiry = getTokenExpiry(token);
  if (!expiry) return false;
  return Date.now() < expiry;
}

// Clear session data
export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export default api;
