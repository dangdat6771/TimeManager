import { api } from './client.js';
export const eventsApi = {
  getAll:  (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/events${q ? '?' + q : ''}`);
  },
  create:  (data)     => api.post('/events', data),
  update:  (id, data) => api.patch(`/events/${id}`, data),
  delete:  (id)       => api.delete(`/events/${id}`),
};
