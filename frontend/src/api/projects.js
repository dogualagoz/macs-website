import { getJson } from './http';
import { getAuthHeader } from './auth';

export const fetchProjects = () => getJson('/projects');

// Admin görünümü: pasif projeler dahil
export const fetchProjectsAdmin = (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip) query.append('skip', params.skip);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.category_id) query.append('category_id', params.category_id);
  if (params.status) query.append('status', params.status);
  const qs = query.toString();
  return getJson(`/projects/admin${qs ? `?${qs}` : ''}`, {
    headers: {
      ...getAuthHeader()
    }
  });
};
export const fetchFeaturedProject = async () => {
  try {
    return await getJson('/projects/featured');
  } catch (err) {
    if (String(err.message).includes('404')) return null;
    return null;
  }
};
export const fetchProjectCategories = () => getJson('/projects/categories');
export const fetchProjectBySlug = (slug) => getJson(`/projects/by-slug/${slug}`);

export const updateProject = (projectId, projectData) => {
  return getJson(`/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeader()
    },
    body: JSON.stringify(projectData)
  });
};

export const deleteProject = (projectId) => {
  return getJson(`/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeader()
    }
  });
};

export const createProject = (projectData) => {
  return getJson('/projects', {
    method: 'POST',
    headers: {
      ...getAuthHeader()
    },
    body: JSON.stringify(projectData)
  });
};

