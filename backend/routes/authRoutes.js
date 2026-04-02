// ============================================================================
// AUTHENTICATION ROUTES
// /api/auth
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  login,
  logout,
  refresh,
  getMe
} = require('../controllers/authController');

const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.post('/refresh', refresh);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;