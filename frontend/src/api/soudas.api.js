import api from './axios';

export const getSoudas      = (params) => api.get('/soudas', { params }).then((r) => r.data.soudas);
export const createSouda    = (data)   => api.post('/soudas', data).then((r) => r.data);
export const updateSouda    = (id, data) => api.put(`/soudas/${id}`, data).then((r) => r.data);
export const deleteSouda    = (id)     => api.delete(`/soudas/${id}`).then((r) => r.data);
export const addDelivery    = (id, data) => api.post(`/soudas/${id}/deliveries`, data).then((r) => r.data);
export const deleteDelivery = (id, deliveryId) => api.delete(`/soudas/${id}/deliveries/${deliveryId}`).then((r) => r.data);
