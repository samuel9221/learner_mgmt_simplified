const express = require('express');
const router = express.Router();
const gradingScalesController = require('../controllers/gradingScales.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// All grading scale routes require authentication
router.use(authenticate);

// GET  /api/grading-scales        - Get all grading scales (all roles can view)
router.get('/', gradingScalesController.getAll);

// GET  /api/grading-scales/:id    - Get single grading scale
router.get('/:id', gradingScalesController.getById);

// POST /api/grading-scales        - Create new scale (admin only)
router.post('/', authorizeAdmin, gradingScalesController.create);

// PUT  /api/grading-scales/:id    - Update scale (admin only)
router.put('/:id', authorizeAdmin, gradingScalesController.update);

// DELETE /api/grading-scales/:id  - Delete scale (admin only)
router.delete('/:id', authorizeAdmin, gradingScalesController.remove);

// POST /api/grading-scales/reset  - Reset to defaults (admin only)
router.post('/reset/defaults', authorizeAdmin, gradingScalesController.resetToDefaults);

module.exports = router;