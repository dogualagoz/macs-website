import { getJson } from './http';

export const fetchProjects = () => getJson('/projects');
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


