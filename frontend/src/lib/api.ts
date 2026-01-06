import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const auth = {
  getGoogleUrl: () => api.get('/auth/google/url'),
  me: () => api.get('/users/me'),
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
};

export const meetings = {
  create: (data: any) => api.post('/meetings/create', data),
  sync: () => api.post('/meetings/sync'),
  list: (date?: string) => {
    const params: any = {};
    // If a specific date is provided, use it.
    // If not, we don't send any param, letting the backend default to the last 30 days
    if (date) params.date = date;
    return api.get('/meetings/', { params });
  },
  update: (id: string, data: any) => api.patch(`/meetings/${id}`, data),
  generateActions: (id: string) => api.post(`/meetings/${id}/generate-actions`),
};

export const nextSteps = {
  list: (meetingId?: string) => api.get('/next-steps', { params: { meeting_id: meetingId } }),
  create: (data: any) => api.post('/next-steps', data),
  update: (id: string, data: any) => api.patch(`/next-steps/${id}`, data),
  delete: (id: string) => api.delete(`/next-steps/${id}`),
  execute: (id: string) => api.post(`/next-steps/${id}/execute`),
};