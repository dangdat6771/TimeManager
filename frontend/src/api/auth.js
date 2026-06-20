import { api } from './client.js';
export const authApi = {
  register: (data)  => api.post('/auth/register', data),
  login:    (data)  => api.post('/auth/login', data),
  refresh:  (data)  => api.post('/auth/refresh', data),
  logout:   (data)  => api.post('/auth/logout', data),
};
