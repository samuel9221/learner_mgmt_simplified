// ============================================================================
// SUBJECT-STREAM-TEACHER ROUTES
// /api/subject-stream-teachers
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  getAllAssignments,
  getStreamAssignments,
  getTeacherAssignments,
  assignTeacherToSubject,
  updateAssignment,
  deleteAssignment,
  getAvailableTeachers,
} = require('../controllers/subjectStreamTeacherController');

const {
  authenticate,
  authorizeAdmin,
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Public (authenticated) routes
router.get('/', getAllAssignments);
router.get('/stream/:streamId', getStreamAssignments);
router.get('/teacher/:teacherId', getTeacherAssignments);
router.get('/available-teachers', getAvailableTeachers);

// Admin only routes
router.post('/', authorizeAdmin, assignTeacherToSubject);
router.put('/:id', authorizeAdmin, updateAssignment);
router.delete('/:id', authorizeAdmin, deleteAssignment);

module.exports = router;