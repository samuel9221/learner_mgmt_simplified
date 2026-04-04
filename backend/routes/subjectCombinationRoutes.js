// ============================================================================
// SUBJECT COMBINATION ROUTES
// /api/subject-combinations
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  getAllCombinations,
  getCombinationById,
  createCombination,
  updateCombination,
  toggleCombinationActive,
  deleteCombination,
  getAvailableSubjectsForCombination,
} = require('../controllers/subjectCombinationController');

const {
  authenticate,
  authorizeAdmin,
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// IMPORTANT: Specific routes BEFORE dynamic routes
// Public (authenticated) routes
router.get('/', getAllCombinations);
router.get('/available-subjects', getAvailableSubjectsForCombination);  // Specific - BEFORE /:id
router.get('/:id', getCombinationById);                                  // Dynamic - AFTER specific

// Admin only routes
router.post('/', authorizeAdmin, createCombination);
router.put('/:id', authorizeAdmin, updateCombination);
router.patch('/:id/toggle-active', authorizeAdmin, toggleCombinationActive);
router.delete('/:id', authorizeAdmin, deleteCombination);

module.exports = router;