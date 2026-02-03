/**
 * Member Service
 * Handles all member-related API calls
 */
import apiClient from './apiClient';
import uploadService from './uploadService';
import { getMediaUrl } from '../../utils/media';

const memberService = {
  /**
   * Data Mapper
   */
  _mapMember: (m) => {
    if (!m) return null;
    const fullUrl = getMediaUrl(m.profile_image || m.avatar_url || m.avatar, m.full_name);
    return {
      ...m,
      avatar_url: fullUrl,
      avatar: fullUrl,
    };
  },

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
    const members = response.data.members || response.data;
    return Array.isArray(members) ? members.map(memberService._mapMember) : [];
  },

  /**
   * Get member by ID
   */
  getById: async (id) => {
    const response = await apiClient.get(`/members/${id}`);
    return memberService._mapMember(response.data);
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
    return Array.isArray(response.data) ? response.data.map(memberService._mapMember) : [];
  },

  /**
   * Upload profile image for member
   */
  uploadImage: async (file) => {
    return uploadService.uploadImage(file);
  },
};

export default memberService;
