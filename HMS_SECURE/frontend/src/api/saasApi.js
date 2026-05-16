import api from './client';

export const saasApi = {
  overview: () => api.get('/saas/overview'),
  exportTenants: () => api.get('/saas/tenants/export.csv', { responseType: 'blob' }),
  updateSubscription: (id, data) => api.patch(`/tenants/${id}/subscription`, data),
  lifecycle: (id, data) => api.patch(`/tenants/${id}/lifecycle`, data),
  billingSummary: () => api.get('/saas/billing/summary'),
  invoices: (params = {}) => api.get('/saas/invoices', { params }),
  generateInvoice: (data) => api.post('/saas/invoices/generate', data),
  updateInvoiceStatus: (id, data) => api.patch(`/saas/invoices/${id}/status`, data),
  recordPayment: (id, data) => api.post(`/saas/invoices/${id}/payments`, data),
  createPaymentLink: (id, data = {}) => api.post(`/saas/invoices/${id}/payment-link`, data),
  paymentIntents: (params = {}) => api.get('/saas/payment-intents', { params }),
  confirmPaymentIntent: (id, data = {}) => api.post(`/saas/payment-intents/${id}/confirm`, data),
  markOverdueInvoices: () => api.post('/saas/invoices/mark-overdue'),
  exportInvoices: () => api.get('/saas/invoices/export.csv', { responseType: 'blob' }),
};
