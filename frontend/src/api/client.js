import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Backend origin without the /api suffix, used to resolve stored file paths (e.g. /uploads/xyz.jpg).
export const assetBaseURL = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
