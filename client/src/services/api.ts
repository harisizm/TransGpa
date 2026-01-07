import axios from 'axios';

const API_URL = 'http://localhost:5000/api/metrics';

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
      await api.post('/track', { ...data, userId });
    }
  } catch (error) {
    console.error('Failed to track event', error);
  }
};

export const getDashboardMetrics = async () => {
  const response = await api.get('/dashboard');
  return response.data;
};

export const getAdminAnalytics = async () => {
  // Use direct axios call to avoid /api/metrics base path
  const response = await axios.get('http://localhost:5000/api/admin/analytics');
  return response.data;
};

export const getPaginatedUploads = async (params: { page: number; limit: number; search: string; sortBy: string; sortOrder: 'asc' | 'desc' }) => {
  const response = await axios.get('http://localhost:5000/api/admin/analytics/uploads', { params });
  return response.data;
};

export const getReportData = async (startDate: string, endDate: string) => {
  const response = await axios.get('http://localhost:5000/api/admin/analytics/report', {
    params: { startDate, endDate }
  });
  return response.data;
};

export default api;
