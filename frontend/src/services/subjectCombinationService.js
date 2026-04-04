// ============================================================================
// SUBJECT COMBINATION SERVICE
// API calls for subject combinations (S5/S6)
// ============================================================================

import api from './api';

/**
 * Get all combinations
 */
export const getCombinations = async (params = {}) => {
  try {
    const response = await api.get('/subject-combinations', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get combination by ID
 */
export const getCombinationById = async (id) => {
  try {
    const response = await api.get(`/subject-combinations/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Create new combination
 */
export const createCombination = async (data) => {
  try {
    const response = await api.post('/subject-combinations', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update combination
 */
export const updateCombination = async (id, data) => {
  try {
    const response = await api.put(`/subject-combinations/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Toggle combination active status
 */
export const toggleCombinationActive = async (id) => {
  try {
    const response = await api.patch(`/subject-combinations/${id}/toggle-active`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete combination
 */
export const deleteCombination = async (id) => {
  try {
    const response = await api.delete(`/subject-combinations/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get available subjects for combinations
 */
export const getAvailableSubjects = async () => {
  try {
    const response = await api.get('/subject-combinations/available-subjects');
    return response.data;
  } catch (error) {
    throw error;
  }
};