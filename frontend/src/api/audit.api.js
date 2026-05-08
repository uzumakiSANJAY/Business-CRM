import api from './axios';

export const getAuditLogs = (page = 1, limit = 20) =>
  api.get(`/audit?page=${page}&limit=${limit}`).then((r) => r.data);
