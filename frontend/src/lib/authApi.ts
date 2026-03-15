import api from './api';
import { ApiResponse, User } from '@/types';

export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const res = await api.post<ApiResponse<{ user: User; accessToken: string }>>('/auth/register', data);
    return res.data;
  },

  login: async (data: { email: string; password: string }) => {
    const res = await api.post<ApiResponse<{ user: User; accessToken: string }>>('/auth/login', data);
    return res.data;
  },

  logout: async () => {
    const res = await api.post<ApiResponse<null>>('/auth/logout');
    return res.data;
  },

  getMe: async () => {
    const res = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return res.data;
  },

  refresh: async () => {
    const res = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
    return res.data;
  },
};
