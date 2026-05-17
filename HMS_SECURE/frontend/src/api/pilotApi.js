import api from './client';
export const pilotApi = {
  summary: () => api.get('/pilot/summary'),
  list: () => api.get('/pilot/deployments'),
  create: (payload) => api.post('/pilot/deployments', payload),
  update: (id, payload) => api.patch(`/pilot/deployments/${id}`, payload),
  tasks: (pilotId) => api.get('/pilot/tasks', { params: pilotId ? { pilot_id: pilotId } : {} }),
  createTask: (payload) => api.post('/pilot/tasks', payload),
  updateTask: (id, payload) => api.patch(`/pilot/tasks/${id}`, payload),
  readiness: (id) => api.get(`/pilot/readiness/${id}`),
};
export default pilotApi;
