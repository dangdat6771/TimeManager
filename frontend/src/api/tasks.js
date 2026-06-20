import { api } from './client.js';
export const tasksApi = {
  getAll:  (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/tasks${q ? '?' + q : ''}`);
  },
  getById: (id)    => api.get(`/tasks/${id}`),
  create:  (data)  => api.post('/tasks', data),
  update:  (id, data) => api.patch(`/tasks/${id}`, data),
  delete:  (id)    => api.delete(`/tasks/${id}`),
};
