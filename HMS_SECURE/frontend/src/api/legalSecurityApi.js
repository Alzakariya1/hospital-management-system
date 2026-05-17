import api from './client';

export const legalSecurityApi = {
  overview: () => api.get('/legal-security/overview'),
  bootstrapPolicies: () => api.post('/legal-security/bootstrap-policies'),
  policies: () => api.get('/legal-security/policies'),
  createPolicy: (payload) => api.post('/legal-security/policies', payload),
  approvePolicy: (id, payload = {}) => api.patch(`/legal-security/policies/${id}/approve`, payload),
  acknowledgePolicy: (id) => api.post(`/legal-security/policies/${id}/acknowledge`),
  dataRequests: () => api.get('/legal-security/data-requests'),
  createDataRequest: (payload) => api.post('/legal-security/data-requests', payload),
  updateDataRequest: (id, payload) => api.patch(`/legal-security/data-requests/${id}`, payload),
  incidents: () => api.get('/legal-security/incidents'),
  createIncident: (payload) => api.post('/legal-security/incidents', payload),
  updateIncident: (id, payload) => api.patch(`/legal-security/incidents/${id}`, payload),
  auditPack: () => api.get('/legal-security/export/audit-pack'),
};
