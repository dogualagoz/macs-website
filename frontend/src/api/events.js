import { getJson } from './http';

export const fetchEvents = () => getJson('/events');
export const fetchFeaturedEvent = async () => {
  try {
    return await getJson('/events/featured');
  } catch (err) {
    if (String(err.message).includes('404')) return null;
    return null; // fail-soft as previous behavior
  }
};
export const fetchCategories = () => getJson('/events/categories');
export const fetchEventBySlug = (slug) => getJson(`/events/by-slug/${slug}`);


