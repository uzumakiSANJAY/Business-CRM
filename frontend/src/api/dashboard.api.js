import api from './axios';

export const getDashboardStats   = () => api.get('/dashboard/stats').then((r) => r.data);
export const getMonthlyChart     = () => api.get('/dashboard/monthly-chart').then((r) => r.data.chart);
export const getDailyCollections = () => api.get('/dashboard/daily').then((r) => r.data.daily);
export const getVendorTable      = () => api.get('/dashboard/vendor-table').then((r) => r.data.vendors);
