// ============================================================================
// ACADEMIC YEAR CONTROLLER
// CRUD operations for academic years
// ============================================================================

const { query, transaction } = require('../config/database');

/**
 * @route   GET /api/academic-years
 * @desc    Get all academic years
 * @access  Private
 */
/**
 * @route   GET /api/academic-years
 * @desc    Get all academic years
 * @access  Private
 */
const getAllAcademicYears = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query('SELECT COUNT(*) FROM academic_years');
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data with statistics
    const result = await query(
      `SELECT 
        ay.*,
        (SELECT COUNT(*) FROM terms WHERE academic_year_id = ay.id) as term_count,
        COALESCE(
          (SELECT COUNT(DISTINCT learner_id) 
           FROM learner_enrollments 
           WHERE academic_year_id = ay.id), 
          0
        ) as learner_count
       FROM academic_years ay
       ORDER BY ay.start_date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.status(200).json({
      success: true,
      message: 'Academic years retrieved successfully',
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching academic years:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve academic years',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/academic-years/current
 * @desc    Get current academic year
 * @access  Private
 */
const getCurrentAcademicYear = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        ay.*,
        (SELECT COUNT(*) FROM terms WHERE academic_year_id = ay.id) as term_count,
        COALESCE(
          (SELECT COUNT(DISTINCT learner_id) 
           FROM learner_enrollments 
           WHERE academic_year_id = ay.id), 
          0
        ) as learner_count
       FROM academic_years ay
       WHERE is_current = TRUE
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No current academic year found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Current academic year retrieved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching current academic year:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve current academic year',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/academic-years/:id
 * @desc    Get academic year by ID with statistics
 * @access  Private
 */
const getAcademicYearById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        ay.*,
        (SELECT COUNT(*) FROM terms WHERE academic_year_id = ay.id) as term_count,
        COALESCE(
          (SELECT COUNT(DISTINCT learner_id) 
           FROM learner_enrollments 
           WHERE academic_year_id = ay.id), 
          0
        ) as learner_count,
        (SELECT COUNT(*) FROM classes) as class_count
       FROM academic_years ay
       WHERE ay.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Academic year retrieved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching academic year:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve academic year',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/academic-years/:id/statistics
 * @desc    Get detailed statistics for an academic year
 * @access  Private
 */
/**
 * @route   GET /api/academic-years/:id/statistics
 * @desc    Get detailed statistics for an academic year
 * @access  Private
 */
const getAcademicYearStatistics = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if academic year exists
    const yearCheck = await query('SELECT * FROM academic_years WHERE id = $1', [id]);
    
    if (yearCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found',
      });
    }

    // Get comprehensive statistics - using simpler queries
    const stats = {
      total_terms: 0,
      total_learners: 0,
      total_classes: 0,
      total_subjects: 0
    };

    // Count terms
    const termsResult = await query(
      'SELECT COUNT(*) FROM terms WHERE academic_year_id = $1',
      [id]
    );
    stats.total_terms = parseInt(termsResult.rows[0].count);

    // Count learners enrolled in this academic year
    try {
      const learnersResult = await query(
        `SELECT COUNT(DISTINCT le.learner_id) 
         FROM learner_enrollments le
         WHERE le.academic_year_id = $1`,
        [id]
      );
      stats.total_learners = parseInt(learnersResult.rows[0].count);
    } catch (err) {
      console.log('Learner count error:', err.message);
      stats.total_learners = 0;
    }

    // Count total classes
    const classesResult = await query('SELECT COUNT(*) FROM classes');
    stats.total_classes = parseInt(classesResult.rows[0].count);

    // Count total subjects
    const subjectsResult = await query('SELECT COUNT(*) FROM subjects');
    stats.total_subjects = parseInt(subjectsResult.rows[0].count);

    res.status(200).json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/academic-years
 * @desc    Create new academic year
 * @access  Private (Super Admin)
 */
const createAcademicYear = async (req, res) => {
  try {
    const { year_name, start_date, end_date, is_current } = req.body;

    // Validation
    if (!year_name || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Year name, start date, and end date are required',
      });
    }

    // Check if year name already exists
    const existing = await query(
      'SELECT id FROM academic_years WHERE year_name = $1',
      [year_name]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Academic year with this name already exists',
      });
    }

    // If setting as current, unset other current years
    if (is_current) {
      await query('UPDATE academic_years SET is_current = FALSE WHERE is_current = TRUE');
    }

    // Create academic year
    const result = await query(
      `INSERT INTO academic_years (year_name, start_date, end_date, is_current, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [year_name, start_date, end_date, is_current || false, req.user.id]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_data, ip_address)
       VALUES ($1, 'CREATE', 'academic_years', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Academic year created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating academic year:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create academic year',
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/academic-years/:id
 * @desc    Update academic year
 * @access  Private (Super Admin)
 */
const updateAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { year_name, start_date, end_date } = req.body;

    // Check if exists
    const existing = await query('SELECT * FROM academic_years WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found',
      });
    }

    // Check if locked
    if (existing.rows[0].is_locked) {
      return res.status(403).json({
        success: false,
        message: 'Cannot update locked academic year',
      });
    }

    // Update
    const result = await query(
      `UPDATE academic_years 
       SET year_name = COALESCE($1, year_name),
           start_date = COALESCE($2, start_date),
           end_date = COALESCE($3, end_date),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [year_name, start_date, end_date, id]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES ($1, 'UPDATE', 'academic_years', $2, $3, $4, $5)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Academic year updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating academic year:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update academic year',
      error: error.message,
    });
  }
};

/**
 * @route   PATCH /api/academic-years/:id/lock
 * @desc    Lock academic year
 * @access  Private (Super Admin)
 */
const lockAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if exists and not current
    const existing = await query('SELECT * FROM academic_years WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found',
      });
    }

    if (existing.rows[0].is_current) {
      return res.status(403).json({
        success: false,
        message: 'Cannot lock current academic year',
      });
    }

    // Lock
    const result = await query(
      'UPDATE academic_years SET is_locked = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, ip_address)
       VALUES ($1, 'LOCK', 'academic_years', $2, $3)`,
      [req.user.id, id, req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Academic year locked successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error locking academic year:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock academic year',
      error: error.message,
    });
  }
};

/**
 * @route   PATCH /api/academic-years/:id/unlock
 * @desc    Unlock academic year
 * @access  Private (Super Admin)
 */
const unlockAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE academic_years SET is_locked = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found',
      });
    }

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, ip_address)
       VALUES ($1, 'UNLOCK', 'academic_years', $2, $3)`,
      [req.user.id, id, req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Academic year unlocked successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error unlocking academic year:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock academic year',
      error: error.message,
    });
  }
};

/**
 * @route   PATCH /api/academic-years/:id/set-current
 * @desc    Set as current academic year
 * @access  Private (Super Admin)
 */
const setCurrentAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if exists and not locked
    const existing = await query('SELECT * FROM academic_years WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found',
      });
    }

    if (existing.rows[0].is_locked) {
      return res.status(403).json({
        success: false,
        message: 'Cannot set locked academic year as current',
      });
    }

    // Use transaction to ensure atomicity
    await transaction(async (client) => {
      // Unset current from all years
      await client.query('UPDATE academic_years SET is_current = FALSE');

      // Set as current
      await client.query(
        'UPDATE academic_years SET is_current = TRUE WHERE id = $1',
        [id]
      );
    });

    // Get updated record
    const result = await query('SELECT * FROM academic_years WHERE id = $1', [id]);

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, ip_address)
       VALUES ($1, 'SET_CURRENT', 'academic_years', $2, $3)`,
      [req.user.id, id, req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Academic year set as current successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error setting current academic year:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set current academic year',
      error: error.message,
    });
  }
};

/**
 * @route   DELETE /api/academic-years/:id
 * @desc    Delete academic year
 * @access  Private (Super Admin)
 */
const deleteAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if exists
    const existing = await query('SELECT * FROM academic_years WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found',
      });
    }

    // Cannot delete current or locked year
    if (existing.rows[0].is_current) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete current academic year',
      });
    }

    if (existing.rows[0].is_locked) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete locked academic year',
      });
    }

    // Check if has terms
    const termsCheck = await query(
      'SELECT COUNT(*) FROM terms WHERE academic_year_id = $1',
      [id]
    );

    if (parseInt(termsCheck.rows[0].count) > 0) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete academic year with existing terms',
      });
    }

    // Delete
    await query('DELETE FROM academic_years WHERE id = $1', [id]);

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, ip_address)
       VALUES ($1, 'DELETE', 'academic_years', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Academic year deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting academic year:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete academic year',
      error: error.message,
    });
  }
};

module.exports = {
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
};