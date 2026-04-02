// ============================================================================
// SUBJECT SERVICE
// API calls for subjects
// ============================================================================

import api from './api';

/**
 * Get all subjects
 */
export const getSubjects = async (params = {}) => {
  try {
    const response = await api.get('/subjects', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get subject by ID
 */
export const getSubjectById = async (id) => {
  try {
    const response = await api.get(`/subjects/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get teachers assigned to a subject
 */
export const getSubjectTeachers = async (id) => {
  try {
    const response = await api.get(`/subjects/${id}/teachers`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get competencies for a subject
 */
export const getSubjectCompetencies = async (id) => {
  try {
    const response = await api.get(`/subjects/${id}/competencies`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Create new subject
 */
export const createSubject = async (data) => {
  try {
    const response = await api.post('/subjects', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update subject
 */
export const updateSubject = async (id, data) => {
  try {
    const response = await api.put(`/subjects/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete subject
 */
export const deleteSubject = async (id) => {
  try {
    const response = await api.delete(`/subjects/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

//added here for subject papers
/**
 * Get papers for a subject
 */
export const getSubjectPapers = async (subjectId) => {
  try {
    const response = await api.get(`/subjects/${subjectId}/papers`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Add paper to subject
 */
export const addSubjectPaper = async (subjectId, data) => {
  try {
    const response = await api.post(`/subjects/${subjectId}/papers`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update subject paper
 */
export const updateSubjectPaper = async (paperId, data) => {
  try {
    const response = await api.put(`/subjects/papers/${paperId}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete subject paper
 */
export const deleteSubjectPaper = async (paperId) => {
  try {
    const response = await api.delete(`/subjects/papers/${paperId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};