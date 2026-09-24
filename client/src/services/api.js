import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle unauthenticated or global errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional auto logout or token clear on unauthorized
      if (localStorage.getItem('token')) {
        console.warn('Session expired or unauthorized. Logging out.');
      }
    }
    return Promise.reject(error);
  }
);

// API Service Endpoints (Aligned with Din 5-11 Backend)
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

export const clientsApi = {
  getAll: (params) => api.get('/clients', { params }),
  getStats: () => api.get('/clients/stats'),
  create: (data) => api.post('/clients', data),
};

export const projectsApi = {
  getAll: (params) => api.get('/projects', { params }),
  getStats: () => api.get('/projects/stats'),
  create: (data) => api.post('/projects', data),
};

export const tasksApi = {
  getAll: (params) => api.get('/tasks', { params }),
  getStats: () => api.get('/tasks/stats'),
  create: (data) => api.post('/tasks', data),
  reorder: (updates) => api.put('/tasks/reorder', updates),
};

export const invoicesApi = {
  getAll: (params) => api.get('/invoices', { params }),
  getStats: () => api.get('/invoices/stats'),
  generate: (data) => api.post('/invoices/generate', data),
};

export default api;
