// ============================================================================
// ACADEMIC YEAR ROUTES
// /api/academic-years
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  getAllAcademicYears,
  getCurrentAcademicYear,
  getAcademicYearById,
  getAcademicYearStatistics,
  createAcademicYear,
  updateAcademicYear,
  lockAcademicYear,
  unlockAcademicYear,
  setCurrentAcademicYear,
  deleteAcademicYear,
} = require('../controllers/academicYearController');

const {
  authenticate,
  authorizeSuperAdmin,
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Public (authenticated) routes
router.get('/', getAllAcademicYears);
router.get('/current', getCurrentAcademicYear);
router.get('/:id', getAcademicYearById);
router.get('/:id/statistics', getAcademicYearStatistics);

// Super Admin only routes
router.post('/', authorizeSuperAdmin, createAcademicYear);
router.put('/:id', authorizeSuperAdmin, updateAcademicYear);
router.patch('/:id/lock', authorizeSuperAdmin, lockAcademicYear);
router.patch('/:id/unlock', authorizeSuperAdmin, unlockAcademicYear);
router.patch('/:id/set-current', authorizeSuperAdmin, setCurrentAcademicYear);
router.delete('/:id', authorizeSuperAdmin, deleteAcademicYear);

module.exports = router;