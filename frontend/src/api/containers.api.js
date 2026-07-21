import api from './axios';

export const getContainerTypes    = ()        => api.get('/containers/types').then((r) => r.data.types);
export const createContainerType  = (data)    => api.post('/containers/types', data).then((r) => r.data);
export const updateContainerType  = (id, data)=> api.put(`/containers/types/${id}`, data).then((r) => r.data);
export const deleteContainerType  = (id)      => api.delete(`/containers/types/${id}`).then((r) => r.data);
export const getContainerLedger   = (id)      => api.get(`/containers/types/${id}/ledger`).then((r) => r.data.ledger);
export const containerise         = (data)    => api.post('/containers/containerise', data).then((r) => r.data);
export const sellContainers       = (data)    => api.post('/containers/sell', data).then((r) => r.data);
