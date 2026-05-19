import axios from 'axios';
import ENV from '../config/env';

const api = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: true,  // Instructs Axios to transmit session cookies on all cross-origin requests
});

// Request interceptor to attach dynamic configuration (if needed)
api.interceptors.request.use(
  (config) => {
    // Automatically detect and attach the browser timezone to every request header
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      config.headers['X-User-Timezone'] = tz;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
