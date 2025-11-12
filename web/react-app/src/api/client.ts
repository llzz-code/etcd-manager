import axios from 'axios';
import { message } from 'antd';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 400) {
        message.error(data.message || 'Invalid request');
      } else if (status === 404) {
        message.error(data.message || 'Resource not found');
      } else if (status === 500) {
        message.error(data.message || 'Internal server error');
      } else {
        message.error(data.message || 'Request failed');
      }
    } else if (error.request) {
      message.error('Network error: Unable to reach server');
    } else {
      message.error('Request error: ' + error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
