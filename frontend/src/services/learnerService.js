// ============================================================================
// LEARNER SERVICE
// API calls for learner management
// ============================================================================

import api from './api';

/**
 * Get all learners
 */
export const getLearners = async (params = {}) => {
  try {
    const response = await api.get('/learners', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get learner by ID
 */
export const getLearnerById = async (id) => {
  try {
    const response = await api.get(`/learners/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Admit new learner
 */
export const admitLearner = async (data) => {
  try {
    const response = await api.post('/learners', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update learner
 */
export const updateLearner = async (id, data) => {
  try {
    const response = await api.put(`/learners/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Enroll learner in stream with subjects
 */
export const enrollLearner = async (id, data) => {
  try {
    const response = await api.post(`/learners/${id}/enroll`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete learner
 */
export const deleteLearner = async (id) => {
  try {
    const response = await api.delete(`/learners/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};