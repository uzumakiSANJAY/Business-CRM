import api from './axios';

export const getDalals    = ()         => api.get('/dalals').then((r) => r.data.dalals);
export const createDalal  = (data)     => api.post('/dalals', data).then((r) => r.data);
export const updateDalal  = (id, data) => api.put(`/dalals/${id}`, data).then((r) => r.data);
export const deleteDalal  = (id)       => api.delete(`/dalals/${id}`).then((r) => r.data);
