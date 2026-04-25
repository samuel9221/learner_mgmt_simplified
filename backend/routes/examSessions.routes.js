const express = require('express');
const router = express.Router();
const examSessionsController = require('../controllers/examSessions.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.use(authenticate);

// GET  /api/exam-sessions                      - Get all exam sessions
router.get('/', examSessionsController.getAll);

// GET  /api/exam-sessions/term/:termId         - Get sessions for a specific term
router.get('/term/:termId', examSessionsController.getByTerm);

// GET  /api/exam-sessions/:id                  - Get single session
router.get('/:id', examSessionsController.getById);

// POST /api/exam-sessions                      - Create session (admin only)
router.post('/', authorizeAdmin, examSessionsController.create);

// PUT  /api/exam-sessions/:id                  - Update session (admin only)
router.put('/:id', authorizeAdmin, examSessionsController.update);

// PATCH /api/exam-sessions/:id/toggle-active   - Activate/deactivate (admin only)
router.patch('/:id/toggle-active', authorizeAdmin, examSessionsController.toggleActive);

// DELETE /api/exam-sessions/:id                - Delete session (admin only)
router.delete('/:id', authorizeAdmin, examSessionsController.remove);

module.exports = router;