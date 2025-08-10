// Lightweight fetch helper with baseURL and error handling

const RAW_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
export const BASE_URL = RAW_BASE_URL.replace(/\/+$/, ''); // trim trailing slashes

export async function getJson(path, init = {}) {
  const url = `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
    method: init.method || 'GET',
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request failed ${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}


