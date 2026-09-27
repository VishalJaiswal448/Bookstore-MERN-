import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

function csrfFromCookie() {
  const match = document.cookie.split('; ').find(row => row.startsWith('bb_csrf='));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : '';
}

api.interceptors.request.use(config => {
  if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) {
    const token = csrfFromCookie();
    if (token) config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

export default api;
