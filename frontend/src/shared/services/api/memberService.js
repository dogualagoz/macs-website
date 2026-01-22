/**
 * Member Service
 * Handles all member-related API calls
 */
import apiClient from './apiClient';

const memberService = {
  /**
   * Get all members
   */
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.skip) queryParams.append('skip', params.skip);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.is_active !== undefined) queryParams.append('is_active', params.is_active);
    
    const queryString = queryParams.toString();
    const response = await apiClient.get(`/members${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  /**
   * Get member by ID
   */
  getById: async (id) => {
    const response = await apiClient.get(`/members/${id}`);
    return response.data;
  },

  /**
   * Create new member
   */
  create: async (memberData) => {
    const response = await apiClient.post('/members', memberData);
    return response.data;
  },

  /**
   * Update member
   */
  update: async (memberId, memberData) => {
    const response = await apiClient.put(`/members/${memberId}`, memberData);
    return response.data;
  },

  /**
   * Delete member
   */
  delete: async (memberId) => {
    const response = await apiClient.delete(`/members/${memberId}`);
    return response.data;
  },

  /**
   * Get leaderboard
   */
  getLeaderboard: async (limit = 10) => {
    const response = await apiClient.get(`/members/leaderboard?limit=${limit}`);
    return response.data;
  },

  /**
   * Upload profile image for member
   */
  uploadImage: async (file) => {
    if (!file) return null;
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/uploads/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.url;
  },
};

export default memberService;
