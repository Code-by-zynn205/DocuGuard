'use client';

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor bóc tách data khi Backend dùng ResponseInterceptor
apiClient.interceptors.response.use(
  (response) => {
    // Nếu Backend bọc kết quả trong { success: true, data: ... }
    if (response.data && response.data.data !== undefined) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default apiClient;