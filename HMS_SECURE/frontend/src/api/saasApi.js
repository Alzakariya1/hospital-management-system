import api from './client';

export const saasApi = {
  overview: () => api.get('/saas/overview'),
  exportTenants: () => api.get('/saas/tenants/export.csv', { responseType: 'blob' }),
  updateSubscription: (id, data) => api.patch(`/tenants/${id}/subscription`, data),
  lifecycle: (id, data) => api.patch(`/tenants/${id}/lifecycle`, data),
};
