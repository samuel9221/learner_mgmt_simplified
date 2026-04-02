// ============================================================================
// TERM CONTROLLER
// CRUD operations for terms
// ============================================================================

const { query, transaction } = require('../config/database');

/**
 * @route   GET /api/terms
 * @desc    Get all terms (with optional filter by academic year)
 * @access  Private
 */
const getAllTerms = async (req, res) => {
  try {
    const { academic_year_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (academic_year_id) {
      whereClause = 'WHERE t.academic_year_id = $1';
      params.push(academic_year_id);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM terms t ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const dataQuery = `
      SELECT 
        t.*,
        ay.year_name as academic_year_name,
          0 as learner_count
      FROM terms t
      JOIN academic_years ay ON t.academic_year_id = ay.id
      ${whereClause}
      ORDER BY ay.start_date DESC, t.term_number ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await query(dataQuery, [...params, limit, offset]);

    res.status(200).json({
      success: true,
      message: 'Terms retrieved successfully',
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching terms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve terms',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/terms/current
 * @desc    Get current term
 * @access  Private
 */
const getCurrentTerm = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        t.*,
        ay.year_name as academic_year_name, 
          0  as learner_count
       FROM terms t
       JOIN academic_years ay ON t.academic_year_id = ay.id
       WHERE t.is_current = TRUE
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No current term found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Current term retrieved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching current term:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve current term',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/terms/:id
 * @desc    Get term by ID
 * @access  Private
 */
const getTermById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        t.*,
        ay.year_name as academic_year_name,
        0 as learner_count
       FROM terms t
       JOIN academic_years ay ON t.academic_year_id = ay.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Term not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Term retrieved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching term:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve term',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/terms
 * @desc    Create new term
 * @access  Private (Admin)
 */
const createTerm = async (req, res) => {
  try {
    const { academic_year_id, term_number, start_date, end_date, is_current } = req.body;

    // Validation
    if (!academic_year_id || !term_number || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Academic year, term number, start date, and end date are required',
      });
    }

    // Check if academic year exists and is not locked
    const yearCheck = await query(
      'SELECT * FROM academic_years WHERE id = $1',
      [academic_year_id]
    );

    if (yearCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found',
      });
    }

    if (yearCheck.rows[0].is_locked) {
      return res.status(403).json({
        success: false,
        message: 'Cannot create term for locked academic year',
      });
    }

    // Check if term already exists
    const existing = await query(
      'SELECT id FROM terms WHERE academic_year_id = $1 AND term_number = $2',
      [academic_year_id, term_number]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Term already exists for this academic year',
      });
    }

    // If setting as current, unset other current terms
    if (is_current) {
      await query('UPDATE terms SET is_current = FALSE WHERE is_current = TRUE');
    }

    // Create term
    const result = await query(
      `INSERT INTO terms (academic_year_id, term_number, start_date, end_date, is_current, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [academic_year_id, term_number, start_date, end_date, is_current || false, req.user.id]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_data, ip_address)
       VALUES ($1, 'CREATE', 'terms', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Term created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating term:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create term',
      error: error.message,
    });
  }
};

/**
 * @route   PATCH /api/terms/:id/set-current
 * @desc    Set as current term
 * @access  Private (Admin)
 */
const setCurrentTerm = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if exists
    const existing = await query('SELECT * FROM terms WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Term not found',
      });
    }

    // Use transaction to ensure atomicity
    await transaction(async (client) => {
      // Unset current from all terms
      await client.query('UPDATE terms SET is_current = FALSE');

      // Set as current
      await client.query('UPDATE terms SET is_current = TRUE WHERE id = $1', [id]);
    });

    // Get updated record
    const result = await query('SELECT * FROM terms WHERE id = $1', [id]);

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, ip_address)
       VALUES ($1, 'SET_CURRENT', 'terms', $2, $3)`,
      [req.user.id, id, req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Term set as current successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error setting current term:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set current term',
      error: error.message,
    });
  }
};

/**
 * @route   DELETE /api/terms/:id
 * @desc    Delete term
 * @access  Private (Admin)
 */
const deleteTerm = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if exists
    const existing = await query('SELECT * FROM terms WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Term not found',
      });
    }

    // Cannot delete current term
    if (existing.rows[0].is_current) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete current term',
      });
    }

    // Check if has enrollments
    const enrollmentCheck = await query(
      'SELECT COUNT(*) FROM learner_enrollments WHERE term_id = $1',
      [id]
    );

    if (parseInt(enrollmentCheck.rows[0].count) > 0) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete term with existing enrollments',
      });
    }

    // Delete
    await query('DELETE FROM terms WHERE id = $1', [id]);

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, ip_address)
       VALUES ($1, 'DELETE', 'terms', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Term deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting term:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete term',
      error: error.message,
    });
  }
};

module.exports = {
  getAllTerms,
  getCurrentTerm,
  getTermById,
  createTerm,
  setCurrentTerm,
  deleteTerm,
};