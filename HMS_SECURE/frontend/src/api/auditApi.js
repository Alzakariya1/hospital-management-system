import api from './client';

export const auditApi = {
  list: (params = {}) => api.get('/audit-logs', { params }),
  exportUrl: (params = {}) => {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
    const query = new URLSearchParams(params).toString();
    return `${base}/audit-logs/export${query ? `?${query}` : ''}`;
  },
  summary: () => api.get('/security/summary'),
  loginHistory: (params = {}) => api.get('/security/login-history', { params }),
  settings: () => api.get('/security-settings'),
  saveSetting: (key, payload) => api.put(`/security-settings/${key}`, payload),
  seedDefaults: () => api.post('/security-settings/defaults'),
};
