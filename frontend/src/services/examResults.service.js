// frontend/src/services/examResults.service.js
import api from "./api";

const BASE = "/exam-results";

export const examResultsService = {
  getAll: () => api.get(BASE).then(r => r.data),
  getBySession: (sessionId) => api.get(`${BASE}/session/${sessionId}`).then(r => r.data),
  getBySessionAndStream: (sessionId, streamId) => api.get(`${BASE}/session/${sessionId}/stream/${streamId}`).then(r => r.data),
  getByLearner: (learnerId) => api.get(`${BASE}/learner/${learnerId}`).then(r => r.data),
  getLearnerSession: (learnerId, sessionId) => api.get(`${BASE}/learner/${learnerId}/session/${sessionId}`).then(r => r.data),
  getById: (id) => api.get(`${BASE}/${id}`).then(r => r.data),
  create: (body) => api.post(BASE, body).then(r => r.data),
  bulkCreate: (body) => api.post(`${BASE}/bulk`, body).then(r => r.data),
  update: (id, body) => api.put(`${BASE}/${id}`, body).then(r => r.data),
  remove: (id) => api.delete(`${BASE}/${id}`).then(r => r.data),
};
