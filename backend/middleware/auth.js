// ============================================================================
// AUTHENTICATION MIDDLEWARE
// JWT verification and role-based access control
// ============================================================================

const { verifyToken } = require('../utils/auth');
const { query } = require('../config/database');

/**
 * Authenticate request using JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authentication required.'
      });
    }
    
    // Extract token
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Verify user still exists and is active
    const result = await query(
      'SELECT id, username, email, role, first_name, last_name, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = result.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive'
      });
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    };
    
    next();
  } catch (error) {
    if (error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Authentication failed.'
    });
  }
};

/**
 * Authorize Super Admin only
 */
const authorizeSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin privileges required.'
    });
  }
  next();
};

/**
 * Authorize Admin and above (Super Admin, Admin)
 */
const authorizeAdmin = (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

/**
 * Authorize Teacher and above (all roles)
 */
const authorizeTeacher = (req, res, next) => {
  if (!['super_admin', 'admin', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Teacher privileges required.'
    });
  }
  next();
};

module.exports = {
  authenticate,
  authorizeSuperAdmin,
  authorizeAdmin,
  authorizeTeacher
};