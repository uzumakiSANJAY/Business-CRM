import api from './axios';

export const getItemTypes   = (companyId) => api.get('/item-types', { params: companyId ? { item_company_id: companyId } : {} }).then((r) => r.data.types);
export const createItemType = (data)        => api.post('/item-types', data).then((r) => r.data);
export const updateItemType = (id, data)    => api.put(`/item-types/${id}`, data).then((r) => r.data);
export const deleteItemType = (id)          => api.delete(`/item-types/${id}`).then((r) => r.data);
