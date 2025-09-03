// Backward compatible re-exports from the new api layer
export { fetchEvents, fetchFeaturedEvent, fetchEventCategories as fetchCategories } from '../api/events';
export { fetchProjects, fetchFeaturedProject, fetchProjectCategories, fetchProjectBySlug } from '../api/projects';