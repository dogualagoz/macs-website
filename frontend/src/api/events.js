import { getJson, BASE_URL } from './http';
import { getAuthHeader } from './auth';

export const fetchEvents = (params = {}) => {
  const queryParams = new URLSearchParams();
  
  // Filtre parametrelerini ekle
  if (params.skip) queryParams.append('skip', params.skip);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  if (params.category_id) queryParams.append('category_id', params.category_id);
  if (params.status) queryParams.append('status', params.status);
  
  const queryString = queryParams.toString();
  return getJson(`/events${queryString ? `?${queryString}` : ''}`);
};

// Admin görünümü: pasif etkinlikler dahil
export const fetchEventsAdmin = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.skip) queryParams.append('skip', params.skip);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  if (params.category_id) queryParams.append('category_id', params.category_id);
  if (params.status) queryParams.append('status', params.status);
  const queryString = queryParams.toString();
  return getJson(`/events/admin${queryString ? `?${queryString}` : ''}`, {
    headers: {
      ...getAuthHeader()
    }
  });
};

export const fetchFeaturedEvent = async () => {
  try {
    return await getJson('/events/featured');
  } catch (err) {
    if (String(err.message).includes('404')) return null;
    return null;
  }
};

export const fetchEventCategories = () => getJson('/events/categories');
export const fetchEventBySlug = (slug) => getJson(`/events/by-slug/${slug}`);
export const fetchEventById = (id) => getJson(`/events/${id}`);

export const createEvent = (eventData) => {
  return getJson('/events', {
    method: 'POST',
    headers: {
      ...getAuthHeader()
    },
    body: JSON.stringify(eventData)
  });
};

export const updateEvent = (eventId, eventData) => {
  return getJson(`/events/${eventId}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeader()
    },
    body: JSON.stringify(eventData)
  });
};

export const deleteEvent = (eventId) => {
  return getJson(`/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeader()
    }
  });
};

// Dosya yükleme API'si
export const uploadFile = async (file) => {
  if (!file) return null;
  
  const formData = new FormData();
  formData.append('file', file);
  
  // FastAPI'de endpoint '/upload/' olarak tanımlı; redirect (307) yaşamamak için trailing slash kullan
  const url = `${BASE_URL}/upload/`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...getAuthHeader()
    },
    body: formData
  });
  
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upload failed ${response.status}: ${text || response.statusText}`);
  }
  
  return response.json();
};