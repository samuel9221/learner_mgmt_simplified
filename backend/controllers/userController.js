// ============================================================================
// USER CONTROLLER
// User management CRUD operations
// ============================================================================

const { query } = require('../config/database');
const { hashPassword } = require('../utils/auth');

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params = [];
    
    if (search) {
      whereClause = `WHERE username ILIKE $1 OR email ILIKE $1 OR 
                     first_name ILIKE $1 OR last_name ILIKE $1`;
      params.push(`%${search}%`);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated data
    const dataQuery = `
      SELECT 
        id, username, email, role, first_name, last_name, 
        phone_number, is_active, created_at, last_login
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    const result = await query(dataQuery, [...params, limit, offset]);
    
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin)
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT id, username, email, role, first_name, last_name, 
              phone_number, is_active, created_at, last_login
       FROM users 
       WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user'
    });
  }
};

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admin)
 */
const createUser = async (req, res) => {
  try {
    const { username, email, password, role, first_name, last_name, phone_number } = req.body;
    
    // Validation
    if (!username || !email || !password || !role || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }
    
    // Check if username or email already exists
    const existing = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    
    // Hash password
    const password_hash = await hashPassword(password);
    
    // Create user
    const result = await query(
      `INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone_number, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, email, role, first_name, last_name, phone_number, is_active, created_at`,
      [username, email, password_hash, role, first_name, last_name, phone_number, req.user.id]
    );
    
    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_data, ip_address)
       VALUES ($1, 'CREATE', 'users', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
    );
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, first_name, last_name, phone_number, is_active } = req.body;
    
    // Check if user exists
    const existing = await query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Build update query
    const updates = [];
    const values = [id];
    let paramCount = 2;
    
    if (email) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }
    
    if (first_name) {
      updates.push(`first_name = $${paramCount}`);
      values.push(first_name);
      paramCount++;
    }
    
    if (last_name) {
      updates.push(`last_name = $${paramCount}`);
      values.push(last_name);
      paramCount++;
    }
    
    if (phone_number !== undefined) {
      updates.push(`phone_number = $${paramCount}`);
      values.push(phone_number);
      paramCount++;
    }
    
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    updates.push('updated_at = NOW()');
    
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $1 
       RETURNING id, username, email, role, first_name, last_name, phone_number, is_active, updated_at`,
      values
    );
    
    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES ($1, 'UPDATE', 'users', $2, $3, $4, $5)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0]), req.ip]
    );
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Super Admin)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cannot delete self
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    // Check if user exists
    const existing = await query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Delete user
    await query('DELETE FROM users WHERE id = $1', [id]);
    
    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, ip_address)
       VALUES ($1, 'DELETE', 'users', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), req.ip]
    );
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};