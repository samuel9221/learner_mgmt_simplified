// ============================================================================
// ACADEMIC YEAR SERVICE
// API calls for academic years
// ============================================================================

import api from './api';

/**
 * Get all academic years
 */
export const getAcademicYears = async (params = {}) => {
  try {
    const response = await api.get('/academic-years', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get current academic year
 */
export const getCurrentAcademicYear = async () => {
  try {
    const response = await api.get('/academic-years/current');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get academic year by ID
 */
export const getAcademicYearById = async (id) => {
  try {
    const response = await api.get(`/academic-years/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get academic year statistics
 */
export const getAcademicYearStatistics = async (id) => {
  try {
    const response = await api.get(`/academic-years/${id}/statistics`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Create new academic year
 */
export const createAcademicYear = async (data) => {
  try {
    const response = await api.post('/academic-years', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update academic year
 */
export const updateAcademicYear = async (id, data) => {
  try {
    const response = await api.put(`/academic-years/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Lock academic year
 */
export const lockAcademicYear = async (id) => {
  try {
    const response = await api.patch(`/academic-years/${id}/lock`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Unlock academic year
 */
export const unlockAcademicYear = async (id) => {
  try {
    const response = await api.patch(`/academic-years/${id}/unlock`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Set as current academic year
 */
export const setCurrentAcademicYear = async (id) => {
  try {
    const response = await api.patch(`/academic-years/${id}/set-current`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete academic year
 */
export const deleteAcademicYear = async (id) => {
  try {
    const response = await api.delete(`/academic-years/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};