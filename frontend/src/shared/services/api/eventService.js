/**
 * Event Service
 * Handles all event-related API calls
 */
import apiClient from './apiClient';

const eventService = {
  /**
   * Get all events (public view)
   */
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.skip) queryParams.append('skip', params.skip);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.status) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString();
    const response = await apiClient.get(`/events${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  /**
   * Get all events (admin view - includes inactive)
   */
  getAllAdmin: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.skip) queryParams.append('skip', params.skip);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.status) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString();
    const response = await apiClient.get(`/events/admin${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  /**
   * Get featured event
   */
  getFeatured: async () => {
    try {
      const response = await apiClient.get('/events/featured');
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  /**
   * Get event by slug
   */
  getBySlug: async (slug) => {
    const response = await apiClient.get(`/events/by-slug/${slug}`);
    return response.data;
  },

  /**
   * Get event by ID
   */
  getById: async (id) => {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  },

  /**
   * Create new event
   */
  create: async (eventData) => {
    const response = await apiClient.post('/events', eventData);
    return response.data;
  },

  /**
   * Update event
   */
  update: async (eventId, eventData) => {
    const response = await apiClient.put(`/events/${eventId}`, eventData);
    return response.data;
  },

  /**
   * Delete event
   */
  delete: async (eventId) => {
    const response = await apiClient.delete(`/events/${eventId}`);
    return response.data;
  },

  /**
   * Get event categories
   */
  getCategories: async () => {
    const response = await apiClient.get('/events/categories');
    return response.data;
  },

  /**
   * Upload image for event
   */
  uploadImage: async (file) => {
    if (!file) return null;
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.url;
  },
};

export default eventService;
