/**
 * Event Service
 * Handles all event-related API calls
 */
import apiClient from './apiClient';
import uploadService from './uploadService';
import { getMediaUrl } from '../../utils/media';

const eventService = {
  /**
   * Data Mapper
   */
  _mapEvent: (e) => {
    if (!e) return null;
    const fullUrl = getMediaUrl(e.image_url || e.image, 'Event');
    return {
      ...e,
      image_url: fullUrl,
      imageUrl: fullUrl,
      image: fullUrl,
    };
  },

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
    const data = response.data;
    const events = data.events || data;
    return Array.isArray(events) ? events.map(eventService._mapEvent) : [];
  },

  /**
   * Get all events (admin view - includes inactive)
   */
  getAllAdmin: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.skip) queryParams.append('skip', params.skip);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const queryString = queryParams.toString();
    const response = await apiClient.get(`/events/admin${queryString ? `?${queryString}` : ''}`);
    const events = response.data.events || response.data;
    return Array.isArray(events) ? events.map(eventService._mapEvent) : [];
  },

  /**
   * Get featured event
   */
  getFeatured: async () => {
    try {
      const response = await apiClient.get('/events/featured');
      return eventService._mapEvent(response.data);
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
    return eventService._mapEvent(response.data);
  },

  /**
   * Get event by ID
   */
  getById: async (id) => {
    const response = await apiClient.get(`/events/${id}`);
    return eventService._mapEvent(response.data);
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
    return uploadService.uploadImage(file);
  },
};

export default eventService;
