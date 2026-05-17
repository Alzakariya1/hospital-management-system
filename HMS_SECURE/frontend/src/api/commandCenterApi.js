import api from './client';

export const commandCenterApi = {
  summary: () => api.get('/command-center/summary'),
  revenue: (params = {}) => api.get('/command-center/revenue', { params }),
  occupancy: () => api.get('/command-center/occupancy'),
  doctorPerformance: (params = {}) => api.get('/command-center/doctor-performance', { params }),
  queue: () => api.get('/command-center/queue'),
  pharmacy: (params = {}) => api.get('/command-center/pharmacy', { params }),
  labTat: (params = {}) => api.get('/command-center/lab-tat', { params }),
  emergency: () => api.get('/command-center/emergency'),
};
