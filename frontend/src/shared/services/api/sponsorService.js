import apiClient from './apiClient';
import uploadService from './uploadService';
import { fetchAllPages } from './paginate';
import env from '../../config/env';
import { getMediaUrl } from '../../utils/media';

const MAPBOX_TOKEN = env.mapboxToken;

const sponsorService = {
  /**
   * Data Mapper
   */
  _mapSponsor: (s) => {
    if (!s) return null;
    const fullUrl = getMediaUrl(s.image_url || s.logo_url || s.logo || s.logoUrl || s.imageUrl, 'Sponsor');
    return {
      ...s,
      logo_url: fullUrl,
      logoUrl: fullUrl,
      logo: fullUrl,
      discountInfo: s.discount_info || s.discountInfo,
    };
  },

  getPage: async (params = {}) => {
    const response = await apiClient.get('/sponsors/', { params });
    const sponsors = response.data.sponsors || response.data;
    return Array.isArray(sponsors) ? sponsors.map(sponsorService._mapSponsor) : [];
  },

  /**
   * Backend varsayılanı limit=50 (tavan 200) ve is_active=true.
   * params.limit verilmezse tüm sayfalar dolaşılır.
   */
  getAll: async (params = {}) => {
    if (params.limit) return sponsorService.getPage(params);
    return fetchAllPages(
      async (skip, limit) => ({ items: await sponsorService.getPage({ ...params, skip, limit }) }),
      200
    );
  },

  /**
   * Admin listesi: aktif ve pasif sponsorların tamamı.
   * Backend is_active verilmezse yalnızca aktifleri döndürüyor; eskiden pasif
   * yapılan sponsor panelden kayboluyor ve bir daha aktif yapılamıyordu.
   */
  getAllAdmin: async () => {
    const [active, inactive] = await Promise.all([
      sponsorService.getAll({ is_active: true }),
      sponsorService.getAll({ is_active: false }),
    ]);
    return [...active, ...inactive];
  },

  getById: async (id) => {
    const response = await apiClient.get(`/sponsors/${id}`);
    return sponsorService._mapSponsor(response.data);
  },

  getCategories: async () => {
    const response = await apiClient.get('/sponsors/categories');
    return response.data;
  },

  create: async (sponsorData) => {
    const response = await apiClient.post('/sponsors/', sponsorData);
    return response.data;
  },

  update: async (id, sponsorData) => {
    const response = await apiClient.put(`/sponsors/${id}`, sponsorData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/sponsors/${id}`);
    return response.data;
  },

  geocode: async (address) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json`;
    
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      country: 'TR',
      limit: '1',
      language: 'tr',
      types: 'address,poi,place,locality,neighborhood'
    });

    try {
      const response = await fetch(`${url}?${params}`);

      if (!response.ok) {
        throw new Error('Geocoding servisi yanıt vermiyor');
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        throw new Error('Adres bulunamadı. Lütfen farklı bir adres deneyin.');
      }

      const result = data.features[0];
      const [longitude, latitude] = result.center;

      return {
        latitude: latitude,
        longitude: longitude,
        formatted_address: result.place_name
      };
    } catch (error) {
      console.error('Mapbox geocode error:', error);
      throw new Error(error.message || 'Adres bulunamadı. Lütfen manuel olarak koordinat girin.');
    }
  },

  uploadImage: async (file) => {
    return uploadService.uploadImage(file);
  }
};

export default sponsorService;
