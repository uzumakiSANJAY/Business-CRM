import api from './axios';

export const getItems    = ()         => api.get('/items').then((r) => r.data.items);
export const createItem  = (data)     => api.post('/items', data).then((r) => r.data);
export const updateItem  = (id, data) => api.put(`/items/${id}`, data).then((r) => r.data);
export const deleteItem  = (id)       => api.delete(`/items/${id}`).then((r) => r.data);
