import apiClient from './apiClient';
import env from '../../config/env';

const MAPBOX_TOKEN = env.mapboxToken;

const sponsorService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/sponsors/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/sponsors/${id}`);
    return response.data;
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
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/uploads/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.url;
  }
};

export default sponsorService;
