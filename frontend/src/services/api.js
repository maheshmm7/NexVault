import axios from 'axios';
import ENV from '../config/env';

const api = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: true,  // Instructs Axios to transmit session cookies on all cross-origin requests
});

export default api;
