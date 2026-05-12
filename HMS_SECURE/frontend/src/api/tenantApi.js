import api from './client';

export const tenantApi = {
  me: () => api.get('/tenant/me'),
  modules: () => api.get('/tenant/modules'),
  list: () => api.get('/tenants'),
  create: (payload) => api.post('/tenants', payload),
  update: (id, payload) => api.patch(`/tenants/${id}`, payload),
};
