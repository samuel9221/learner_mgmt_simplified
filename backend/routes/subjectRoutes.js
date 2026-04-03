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
  getSubjectPapers,        // Add this
  addSubjectPaper,         // Add this
  updateSubjectPaper,      // Add this
  deleteSubjectPaper,      // Add this
  getCompulsorySubjects,   // Add this
  getOptionalSubjects,     // Add this
  getSubsidiarySubjects,   // Add this
} = require('../controllers/subjectController');

const {
  authenticate,
  authorizeAdmin,
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Public (authenticated) routes
router.get('/', getAllSubjects);
router.get('/:id', getSubjectById);
router.get('/:id/teachers', getSubjectTeachers);
router.get('/:id/competencies', getSubjectCompetencies);
router.get('/:id/papers', getSubjectPapers);                    // Added this
router.get('/compulsory/:level', getCompulsorySubjects);        // Added this
router.get('/optional/:level', getOptionalSubjects);            // Added this
router.get('/subsidiaries', getSubsidiarySubjects);             // Added this

// Admin only routes
router.post('/', authorizeAdmin, createSubject);
router.put('/:id', authorizeAdmin, updateSubject);
router.delete('/:id', authorizeAdmin, deleteSubject);
router.post('/:id/papers', authorizeAdmin, addSubjectPaper);           // Added this
router.put('/papers/:paperId', authorizeAdmin, updateSubjectPaper);    // Added this
router.delete('/papers/:paperId', authorizeAdmin, deleteSubjectPaper); // Added this

module.exports = router;