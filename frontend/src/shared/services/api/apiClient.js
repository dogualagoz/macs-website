import axios from 'axios';
import env from '../../config/env';

// Base API URL
const API_BASE_URL = env.apiUrl;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const AUTH_STORAGE_KEYS = ['token', 'token_exp', 'user'];

/**
 * 401 yalnızca token gönderilmiş bir istekte "oturum düştü" demektir.
 *
 * Login isteği hatalı şifre, kilitli hesap ve pasif hesap için de 401 dönüyor.
 * Eskiden her 401 sayfayı /login?expired=1'e yeniden yüklüyordu; backend'in
 * mesajı kayboluyor, kullanıcı yanlış şifrede "Oturum süreniz doldu" görüyordu.
 */
export const isSessionExpiry = (error) => {
  if (error?.response?.status !== 401) return false;
  const config = error.config || {};
  if (String(config.url || '').includes('/auth/login')) return false;
  const headers = config.headers || {};
  const authHeader = typeof headers.get === 'function'
    ? headers.get('Authorization')
    : headers.Authorization;
  return Boolean(authHeader);
};

export const handleResponseError = (error) => {
  if (isSessionExpiry(error)) {
    AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    if (window.location.pathname !== '/login') {
      window.location.href = '/login?expired=1';
    }
  }

  if (error.response?.status === 403) {
    console.error('Access forbidden:', error.response.data);
  }

  return Promise.reject(error);
};

// Response interceptor - Handle common errors
apiClient.interceptors.response.use((response) => response, handleResponseError);

export default apiClient;
