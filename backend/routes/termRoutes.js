// ============================================================================
// TERM ROUTES
// /api/terms
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  getAllTerms,
  getCurrentTerm,
  getTermById,
  createTerm,
  setCurrentTerm,
  deleteTerm,
} = require('../controllers/termController');

const {
  authenticate,
  authorizeAdmin,
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Public (authenticated) routes
router.get('/', getAllTerms);
router.get('/current', getCurrentTerm);
router.get('/:id', getTermById);

// Admin routes
router.post('/', authorizeAdmin, createTerm);
router.patch('/:id/set-current', authorizeAdmin, setCurrentTerm);
router.delete('/:id', authorizeAdmin, deleteTerm);

module.exports = router;