// ============================================================================
// SUBJECT ROUTES
// /api/subjects
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  getAllSubjects,
  getSubjectById,
  getSubjectTeachers,
  getSubjectCompetencies,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectPapers,
  addSubjectPaper,
  updateSubjectPaper,
  deleteSubjectPaper,
  getCompulsorySubjects,
  getOptionalSubjects,
  getSubsidiarySubjects,
} = require('../controllers/subjectController');

const {
  authenticate,
  authorizeAdmin,
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// IMPORTANT: Specific routes MUST come BEFORE dynamic routes
// Public (authenticated) routes - SPECIFIC ROUTES FIRST
router.get('/compulsory/:level', getCompulsorySubjects);        // Specific
router.get('/optional/:level', getOptionalSubjects);            // Specific
router.get('/subsidiaries', getSubsidiarySubjects);             // Specific - MUST be before /:id

// Dynamic routes - AFTER specific routes
router.get('/', getAllSubjects);
router.get('/:id', getSubjectById);                             // Dynamic - comes AFTER /subsidiaries
router.get('/:id/teachers', getSubjectTeachers);
router.get('/:id/competencies', getSubjectCompetencies);
router.get('/:id/papers', getSubjectPapers);

// Admin only routes
router.post('/', authorizeAdmin, createSubject);
router.put('/:id', authorizeAdmin, updateSubject);
router.delete('/:id', authorizeAdmin, deleteSubject);
router.post('/:id/papers', authorizeAdmin, addSubjectPaper);
router.put('/papers/:paperId', authorizeAdmin, updateSubjectPaper);
router.delete('/papers/:paperId', authorizeAdmin, deleteSubjectPaper);

module.exports = router;