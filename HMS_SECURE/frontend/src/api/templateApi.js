import api from './client';

export const templateApi = {
  list: (params = {}) => api.get('/templates', { params }),
  listPublic: (params = {}) => api.get('/templates/public', { params }),
  create: (payload) => api.post('/templates', payload),
  update: (id, payload) => api.put(`/templates/${id}`, payload),
  preview: (id, payload = {}) => api.post(`/templates/${id}/preview`, payload),
  updateStatus: (id, is_active) => api.patch(`/templates/${id}/status`, { is_active }),
  delete: (id) => api.delete(`/templates/${id}`),
};
