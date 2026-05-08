import api from './axios';

export const getCollectors   = ()         => api.get('/collectors').then((r) => r.data.collectors);
export const createCollector = (data)     => api.post('/collectors', data).then((r) => r.data);
export const updateCollector = (id, data) => api.put(`/collectors/${id}`, data).then((r) => r.data);
export const deleteCollector = (id)       => api.delete(`/collectors/${id}`).then((r) => r.data);
