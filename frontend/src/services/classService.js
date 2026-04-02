// ============================================================================
// CLASS SERVICE
// API calls for classes and streams
// ============================================================================

import api from './api';

/**
 * Get all classes
 */
export const getClasses = async (params = {}) => {
  try {
    const response = await api.get('/classes', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get class by ID
 */
export const getClassById = async (id) => {
  try {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Create new class
 */
export const createClass = async (data) => {
  try {
    const response = await api.post('/classes', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Create stream for a class
 */
export const createStream = async (classId, data) => {
  try {
    const response = await api.post(`/classes/${classId}/streams`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update stream
 */
export const updateStream = async (streamId, data) => {
  try {
    const response = await api.put(`/classes/streams/${streamId}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete stream
 */
export const deleteStream = async (streamId) => {
  try {
    const response = await api.delete(`/classes/streams/${streamId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get available teachers
 */
export const getAvailableTeachers = async () => {
  try {
    const response = await api.get('/classes/teachers/available');
    return response.data;
  } catch (error) {
    throw error;
  }
};