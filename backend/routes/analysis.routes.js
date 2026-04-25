const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysis.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/analysis/stream/:streamId/term/:termId          - Stream analysis (rankings, averages, grade distribution)
router.get('/stream/:streamId/term/:termId', analysisController.getStreamAnalysis);

// GET /api/analysis/class/:classId/term/:termId            - Class-wide analysis across all streams
router.get('/class/:classId/term/:termId', analysisController.getClassAnalysis);

// GET /api/analysis/subject/:subjectId/term/:termId        - Subject analysis across streams
router.get('/subject/:subjectId/term/:termId', analysisController.getSubjectAnalysis);

// GET /api/analysis/learner/:learnerId/term/:termId        - Individual learner performance
router.get('/learner/:learnerId/term/:termId', analysisController.getLearnerAnalysis);

// GET /api/analysis/stream/:streamId/term/:termId/rankings - Stream rankings per subject
router.get('/stream/:streamId/term/:termId/rankings', analysisController.getStreamRankings);

// GET /api/analysis/class/:classId/term/:termId/rankings   - Class-wide rankings
router.get('/class/:classId/term/:termId/rankings', analysisController.getClassRankings);

// GET /api/analysis/term/:termId/overview                  - School-wide term overview
router.get('/term/:termId/overview', analysisController.getTermOverview);

module.exports = router;