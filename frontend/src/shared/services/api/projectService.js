/**
 * Project Service
 * Handles all project-related API calls
 */
import apiClient from './apiClient';
import uploadService from './uploadService';
import { fetchAllPages } from './paginate';
import { getMediaUrl } from '../../utils/media';
import { safeExternalUrl } from '../../utils/safeUrl';

const projectService = {
  /**
   * Data Mapper: Backend verisini Frontend'in (NewProjectsPage) beklediği formata çevirir.
   */
  _mapProject: (p) => {
    if (!p) return null;
    // Dış bağlantılar href'e basılıyor: yalnızca http(s) geçer (bkz. safeUrl).
    const githubUrl = safeExternalUrl(p.github_url || p.githubUrl);
    const liveUrl = safeExternalUrl(p.live_url || p.liveUrl);
    return {
      ...p,
      // Backend -> Frontend Eşleşmeleri
      id: p.id,
      slug: p.slug,
      shortDescription: p.description || '',
      longDescription: p.content || '',
      image_url: getMediaUrl(p.image_url || p.image || p.imageUrl, 'Project'),
      imageUrl: getMediaUrl(p.image_url || p.image || p.imageUrl, 'Project'),
      image: getMediaUrl(p.image_url || p.image || p.imageUrl, 'Project'),
      tags: p.technologies ? p.technologies.split(',').map(t => t.trim()) : [],
      
      github_url: githubUrl,
      live_url: liveUrl,
      githubUrl,
      liveUrl,
      
      // Project Type -> Tab Eşleşmesi
      tab: p.project_type === 'DEVELOPED_BY_MACS' ? 'developed' :
           p.project_type === 'SUPPORTED_BY_MACS' ? 'supported' : 'showcase',
      
      // Team -> Members Eşleşmesi
      team: (p.members && p.members.length > 0) ? p.members.map(m => ({
        id: m.id.toString(),
        name: m.full_name,
        avatar: getMediaUrl(m.profile_image || m.avatar_url, m.full_name),
        role: m.project_role || 'Üye',
        projectCount: m.project_count || 0
      })) : (p.team_members ? p.team_members.split(',').map((name, idx) => ({
        id: `temp-${idx}`,
        name: name.trim(),
        avatar: getMediaUrl(null, name.trim()), // Generates UI Avatar
        role: 'Üye',
        projectCount: 0
      })) : []),

      // Category Çevirisi (Object to String)
      category: p.category?.name || p.category || 'Proje',
      
      // Status Çevirisi (ham API enum değerini admin edit formu için ayrıca koru)
      rawStatus: p.status,
      status: p.status === 'COMPLETED' ? 'Tamamlandı' : 
              p.status === 'IN_PROGRESS' ? 'Geliştirme Aşamasında' : 
              p.status === 'PLANNING' ? 'Planlama Aşamasında' : 'Yayında',
      
      // Tarih Formatı
      date: p.created_at ? new Date(p.created_at).toLocaleDateString('tr-TR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }) : ''
    };
  },

  /**
   * Tek sayfa çeker. { projects, total } döner.
   * Sayfalamayı kendi yöneten çağıranlar için; aksi halde getAll kullanılmalı.
   */
  getPage: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.skip) queryParams.append('skip', params.skip);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.status) queryParams.append('status', params.status);

    const queryString = queryParams.toString();
    const response = await apiClient.get(`/projects${queryString ? `?${queryString}` : ''}`);

    const data = response.data;
    const list = data.projects || data;
    const projects = Array.isArray(list) ? list.map(projectService._mapProject) : [];

    return { projects, total: typeof data.total === 'number' ? data.total : projects.length };
  },

  /**
   * Get all projects (public view)
   *
   * Backend'in limit varsayılanı 10, tavanı 100. Parametresiz çağrıldığında
   * eskiden yalnızca ilk 10 proje dönüyordu; projeler sayfası da filtreleri
   * bu eksik liste üzerinde çalıştırdığı için geri kalanı hiç görünmüyordu.
   * Sabit bir "limit: 100" yazmak aynı hatayı 101. projede tekrar ederdi,
   * bu yüzden toplam sayıya bakılıp tüm sayfalar dolaşılıyor.
   *
   * params.limit açıkça verilirse tek sayfa döner (çağıran sayfalamayı üstlenmiş demektir).
   */
  getAll: async (params = {}) => {
    if (params.limit) {
      const { projects } = await projectService.getPage(params);
      return projects;
    }

    return fetchAllPages(async (skip, limit) => {
      const { projects, total } = await projectService.getPage({ ...params, skip, limit });
      return { items: projects, total };
    }, 100); // backend tavanı (le=100)
  },

  /**
   * Get all projects (admin view - includes inactive)
   */
  getAllAdmin: async (params = {}) => {
    const fetchPage = async (skip, limit) => {
      const queryParams = new URLSearchParams();
      if (skip) queryParams.append('skip', skip);
      queryParams.append('limit', limit);
      const response = await apiClient.get(`/projects/admin?${queryParams.toString()}`);
      const data = response.data;
      const list = data.projects || data;
      return {
        items: Array.isArray(list) ? list.map(projectService._mapProject) : [],
        total: typeof data.total === 'number' ? data.total : undefined,
      };
    };
    if (params.limit) return (await fetchPage(params.skip || 0, params.limit)).items;
    return fetchAllPages(fetchPage, 200); // admin tavanı (le=200)
  },

  /**
   * Get featured project
   */
  getFeatured: async () => {
    try {
      const response = await apiClient.get('/projects/featured');
      return projectService._mapProject(response.data);
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
    return projectService._mapProject(response.data);
  },

  /**
   * Get project by ID
   */
  getById: async (id) => {
    const response = await apiClient.get(`/projects/${id}`);
    return projectService._mapProject(response.data);
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
    return uploadService.uploadImage(file);
  },
};

export default projectService;
