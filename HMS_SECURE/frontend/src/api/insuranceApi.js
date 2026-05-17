import api from './client';

export const insuranceApi = {
  list: (params = {}) => api.get('/insurance/claims', { params }),
  summary: () => api.get('/insurance/summary'),
  create: (payload) => api.post('/insurance/claims', payload),
  update: (id, payload) => api.put(`/insurance/claims/${id}`, payload),
  updateStatus: (id, payload) => api.patch(`/insurance/claims/${id}/status`, payload),
  createFromBill: (billingId, payload) => api.post(`/insurance/claims/from-bill/${billingId}`, payload),
};
