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

// IMPORTANT: Specific routes BEFORE dynamic routes
// Public (authenticated) routes
router.get('/', getAllLearners);

// Admin only routes - SPECIFIC ROUTES FIRST
router.post('/', authorizeAdmin, admitLearner);              // POST /api/learners (create)
router.post('/:id/enroll', authorizeAdmin, enrollLearner);  // Specific route with /enroll

// Dynamic routes - AFTER specific routes
router.get('/:id', getLearnerById);                          // GET /api/learners/:id
router.put('/:id', authorizeAdmin, updateLearner);          // PUT /api/learners/:id
router.delete('/:id', authorizeAdmin, deleteLearner);       // DELETE /api/learners/:id

module.exports = router;