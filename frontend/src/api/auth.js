import { BASE_URL } from './http';

/**
 * Authentication API service
 */

/**
 * Login with email and password
 * @param {string} email User email
 * @param {string} password User password
 * @returns {Promise<Object>} Response with token
 */
export const login = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email); // OAuth2 expects 'username' field
  formData.append('password', password);

  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Giriş başarısız');
  }

  return response.json();
};

/**
 * Get authenticated user information
 * @param {string} token JWT token
 * @returns {Promise<Object>} User data
 */
export const getCurrentUser = async (token) => {
  if (!token) {
    throw new Error('Token required');
  }

  const response = await fetch(`${BASE_URL}/users/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get user information');
  }

  return response.json();
};

/**
 * Helper to get auth header for API requests
 * @returns {Object} Headers object with Authorization if token exists
 */
export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};
