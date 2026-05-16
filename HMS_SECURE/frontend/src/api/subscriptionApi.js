import api from './client';

export const subscriptionApi = {
  plans: () => api.get('/subscription/plans'),
  current: () => api.get('/subscription/current'),
  tenant: (id) => api.get(`/tenants/${id}/subscription`),
  updateTenant: (id, payload) => api.patch(`/tenants/${id}/subscription`, payload),
};
