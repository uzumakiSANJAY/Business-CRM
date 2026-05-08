import api from './axios';

export const getBills     = ()         => api.get('/bills').then((r) => r.data.bills);
export const getBill      = (id)       => api.get(`/bills/${id}`).then((r) => r.data);
export const createBill   = (data)     => api.post('/bills', data).then((r) => r.data);
export const cancelBill   = (id)       => api.put(`/bills/${id}/cancel`).then((r) => r.data);
