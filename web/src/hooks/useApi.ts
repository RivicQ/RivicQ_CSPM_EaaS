import { useMemo } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

export function useApi() {
  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE_URL });
    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return {
      get: async (url: string, params?: any) => {
        try {
          const res = await instance.get(url, { params });
          return { success: true, data: res.data?.data ?? res.data };
        } catch {
          return { success: false, data: null };
        }
      },
      post: async (url: string, data?: any) => {
        try {
          const res = await instance.post(url, data);
          return { success: true, data: res.data?.data ?? res.data };
        } catch {
          return { success: false, data: null };
        }
      },
      put: async (url: string, data?: any) => {
        try {
          const res = await instance.put(url, data);
          return { success: true, data: res.data?.data ?? res.data };
        } catch {
          return { success: false, data: null };
        }
      },
      delete: async (url: string) => {
        try {
          const res = await instance.delete(url);
          return { success: true, data: res.data?.data ?? res.data };
        } catch {
          return { success: false, data: null };
        }
      },
    };
  }, []);

  return { api, isConnected: true, apiVersion: 'v1.3.0', config: {} };
}
