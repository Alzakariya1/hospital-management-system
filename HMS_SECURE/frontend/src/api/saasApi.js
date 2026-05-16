import api from './client';

export const saasApi = {
  overview: () => api.get('/saas/overview'),
  exportTenants: () => api.get('/saas/tenants/export.csv', { responseType: 'blob' }),
};
