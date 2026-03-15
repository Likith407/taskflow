import api from './api';
import { ApiResponse, Task, TaskStats, TaskFilters, CreateTaskInput, UpdateTaskInput, PaginationMeta } from '@/types';

export const tasksApi = {
  getAll: async (filters: TaskFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
    });
    const res = await api.get<ApiResponse<Task[]> & { meta: PaginationMeta }>(`/tasks?${params}`);
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
    return res.data;
  },

  create: async (data: CreateTaskInput) => {
    const res = await api.post<ApiResponse<Task>>('/tasks', data);
    return res.data;
  },

  update: async (id: string, data: UpdateTaskInput) => {
    const res = await api.patch<ApiResponse<Task>>(`/tasks/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await api.delete<ApiResponse<null>>(`/tasks/${id}`);
    return res.data;
  },

  getStats: async () => {
    const res = await api.get<ApiResponse<TaskStats>>('/tasks/stats');
    return res.data;
  },
};
