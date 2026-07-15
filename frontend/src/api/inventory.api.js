import api from './axios';

export const getInventoryItems    = (type)     => api.get('/inventory/items', { params: type ? { type } : {} }).then((r) => r.data.items);
export const createInventoryItem  = (data)     => api.post('/inventory/items', data).then((r) => r.data);
export const updateInventoryItem  = (id, data) => api.put(`/inventory/items/${id}`, data).then((r) => r.data);
export const deleteInventoryItem  = (id)       => api.delete(`/inventory/items/${id}`).then((r) => r.data);
export const getItemLedger        = (id)       => api.get(`/inventory/items/${id}/ledger`).then((r) => r.data.ledger);
export const addTransaction       = (data)     => api.post('/inventory/transactions', data).then((r) => r.data);
export const updateTransaction    = (id, data) => api.put(`/inventory/transactions/${id}`, data).then((r) => r.data);
export const deleteTransaction    = (id)       => api.delete(`/inventory/transactions/${id}`).then((r) => r.data);
