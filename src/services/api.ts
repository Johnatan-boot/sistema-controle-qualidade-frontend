import { IApiResponse } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '') + '/api';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<IApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    console.error('API Error:', response.status, response.statusText);
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as IApiResponse<T>;
}

const api = {
  get: <T = any>(url: string, config?: any) => fetchApi<T>(url, { method: 'GET', ...config }),
  post: <T = any>(url: string, data?: any, config?: any) => fetchApi<T>(url, { method: 'POST', body: JSON.stringify(data), ...config }),
  put: <T = any>(url: string, data?: any, config?: any) => fetchApi<T>(url, { method: 'PUT', body: JSON.stringify(data), ...config }),
  delete: <T = any>(url: string, config?: any) => fetchApi<T>(url, { method: 'DELETE', ...config }),
};

export default api;
