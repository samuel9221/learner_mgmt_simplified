// ============================================================================
// SUBJECT-STREAM-TEACHER SERVICE
// API calls for teacher-subject-stream assignments
// ============================================================================

import api from './api';

/**
 * Get all assignments (optionally filtered)
 */
export const getAssignments = async (params = {}) => {
  try {
    const response = await api.get('/subject-stream-teachers', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get assignments for a specific stream
 */
export const getStreamAssignments = async (streamId) => {
  try {
    const response = await api.get(`/subject-stream-teachers/stream/${streamId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get assignments for a specific teacher
 */
export const getTeacherAssignments = async (teacherId) => {
  try {
    const response = await api.get(`/subject-stream-teachers/teacher/${teacherId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Assign teacher to subject in stream
 */
export const assignTeacherToSubject = async (data) => {
  try {
    const response = await api.post('/subject-stream-teachers', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update assignment (change teacher)
 */
export const updateAssignment = async (assignmentId, data) => {
  try {
    const response = await api.put(`/subject-stream-teachers/${assignmentId}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Remove assignment
 */
export const deleteAssignment = async (assignmentId) => {
  try {
    const response = await api.delete(`/subject-stream-teachers/${assignmentId}`);
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
    const response = await api.get('/subject-stream-teachers/available-teachers');
    return response.data;
  } catch (error) {
    throw error;
  }
};