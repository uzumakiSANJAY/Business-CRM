import api from './axios';

export const getVendors    = ()         => api.get('/vendors').then((r) => r.data.vendors);
export const getVendor     = (id)       => api.get(`/vendors/${id}`).then((r) => r.data);
export const createVendor  = (data)     => api.post('/vendors', data).then((r) => r.data);
export const updateVendor  = (id, data) => api.put(`/vendors/${id}`, data).then((r) => r.data);
export const deleteVendor  = (id)       => api.delete(`/vendors/${id}`).then((r) => r.data);
export const reorderVendors    = (ids)     => api.put('/vendors/reorder', { ids }).then((r) => r.data);
export const bulkUploadVendors = (vendors) => api.post('/vendors/bulk-upload', { vendors }).then((r) => r.data);
