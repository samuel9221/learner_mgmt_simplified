// ─────────────────────────────────────────────────────────────────────────────
// gradingScales.service.js
// frontend/src/services/gradingScales.service.js
// ─────────────────────────────────────────────────────────────────────────────
import api from "./api";

const BASE = "/grading-scales";

export const gradingScalesService = {
  getAll: () => api.get(BASE).then(r => r.data),
  getById: (id) => api.get(`${BASE}/${id}`).then(r => r.data),
  create: (body) => api.post(BASE, body).then(r => r.data),
  update: (id, body) => api.put(`${BASE}/${id}`, body).then(r => r.data),
  remove: (id) => api.delete(`${BASE}/${id}`).then(r => r.data),
  resetToDefaults: () => api.post(`${BASE}/reset/defaults`).then(r => r.data),
};
