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
  uploadLogo: (id, formData) => api.post(`/tenants/${id}/logo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  archive: (id) => api.delete(`/tenants/${id}`),
  databaseOverview: () => api.get('/tenant-databases/overview'),
  provisionDatabase: (hospitalId, payload = {}) => api.post(`/tenant-databases/${hospitalId}/provision`, payload),
  backupDatabase: (hospitalId, payload = {}) => api.post(`/tenant-databases/${hospitalId}/backup`, payload),
  databaseSummary: (hospitalId) => api.get(`/tenant-databases/${hospitalId}/data-summary`),
  databaseBackups: (params = {}) => api.get('/tenant-databases/backups', { params }),
};
