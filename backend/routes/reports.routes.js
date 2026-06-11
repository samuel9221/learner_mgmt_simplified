const express = require('express');
const router  = express.Router();
const reportsController = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// Special middleware for PDF routes:
// ─────────────────────────────────────────────────────────────────────────────
const authenticatePdf = (req, res, next) => {
  // If a token is in the query string, inject it as a header so the
  // existing authenticate middleware can read it normally.
  if (req.query.token && !req.headers['authorization']) {
    req.headers['authorization'] = `Bearer ${req.query.token}`;
  }
  return authenticate(req, res, next);
};

// ── JSON (in-app view) — standard header auth ─────────────────────────────
router.get('/learner/:learnerId/term/:termId',
  authenticate,
  reportsController.getLearnerReport
);

router.get('/stream/:streamId/term/:termId',
  authenticate,
  reportsController.getStreamReport
);

router.get('/subject/:subjectId/term/:termId',
  authenticate,
  reportsController.getSubjectReport
);

// ── PDF Export — accepts token from query param OR header ─────────────────
router.get('/learner/:learnerId/term/:termId/pdf',
  authenticatePdf,
  reportsController.getLearnerReportPdf
);

router.get('/stream/:streamId/term/:termId/pdf',
  authenticatePdf,
  reportsController.getStreamReportPdf
);

router.get('/subject/:subjectId/term/:termId/pdf',
  authenticatePdf,
  reportsController.getSubjectReportPdf
);

router.get('/class/:classId/term/:termId/pdf',
  authenticatePdf,
  reportsController.getClassReportPdf
);

module.exports = router;