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
router.get('/:id/papers', getSubjectPapers);                    // Add this

// Admin only routes
router.post('/', authorizeAdmin, createSubject);
router.put('/:id', authorizeAdmin, updateSubject);
router.delete('/:id', authorizeAdmin, deleteSubject);
router.post('/:id/papers', authorizeAdmin, addSubjectPaper);           // Add this
router.put('/papers/:paperId', authorizeAdmin, updateSubjectPaper);    // Add this
router.delete('/papers/:paperId', authorizeAdmin, deleteSubjectPaper); // Add this

module.exports = router;