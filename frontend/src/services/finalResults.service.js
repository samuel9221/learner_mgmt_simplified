// frontend/src/services/finalResults.service.js
const FR = "/api/final-results";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` });

export const finalResultsService = {
  getByTerm: (termId) => fetch(`${FR}/term/${termId}`, { headers: h() }).then(r => r.json()),
  getByTermAndStream: (termId, streamId) => fetch(`${FR}/term/${termId}/stream/${streamId}`, { headers: h() }).then(r => r.json()),
  getByLearner: (learnerId) => fetch(`${FR}/learner/${learnerId}`, { headers: h() }).then(r => r.json()),
  getLearnerTerm: (learnerId, termId) => fetch(`${FR}/learner/${learnerId}/term/${termId}`, { headers: h() }).then(r => r.json()),
  getById: (id) => fetch(`${FR}/${id}`, { headers: h() }).then(r => r.json()),
  computeForTerm: (termId) => fetch(`${FR}/compute/term/${termId}`, { method: "POST", headers: h() }).then(r => r.json()),
  computeForLearner: (learnerId, termId) => fetch(`${FR}/compute/learner/${learnerId}/term/${termId}`, { method: "POST", headers: h() }).then(r => r.json()),
  update: (id, body) => fetch(`${FR}/${id}`, { method: "PUT", headers: h(), body: JSON.stringify(body) }).then(r => r.json()),
};

// ─────────────────────────────────────────────────────────────────────────────
// frontend/src/services/analysis.service.js
const AN = "/api/analysis";

export const analysisService = {
  getStreamAnalysis: (streamId, termId) => fetch(`${AN}/stream/${streamId}/term/${termId}`, { headers: h() }).then(r => r.json()),
  getClassAnalysis: (classId, termId) => fetch(`${AN}/class/${classId}/term/${termId}`, { headers: h() }).then(r => r.json()),
  getSubjectAnalysis: (subjectId, termId) => fetch(`${AN}/subject/${subjectId}/term/${termId}`, { headers: h() }).then(r => r.json()),
  getLearnerAnalysis: (learnerId, termId) => fetch(`${AN}/learner/${learnerId}/term/${termId}`, { headers: h() }).then(r => r.json()),
  getStreamRankings: (streamId, termId) => fetch(`${AN}/stream/${streamId}/term/${termId}/rankings`, { headers: h() }).then(r => r.json()),
  getClassRankings: (classId, termId) => fetch(`${AN}/class/${classId}/term/${termId}/rankings`, { headers: h() }).then(r => r.json()),
  getTermOverview: (termId) => fetch(`${AN}/term/${termId}/overview`, { headers: h() }).then(r => r.json()),
};

// ─────────────────────────────────────────────────────────────────────────────
// frontend/src/services/reports.service.js
const RP = "/api/reports";

export const reportsService = {
  // JSON (in-app view)
  getLearnerReport: (learnerId, termId) => fetch(`${RP}/learner/${learnerId}/term/${termId}`, { headers: h() }).then(r => r.json()),
  getStreamReport: (streamId, termId) => fetch(`${RP}/stream/${streamId}/term/${termId}`, { headers: h() }).then(r => r.json()),
  getSubjectReport: (subjectId, termId) => fetch(`${RP}/subject/${subjectId}/term/${termId}`, { headers: h() }).then(r => r.json()),

  // PDF download — opens in new tab or triggers download
  downloadLearnerPdf: (learnerId, termId) => {
    window.open(`${RP}/learner/${learnerId}/term/${termId}/pdf?token=${localStorage.getItem("token")}`, "_blank");
  },
  downloadStreamPdf: (streamId, termId) => {
    window.open(`${RP}/stream/${streamId}/term/${termId}/pdf?token=${localStorage.getItem("token")}`, "_blank");
  },
  downloadSubjectPdf: (subjectId, termId) => {
    window.open(`${RP}/subject/${subjectId}/term/${termId}/pdf?token=${localStorage.getItem("token")}`, "_blank");
  },
  downloadClassPdf: (classId, termId) => {
    window.open(`${RP}/class/${classId}/term/${termId}/pdf?token=${localStorage.getItem("token")}`, "_blank");
  },
};