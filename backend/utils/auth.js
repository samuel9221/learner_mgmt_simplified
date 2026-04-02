// ============================================================================
// AUTHENTICATION UTILITIES
// JWT token generation, password hashing, and verification
// ============================================================================

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

// JWT secret and configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

// ============================================================================
// PASSWORD UTILITIES
// ============================================================================

/**
 * Hash password using bcrypt
 */
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    throw new Error('Error hashing password: ' + error.message);
  }
};

/**
 * Compare password with hash
 */
const comparePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Error comparing password: ' + error.message);
  }
};

// ============================================================================
// JWT TOKEN UTILITIES
// ============================================================================

/**
 * Generate JWT access token
 */
const generateToken = (payload) => {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
    return token;
  } catch (error) {
    throw new Error('Error generating token: ' + error.message);
  }
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (payload) => {
  try {
    const token = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN
    });
    return token;
  } catch (error) {
    throw new Error('Error generating refresh token: ' + error.message);
  }
};

/**
 * Verify JWT access token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed: ' + error.message);
    }
  }
};

/**
 * Verify JWT refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token: ' + error.message);
  }
};

// ============================================================================
// USER AUTHENTICATION
// ============================================================================

/**
 * Authenticate user with username and password
 */
const authenticateUser = async (username, password) => {
  try {
    // Find user by username or email
    const result = await query(
      'SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = TRUE',
      [username]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }
    
    const user = result.rows[0];
    
    // Compare password
    const isMatch = await comparePassword(password, user.password_hash);
    
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }
    
    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Generate tokens
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    };
    
    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user.id });
    
    // Remove sensitive data
    delete user.password_hash;
    
    return {
      user,
      accessToken,
      refreshToken
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Get user
    const result = await query(
      'SELECT * FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found or inactive');
    }
    
    const user = result.rows[0];
    
    // Generate new access token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    };
    
    const accessToken = generateToken(tokenPayload);
    
    return { accessToken };
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  authenticateUser,
  refreshAccessToken
};