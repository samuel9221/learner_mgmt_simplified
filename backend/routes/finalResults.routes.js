const express = require('express');
const router = express.Router();
const finalResultsController = require('../controllers/finalResults.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.use(authenticate);

// GET  /api/final-results/term/:termId                          - All final results for a term
router.get('/term/:termId', finalResultsController.getByTerm);

// GET  /api/final-results/term/:termId/stream/:streamId         - Final results by stream
router.get('/term/:termId/stream/:streamId', finalResultsController.getByTermAndStream);

// GET  /api/final-results/learner/:learnerId                    - All final results for learner
router.get('/learner/:learnerId', finalResultsController.getByLearner);

// GET  /api/final-results/learner/:learnerId/term/:termId       - Learner results for a term
router.get('/learner/:learnerId/term/:termId', finalResultsController.getLearnerTermResults);

// GET  /api/final-results/:id                                   - Single final result
router.get('/:id', finalResultsController.getById);

// POST /api/final-results/compute/term/:termId                  - Compute/recompute all finals for term
router.post('/compute/term/:termId', authorizeAdmin, finalResultsController.computeForTerm);

// POST /api/final-results/compute/learner/:learnerId/term/:termId - Compute for one learner
router.post('/compute/learner/:learnerId/term/:termId', finalResultsController.computeForLearner);

// PUT  /api/final-results/:id                                   - Manual override (admin only)
router.put('/:id', authorizeAdmin, finalResultsController.update);

module.exports = router;