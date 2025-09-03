// Lightweight fetch helper with baseURL and error handling

const RAW_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
export const BASE_URL = RAW_BASE_URL.replace(/\/+$/, ''); // trim trailing slashes

export async function getJson(path, init = {}) {
  const url = `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  
  // Headers'ı init'ten önce oluştur, böylece init.headers içindeki değerler öncelikli olur
  const headers = {
    'Content-Type': 'application/json',
    ...(init.headers || {})
  };
  
  // init içindeki headers'ı çıkar, çünkü aşağıda ayrıca ekliyoruz
  const { headers: _, ...restInit } = init;
  
  const response = await fetch(url, {
    ...restInit,
    headers,
    method: init.method || 'GET',
  });
  
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request failed ${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}


