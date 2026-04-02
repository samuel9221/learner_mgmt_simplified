// ============================================================================
// CLASS ROUTES
// /api/classes
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  getAllClasses,
  getClassById,
  createClass,
  createStream,
  updateStream,
  deleteStream,
  getAvailableTeachers,
} = require('../controllers/classController');

const {
  authenticate,
  authorizeAdmin,
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Public (authenticated) routes
router.get('/', getAllClasses);
router.get('/teachers/available', getAvailableTeachers);
router.get('/:id', getClassById);

// Admin only routes
router.post('/', authorizeAdmin, createClass);
router.post('/:id/streams', authorizeAdmin, createStream);
router.put('/streams/:streamId', authorizeAdmin, updateStream);
router.delete('/streams/:streamId', authorizeAdmin, deleteStream);

module.exports = router;