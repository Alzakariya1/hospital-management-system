import api from './client';

export const tenantApi = {
  me: () => api.get('/tenant/me'),
  modules: () => api.get('/tenant/modules'),
  features: () => api.get('/tenant/features'),
  list: () => api.get('/tenants'),
  create: (payload) => api.post('/tenants', payload),
  update: (id, payload) => api.patch(`/tenants/${id}`, payload),
  admins: (id) => api.get(`/tenants/${id}/admins`),
  createAdmin: (id, payload) => api.post(`/tenants/${id}/admins`, payload),
};
