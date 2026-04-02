// ============================================================================
// USER ROUTES
// /api/users
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

const {
  authenticate,
  authorizeAdmin,
  authorizeSuperAdmin
} = require('../middleware/auth');

// All routes require authentication and admin privileges
router.use(authenticate);
router.use(authorizeAdmin);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', authorizeSuperAdmin, deleteUser); // Only Super Admin can delete

module.exports = router;
