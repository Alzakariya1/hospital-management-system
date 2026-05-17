import api from './client';

export const inventoryApi = {
  summary: () => api.get('/inventory/summary'),
  suppliers: () => api.get('/inventory/suppliers'),
  createSupplier: (payload) => api.post('/inventory/suppliers', payload),
  updateSupplier: (id, payload) => api.put(`/inventory/suppliers/${id}`, payload),
  items: (params = {}) => api.get('/inventory/items', { params }),
  createItem: (payload) => api.post('/inventory/items', payload),
  updateItem: (id, payload) => api.put(`/inventory/items/${id}`, payload),
  batches: (params = {}) => api.get('/inventory/batches', { params }),
  expiryAlerts: (params = {}) => api.get('/inventory/expiry-alerts', { params }),
  purchaseOrders: () => api.get('/inventory/purchase-orders'),
  createPurchaseOrder: (payload) => api.post('/inventory/purchase-orders', payload),
  updatePurchaseOrderStatus: (id, payload) => api.put(`/inventory/purchase-orders/${id}/status`, payload),
  stockReceivings: (params = {}) => api.get('/inventory/stock-receivings', { params }),
  receiveStock: (payload) => api.post('/inventory/stock-receivings', payload),
  stockReturns: (params = {}) => api.get('/inventory/stock-returns', { params }),
  returnStock: (payload) => api.post('/inventory/stock-returns', payload),
  supplierBills: () => api.get('/inventory/supplier-bills'),
  createSupplierBill: (payload) => api.post('/inventory/supplier-bills', payload),
  batchDispense: (payload) => api.post('/inventory/batch-dispense', payload),
  transactions: (params = {}) => api.get('/inventory/transactions', { params }),
};
