import { api } from './client.js';

export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  updateUserStatus: (id, isActive) => api.patch(`/admin/users/${id}/status`, { isActive }),
  getStats: () => api.get('/admin/stats'),
  sendBroadcast: (data) => api.post('/admin/broadcasts', data),
  getLogs: () => api.get('/admin/logs'),
};
