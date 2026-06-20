import { api } from './client.js';
export const habitsApi = {
  getAll:   ()         => api.get('/habits'),
  create:   (data)     => api.post('/habits', data),
  update:   (id, data) => api.patch(`/habits/${id}`, data),
  delete:   (id)       => api.delete(`/habits/${id}`),
  checkIn:  (id, data) => api.post(`/habits/${id}/check-ins`, data),
  getLogs:  (id)       => api.get(`/habits/${id}/logs`),
};
