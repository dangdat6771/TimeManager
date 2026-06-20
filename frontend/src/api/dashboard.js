import { api } from './client.js';
export const dashboardApi = {
  getOverview: () => api.get('/dashboard/overview'),
  getWeekly:   () => api.get('/dashboard/weekly'),
};
