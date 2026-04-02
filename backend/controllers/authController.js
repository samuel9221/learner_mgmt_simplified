// ============================================================================
// AUTHENTICATION CONTROLLER
// Handles login, logout, token refresh
// ============================================================================

const { authenticateUser, refreshAccessToken } = require('../utils/auth');
const { query } = require('../config/database');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Authenticate user
    const result = await authenticateUser(username, password);
    
    // Log successful login
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, ip_address)
       VALUES ($1, 'LOGIN', 'users', $2)`,
      [result.user.id, req.ip || req.connection.remoteAddress]
    );
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    // Log logout
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, ip_address)
       VALUES ($1, 'LOGOUT', 'users', $2)`,
      [req.user.id, req.ip || req.connection.remoteAddress]
    );
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    const result = await refreshAccessToken(refreshToken);
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Token refresh failed'
    });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, email, role, first_name, last_name, phone_number, 
              is_active, created_at, last_login
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile'
    });
  }
};

module.exports = {
  login,
  logout,
  refresh,
  getMe
};