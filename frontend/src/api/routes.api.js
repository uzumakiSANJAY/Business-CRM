import api from './axios';

export const getRoutes    = ()         => api.get('/routes').then((r) => r.data.routes);
export const createRoute  = (data)     => api.post('/routes', data).then((r) => r.data);
export const updateRoute  = (id, data) => api.put(`/routes/${id}`, data).then((r) => r.data);
export const deleteRoute  = (id)       => api.delete(`/routes/${id}`).then((r) => r.data);
