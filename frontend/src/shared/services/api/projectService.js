/**
 * Project Service
 * Handles all project-related API calls
 */
import apiClient from './apiClient';

const projectService = {
  /**
   * Get all projects (public view)
   */
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.skip) queryParams.append('skip', params.skip);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.status) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString();
    const response = await apiClient.get(`/projects${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  /**
   * Get all projects (admin view - includes inactive)
   */
  getAllAdmin: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.skip) queryParams.append('skip', params.skip);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.status) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString();
    const response = await apiClient.get(`/projects/admin${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  /**
   * Get featured project
   */
  getFeatured: async () => {
    try {
      const response = await apiClient.get('/projects/featured');
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  /**
   * Get project by slug
   */
  getBySlug: async (slug) => {
    const response = await apiClient.get(`/projects/by-slug/${slug}`);
    return response.data;
  },

  /**
   * Get project by ID
   */
  getById: async (id) => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  /**
   * Create new project
   */
  create: async (projectData) => {
    const response = await apiClient.post('/projects', projectData);
    return response.data;
  },

  /**
   * Update project
   */
  update: async (projectId, projectData) => {
    const response = await apiClient.put(`/projects/${projectId}`, projectData);
    return response.data;
  },

  /**
   * Delete project
   */
  delete: async (projectId) => {
    const response = await apiClient.delete(`/projects/${projectId}`);
    return response.data;
  },

  /**
   * Get project categories
   */
  getCategories: async () => {
    const response = await apiClient.get('/projects/categories');
    return response.data;
  },

  /**
   * Upload image for project
   */
  uploadImage: async (file) => {
    if (!file) return null;
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/uploads/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.url;
  },
};

export default projectService;
