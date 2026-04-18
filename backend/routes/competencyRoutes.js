// ============================================================================
// COMPETENCY ROUTES
// /api/competencies
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  getSubjectCompetencyAreas,
  getAreaCompetencies,
  createCompetencyArea,
  updateCompetencyArea,
  deleteCompetencyArea,
  createCompetency,
  updateCompetency,
  deleteCompetency,
} = require('../controllers/competencyController');

const {
  authenticate,
  authorizeAdmin,
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Public (authenticated) routes
router.get('/subject/:subjectId/areas', getSubjectCompetencyAreas);
router.get('/area/:areaId', getAreaCompetencies);

// Admin only routes
router.post('/areas', authorizeAdmin, createCompetencyArea);
router.put('/areas/:id', authorizeAdmin, updateCompetencyArea);
router.delete('/areas/:id', authorizeAdmin, deleteCompetencyArea);

router.post('/', authorizeAdmin, createCompetency);
router.put('/:id', authorizeAdmin, updateCompetency);
router.delete('/:id', authorizeAdmin, deleteCompetency);

module.exports = router;