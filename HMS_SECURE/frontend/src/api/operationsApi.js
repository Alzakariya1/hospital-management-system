import api from './client';

export const operationsApi = {
  summary: () => api.get('/operations/summary'),
  recordBackupVerification: (payload) => api.post('/operations/backup-verifications', payload),
  live: () => api.get('/health/live'),
  ready: () => api.get('/health/ready'),
};
