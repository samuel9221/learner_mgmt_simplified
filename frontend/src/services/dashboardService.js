// ============================================================================
// DASHBOARD SERVICE
// API calls for dashboard data
// ============================================================================

import api from './api';

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  try {
    const response = await api.get('/system/dashboard/stats');
    return response.data;
  } catch (error) {
    throw error;
  }
};