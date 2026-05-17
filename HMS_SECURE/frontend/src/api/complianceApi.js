import api from './client';

export const complianceApi = {
  summary: () => api.get('/compliance/summary'),
  consents: (params) => api.get('/compliance/consents', { params }),
  createConsent: (payload) => api.post('/compliance/consents', payload),
  updateConsent: (id, payload) => api.put(`/compliance/consents/${id}`, payload),
  signConsent: (id, payload) => api.post(`/compliance/consents/${id}/sign`, payload),

  incidents: (params) => api.get('/compliance/incidents', { params }),
  createIncident: (payload) => api.post('/compliance/incidents', payload),
  updateIncident: (id, payload) => api.put(`/compliance/incidents/${id}`, payload),

  sops: (params) => api.get('/compliance/sops', { params }),
  createSop: (payload) => api.post('/compliance/sops', payload),
  updateSop: (id, payload) => api.put(`/compliance/sops/${id}`, payload),

  checklists: (params) => api.get('/compliance/checklists', { params }),
  createChecklist: (payload) => api.post('/compliance/checklists', payload),
  updateChecklist: (id, payload) => api.put(`/compliance/checklists/${id}`, payload),
  seedNabh: () => api.post('/compliance/checklists/seed-nabh'),

  backups: (params) => api.get('/compliance/backups', { params }),
  createBackup: (payload) => api.post('/compliance/backups', payload),
  updateBackup: (id, payload) => api.put(`/compliance/backups/${id}`, payload),

  exportUrl: (type) => `${api.defaults.baseURL}/compliance/export/${type}`,
};
