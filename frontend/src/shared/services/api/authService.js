/**
 * Auth Service
 * Handles authentication-related API calls
 */
import apiClient from './apiClient';

const authService = {
  /**
   * Login with email and password
   */
  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 expects 'username' field
    formData.append('password', password);

    const response = await apiClient.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  },

  /**
   * Logout (client-side token removal)
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  /**
   * Verify token validity
   */
  verifyToken: async (token) => {
    try {
      const response = await apiClient.get('/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get stored token from localStorage
   */
  getToken: () => {
    return localStorage.getItem('token');
  },

  /**
   * Store token in localStorage
   */
  setToken: (token) => {
    localStorage.setItem('token', token);
  },

  /**
   * Get stored user from localStorage
   */
  getStoredUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Store user in localStorage
   */
  setStoredUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },
};

export default authService;
