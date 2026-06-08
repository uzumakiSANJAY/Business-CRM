import api from './axios';

export const getItemCompanies   = (itemId) => api.get('/item-companies', { params: itemId ? { item_id: itemId } : {} }).then((r) => r.data.companies);
export const createItemCompany  = (data)     => api.post('/item-companies', data).then((r) => r.data);
export const updateItemCompany  = (id, data) => api.put(`/item-companies/${id}`, data).then((r) => r.data);
export const deleteItemCompany  = (id)       => api.delete(`/item-companies/${id}`).then((r) => r.data);
