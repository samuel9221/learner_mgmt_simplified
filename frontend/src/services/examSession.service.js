// frontend/src/services/examSessions.service.js
import api from "./api";

const BASE = "/exam-sessions";

export const examSessionsService = {
  getAll: () => api.get(BASE).then(r => r.data),
  getByTerm: (termId) => api.get(`${BASE}/term/${termId}`).then(r => r.data),
  getById: (id) => api.get(`${BASE}/${id}`).then(r => r.data),
  create: (body) => api.post(BASE, body).then(r => r.data),
  update: (id, body) => api.put(`${BASE}/${id}`, body).then(r => r.data),
  toggleActive: (id) => api.patch(`${BASE}/${id}/toggle-active`).then(r => r.data),
  remove: (id) => api.delete(`${BASE}/${id}`).then(r => r.data),
};
