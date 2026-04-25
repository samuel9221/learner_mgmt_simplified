const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.use(authenticate);

// ── In-app view (JSON) ──────────────────────────────────────────────────────

// GET /api/reports/learner/:learnerId/term/:termId          - Individual learner report card (JSON)
router.get('/learner/:learnerId/term/:termId', reportsController.getLearnerReport);

// GET /api/reports/stream/:streamId/term/:termId            - Full stream report (JSON)
router.get('/stream/:streamId/term/:termId', reportsController.getStreamReport);

// GET /api/reports/subject/:subjectId/term/:termId          - Subject report (JSON)
router.get('/subject/:subjectId/term/:termId', reportsController.getSubjectReport);

// ── PDF Export (puppeteer) ──────────────────────────────────────────────────

// GET /api/reports/learner/:learnerId/term/:termId/pdf      - Single learner PDF report card
router.get('/learner/:learnerId/term/:termId/pdf', reportsController.getLearnerReportPdf);

// GET /api/reports/stream/:streamId/term/:termId/pdf        - All learners in stream (bulk PDF)
router.get('/stream/:streamId/term/:termId/pdf', reportsController.getStreamReportPdf);

// GET /api/reports/subject/:subjectId/term/:termId/pdf      - Subject analysis PDF
router.get('/subject/:subjectId/term/:termId/pdf', reportsController.getSubjectReportPdf);

// GET /api/reports/class/:classId/term/:termId/pdf          - Full class PDF (all streams)
router.get('/class/:classId/term/:termId/pdf', authorizeAdmin, reportsController.getClassReportPdf);

module.exports = router;