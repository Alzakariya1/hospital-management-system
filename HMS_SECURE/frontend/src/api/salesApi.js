import api from './client';

export const salesApi = {
  marketing: () => api.get('/public/marketing'),
  submitDemoRequest: (data) => api.post('/public/demo-requests', data),
  demoRequests: () => api.get('/sales/demo-requests'),
  updateDemoRequest: (id, data) => api.patch(`/sales/demo-requests/${id}`, data),
  createActivity: (data) => api.post('/sales/activities', data),
  assets: () => api.get('/sales/assets'),
};
