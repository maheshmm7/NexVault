import axios from 'axios';
import ENV from '../config/env';

const api = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: true,  // Instructs Axios to transmit session cookies on all cross-origin requests
});

// Automatically inject JWT Bearer token into headers if stored in localStorage
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

export default api;
