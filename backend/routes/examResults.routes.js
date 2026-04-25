const express = require('express');
const router = express.Router();
const examResultsController = require('../controllers/examResults.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.use(authenticate);

// GET  /api/exam-results                                        - Get all (admin)
router.get('/', authorizeAdmin, examResultsController.getAll);

// GET  /api/exam-results/session/:sessionId                     - All results for a session
router.get('/session/:sessionId', examResultsController.getBySession);

// GET  /api/exam-results/session/:sessionId/stream/:streamId    - Results by session + stream
router.get('/session/:sessionId/stream/:streamId', examResultsController.getBySessionAndStream);

// GET  /api/exam-results/learner/:learnerId                     - All results for a learner
router.get('/learner/:learnerId', examResultsController.getByLearner);

// GET  /api/exam-results/learner/:learnerId/session/:sessionId  - Specific learner + session
router.get('/learner/:learnerId/session/:sessionId', examResultsController.getLearnerSessionResults);

// GET  /api/exam-results/:id                                    - Single result
router.get('/:id', examResultsController.getById);

// POST /api/exam-results                     - Enter single result
router.post('/', examResultsController.create);

// POST /api/exam-results/bulk               - Bulk entry for a stream (teacher enters whole class)
router.post('/bulk', examResultsController.bulkCreate);

// PUT  /api/exam-results/:id               - Update single result
router.put('/:id', examResultsController.update);

// DELETE /api/exam-results/:id             - Delete result (admin only)
router.delete('/:id', authorizeAdmin, examResultsController.remove);

module.exports = router;