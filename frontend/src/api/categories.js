import { api } from './client.js';
export const categoriesApi = {
  getAll:  ()         => api.get('/categories'),
  create:  (data)     => api.post('/categories', data),
  update:  (id, data) => api.patch(`/categories/${id}`, data),
  delete:  (id)       => api.delete(`/categories/${id}`),
};
export const tagsApi = {
  getAll:  ()         => api.get('/tags'),
  create:  (data)     => api.post('/tags', data),
  delete:  (id)       => api.delete(`/tags/${id}`),
};
export const accountApi = {
  getProfile:    ()         => api.get('/account/me'),
  updateProfile: (data)     => api.patch('/account/me', data),
  changePassword:(data)     => api.patch('/account/password', data),
};
