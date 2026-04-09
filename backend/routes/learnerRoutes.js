// ============================================================================
// LEARNER ROUTES
// /api/learners
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  getAllLearners,
  getLearnerById,
  admitLearner,
  updateLearner,
  enrollLearner,
  deleteLearner,
} = require('../controllers/learnerController');

const {
  authenticate,
  authorizeAdmin,
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Public (authenticated) routes
router.get('/', getAllLearners);
router.get('/:id', getLearnerById);

// Admin only routes
router.post('/', authorizeAdmin, admitLearner);
router.put('/:id', authorizeAdmin, updateLearner);
router.post('/:id/enroll', authorizeAdmin, enrollLearner);
router.delete('/:id', authorizeAdmin, deleteLearner);

module.exports = router;
