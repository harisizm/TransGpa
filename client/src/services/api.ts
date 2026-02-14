import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const API_URL = `${BASE_URL}/api/metrics`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const trackEvent = async (data: any) => {
  try {
    const userId = localStorage.getItem('transgpa_user_id');
    if (userId) {
      // sessionId should be in 'data' from useTracking hook
      const payload = { ...data, userId };
      console.log(`[API Debug] Sending to ${API_URL}/track`, payload);
      await api.post('/track', payload);
    } else {
      console.warn('[API Debug] No userId found, skipping trackEvent');
    }
  } catch (error) {
    console.error('Failed to track event [API Error]', error);
  }
};

export const getDashboardMetrics = async () => {
  const response = await api.get('/dashboard');
  return response.data;
};

export const getAdminAnalytics = async () => {
  // Use direct axios call to avoid /api/metrics base path
  const response = await axios.get(`${BASE_URL}/api/admin/analytics`);
  return response.data;
};

export const getPaginatedUploads = async (params: { page: number; limit: number; search: string; sortBy: string; sortOrder: 'asc' | 'desc' }) => {
  const response = await axios.get(`${BASE_URL}/api/admin/analytics/uploads`, { params });
  return response.data;
};

export const getReportData = async (startDate: string, endDate: string) => {
  const response = await axios.get(`${BASE_URL}/api/admin/analytics/report`, {
    params: { startDate, endDate }
  });
  return response.data;
};

export const deleteUploads = async (ids: string[], cascade: boolean = false) => {
  const response = await axios.delete(`${BASE_URL}/api/admin/analytics/uploads`, {
    data: { ids, cascade }
  });
  return response.data;
};

export const cleanupOrphans = async () => {
  const response = await axios.post(`${BASE_URL}/api/admin/analytics/cleanup`);
  return response.data;
};

export default api;
