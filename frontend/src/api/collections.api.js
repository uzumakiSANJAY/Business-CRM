import api from './axios';

export const getCollections    = (params = {}) => {
  const q = new URLSearchParams();
  if (params.from_date)    q.set('from_date', params.from_date);
  if (params.to_date)      q.set('to_date', params.to_date);
  if (params.collector_id) q.set('collector_id', params.collector_id);
  if (params.status)       q.set('status', params.status);
  if (params.vendor_id)    q.set('vendor_id', params.vendor_id);
  if (params.route)        q.set('route', params.route);
  const qs = q.toString();
  return api.get(`/collections${qs ? `?${qs}` : ''}`).then((r) => r.data.collections);
};
export const createCollection  = (data)     => api.post('/collections', data).then((r) => r.data);
export const confirmCollection = (id)       => api.put(`/collections/${id}/confirm`).then((r) => r.data);
export const rejectCollection  = (id, reason) =>
  api.put(`/collections/${id}/reject`, { rejection_reason: reason }).then((r) => r.data);
