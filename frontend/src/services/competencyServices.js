// ============================================================================
// COMPETENCY SERVICE
// API calls for competency management
// ============================================================================

import api from './api';

/**
 * Get competency areas for a subject
 */
export const getSubjectCompetencyAreas = async (subjectId) => {
  try {
    const response = await api.get(`/competencies/subject/${subjectId}/areas`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get competencies in an area
 */
export const getAreaCompetencies = async (areaId) => {
  try {
    const response = await api.get(`/competencies/area/${areaId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Create competency area
 */
export const createCompetencyArea = async (data) => {
  try {
    const response = await api.post('/competencies/areas', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update competency area
 */
export const updateCompetencyArea = async (id, data) => {
  try {
    const response = await api.put(`/competencies/areas/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete competency area
 */
export const deleteCompetencyArea = async (id) => {
  try {
    const response = await api.delete(`/competencies/areas/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Create competency
 */
export const createCompetency = async (data) => {
  try {
    const response = await api.post('/competencies', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update competency
 */
export const updateCompetency = async (id, data) => {
  try {
    const response = await api.put(`/competencies/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete competency
 */
export const deleteCompetency = async (id) => {
  try {
    const response = await api.delete(`/competencies/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};