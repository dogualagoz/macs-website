/**
 * Event Service
 * Handles all event-related API calls
 */
import apiClient from './apiClient';
import uploadService from './uploadService';
import { fetchAllPages } from './paginate';
import { getMediaUrl } from '../../utils/media';
import { safeExternalUrl } from '../../utils/safeUrl';

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
      // Dış bağlantılar href'e basılıyor: yalnızca http(s) geçer (bkz. safeUrl).
      registration_link: safeExternalUrl(e.registration_link),
      directions_link: safeExternalUrl(e.directions_link),
    };
  },

  /**
   * Tek sayfa çeker (public). Backend düz dizi döndürüyor, total yok.
   */
  getPage: async (params = {}) => {
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
   * Get all events (public view)
   *
   * Backend'in limit varsayılanı 10, tavanı 100. Parametresiz çağrı eskiden
   * yalnızca ilk 10 etkinliği getiriyordu; etkinlikler sayfası ve arşiv
   * geri kalanını hiç göstermiyordu. params.limit verilirse tek sayfa döner.
   */
  getAll: async (params = {}) => {
    if (params.limit) return eventService.getPage(params);
    return fetchAllPages(
      async (skip, limit) => ({ items: await eventService.getPage({ ...params, skip, limit }) }),
      100
    );
  },

  /**
   * Get all events (admin view - includes inactive). Tavan 200, tüm sayfalar dolaşılır.
   */
  getAllAdmin: async (params = {}) => {
    const fetchPage = async (skip, limit) => {
      const queryParams = new URLSearchParams();
      if (skip) queryParams.append('skip', skip);
      queryParams.append('limit', limit);
      const response = await apiClient.get(`/events/admin?${queryParams.toString()}`);
      const events = response.data.events || response.data;
      return { items: Array.isArray(events) ? events.map(eventService._mapEvent) : [] };
    };
    if (params.limit) return (await fetchPage(params.skip || 0, params.limit)).items;
    return fetchAllPages(fetchPage, 200);
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
