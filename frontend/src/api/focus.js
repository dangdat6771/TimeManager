import { api } from './client.js';
export const focusApi = {
  getSettings:    ()         => api.get('/focus/settings'),
  updateSettings: (data)     => api.patch('/focus/settings', data),
  getSessions:    ()         => api.get('/focus/sessions'),
  startSession:   (data)     => api.post('/focus/sessions', data),
  finishSession:  (id, data) => api.patch(`/focus/sessions/${id}/finish`, data),
  deleteSession:  (id)       => api.delete(`/focus/sessions/${id}`),
};
