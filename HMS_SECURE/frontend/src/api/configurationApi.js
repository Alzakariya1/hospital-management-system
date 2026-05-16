import api from './client';

export const configurationApi = {
  listDynamicFields: (params = {}) => api.get('/configuration/dynamic-fields', { params }),
  listPublicFields: (params = {}) => api.get('/configuration/public-fields', { params }),
  createDynamicField: (data) => api.post('/configuration/dynamic-fields', data),
  updateDynamicField: (id, data) => api.put(`/configuration/dynamic-fields/${id}`, data),
  updateDynamicFieldStatus: (id, is_active) => api.patch(`/configuration/dynamic-fields/${id}/status`, { is_active }),
  deleteDynamicField: (id) => api.delete(`/configuration/dynamic-fields/${id}`),
};
