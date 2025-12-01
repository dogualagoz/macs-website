/**
 * User Service
 * Handles all user-related API calls
 */
import apiClient from './apiClient';

const userService = {
  /**
   * Get all users (admin only)
   */
  getAll: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  /**
   * Get current user info
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  /**
   * Get user by ID
   */
  getById: async (userId) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  /**
   * Create new user (admin only)
   */
  create: async (userData) => {
    const response = await apiClient.post('/users', userData);
    return response.data;
  },

  /**
   * Update user
   */
  update: async (userId, userData) => {
    const response = await apiClient.put(`/users/${userId}`, userData);
    return response.data;
  },

  /**
   * Delete user (admin only)
   */
  delete: async (userId) => {
    const response = await apiClient.delete(`/users/${userId}`);
    
    // Handle 204 No Content response
    if (response.status === 204) {
      return { success: true };
    }
    
    return response.data || { success: true };
  },
};

export default userService;
