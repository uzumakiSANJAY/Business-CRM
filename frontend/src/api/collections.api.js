import api from './axios';

export const getCollections    = ()         => api.get('/collections').then((r) => r.data.collections);
export const createCollection  = (data)     => api.post('/collections', data).then((r) => r.data);
export const confirmCollection = (id)       => api.put(`/collections/${id}/confirm`).then((r) => r.data);
export const rejectCollection  = (id, reason) =>
  api.put(`/collections/${id}/reject`, { rejection_reason: reason }).then((r) => r.data);
