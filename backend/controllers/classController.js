// ============================================================================
// CLASS CONTROLLER
// CRUD operations for classes and streams
// ============================================================================

const { query, transaction } = require('../config/database');

/**
 * @route   GET /api/classes
 * @desc    Get all classes with their streams
 * @access  Private
 */
const getAllClasses = async (req, res) => {
  try {
    const { page = 1, limit = 50, academic_year_id } = req.query;
    const offset = (page - 1) * limit;

    // If no academic year specified, use current
    let yearId = academic_year_id;
    
    if (!yearId) {
      const currentYear = await query(
        'SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1'
      );
      
      if (currentYear.rows.length > 0) {
        yearId = currentYear.rows[0].id;
      }
    }

    // Get total count
    const countQuery = yearId 
      ? 'SELECT COUNT(*) FROM classes WHERE academic_year_id = $1'
      : 'SELECT COUNT(*) FROM classes';
    
    const countParams = yearId ? [yearId] : [];
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Get classes with stream and learner counts
    const whereClause = yearId ? 'WHERE c.academic_year_id = $1' : '';
    const queryParams = yearId ? [yearId] : [];
    
    const classesQuery = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM streams WHERE class_id = c.id) as stream_count,
        (SELECT COUNT(DISTINCT le.learner_id) 
         FROM learner_enrollments le
         JOIN streams s ON le.stream_id = s.id
         WHERE s.class_id = c.id) as total_learners
       FROM classes c
       ${whereClause}
       ORDER BY c.class_name ASC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const classesResult = await query(classesQuery, [...queryParams, limit, offset]);

    // Get streams for each class
    for (let classItem of classesResult.rows) {
      const streamsResult = await query(
        `SELECT 
          s.*,
          u.first_name as teacher_first_name,
          u.last_name as teacher_last_name,
          (SELECT COUNT(DISTINCT learner_id) 
           FROM learner_enrollments 
           WHERE stream_id = s.id) as learner_count
         FROM streams s
         LEFT JOIN users u ON s.stream_teacher_id = u.id
         WHERE s.class_id = $1
         ORDER BY s.stream_name`,
        [classItem.id]
      );
      classItem.streams = streamsResult.rows;
    }

    res.status(200).json({
      success: true,
      message: 'Classes retrieved successfully',
      data: classesResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve classes',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/classes/:id
 * @desc    Get class by ID with streams
 * @access  Private
 */
const getClassById = async (req, res) => {
  try {
    const { id } = req.params;

    const classResult = await query(
      `SELECT 
        c.*,
        (SELECT COUNT(*) FROM streams WHERE class_id = c.id) as stream_count,
        (SELECT COUNT(DISTINCT le.learner_id) 
         FROM learner_enrollments le
         JOIN streams s ON le.stream_id = s.id
         WHERE s.class_id = c.id) as total_learners
       FROM classes c
       WHERE c.id = $1`,
      [id]
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    const classItem = classResult.rows[0];

    // Get streams
    const streamsResult = await query(
      `SELECT 
        s.*,
        u.first_name as teacher_first_name,
        u.last_name as teacher_last_name,
        u.email as teacher_email,
        (SELECT COUNT(DISTINCT learner_id) 
         FROM learner_enrollments 
         WHERE stream_id = s.id) as learner_count
       FROM streams s
       LEFT JOIN users u ON s.stream_teacher_id = u.id
       WHERE s.class_id = $1
       ORDER BY s.stream_name`,
      [id]
    );

    classItem.streams = streamsResult.rows;

    res.status(200).json({
      success: true,
      message: 'Class retrieved successfully',
      data: classItem,
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve class',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/classes
 * @desc    Create new class
 * @access  Private (Admin)
 */
const createClass = async (req, res) => {
  try {
    const { class_name } = req.body;

    // Validation
    if (!class_name) {
      return res.status(400).json({
        success: false,
        message: 'Class name is required',
      });
    }

    // Get current academic year
    const currentYearResult = await query(
      'SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1'
    );

    if (currentYearResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No current academic year set. Please set a current academic year first.',
      });
    }

    const academicYearId = currentYearResult.rows[0].id;

    // Check if class already exists for this academic year
    const existing = await query(
      'SELECT id FROM classes WHERE class_name = $1 AND academic_year_id = $2',
      [class_name, academicYearId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Class already exists for this academic year',
      });
    }

    // Get the logged-in user's ID
    const createdBy = req.user.id;

    console.log('Creating class with:', { class_name, academicYearId, createdBy }); // Debug log

    // Create class with current academic year and creator
    const result = await query(
      `INSERT INTO classes (class_name, academic_year_id, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [class_name, academicYearId, createdBy]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_data, ip_address)
       VALUES ($1, 'CREATE', 'classes', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create class',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/classes/:id/streams
 * @desc    Create stream for a class
 * @access  Private (Admin)
 */
const createStream = async (req, res) => {
  try {
    const { id } = req.params;
    const { stream_name, stream_teacher_id } = req.body;

    // Validation
    if (!stream_name) {
      return res.status(400).json({
        success: false,
        message: 'Stream name is required',
      });
    }

    // Check if class exists
    const classCheck = await query('SELECT * FROM classes WHERE id = $1', [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Check if stream already exists
    const existing = await query(
      'SELECT id FROM streams WHERE class_id = $1 AND stream_name = $2',
      [id, stream_name]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Stream already exists in this class',
      });
    }

    // Validate teacher if provided
    if (stream_teacher_id) {
      const teacherCheck = await query(
        "SELECT * FROM users WHERE id = $1 AND role = 'teacher'",
        [stream_teacher_id]
      );

      if (teacherCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found',
        });
      }
    }

    // Get the logged-in user's ID
    const createdBy = req.user.id;

    console.log('Creating stream with:', { class_id: id, stream_name, stream_teacher_id, createdBy }); // Debug

    // Create stream - ADDED created_by
    const result = await query(
      `INSERT INTO streams (class_id, stream_name, stream_teacher_id, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, stream_name, stream_teacher_id || null, createdBy]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_data, ip_address)
       VALUES ($1, 'CREATE', 'streams', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Stream created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stream',
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/classes/streams/:streamId
 * @desc    Update stream (assign teacher)
 * @access  Private (Admin)
 */
const updateStream = async (req, res) => {
  try {
    const { streamId } = req.params;
    const { stream_name, stream_teacher_id } = req.body; // FIXED: changed from class_teacher_id

    // Check if stream exists
    const existing = await query('SELECT * FROM streams WHERE id = $1', [streamId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found',
      });
    }

    // Validate teacher if provided
    if (stream_teacher_id) {
      const teacherCheck = await query(
        "SELECT * FROM users WHERE id = $1 AND role = 'teacher'",
        [stream_teacher_id]
      );

      if (teacherCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found',
        });
      }
    }

    // Update stream - FIXED: using stream_teacher_id
    const result = await query(
      `UPDATE streams 
       SET stream_name = COALESCE($1, stream_name),
           stream_teacher_id = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [stream_name, stream_teacher_id, streamId]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES ($1, 'UPDATE', 'streams', $2, $3, $4, $5)`,
      [req.user.id, streamId, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Stream updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating stream:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stream',
      error: error.message,
    });
  }
};

/**
 * @route   DELETE /api/classes/streams/:streamId
 * @desc    Delete stream
 * @access  Private (Admin)
 */
const deleteStream = async (req, res) => {
  try {
    const { streamId } = req.params;

    // Check if exists
    const existing = await query('SELECT * FROM streams WHERE id = $1', [streamId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found',
      });
    }

    // Check if has enrollments
    const enrollmentCheck = await query(
      'SELECT COUNT(*) FROM learner_enrollments WHERE stream_id = $1',
      [streamId]
    );

    if (parseInt(enrollmentCheck.rows[0].count) > 0) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete stream with enrolled learners',
      });
    }

    // Delete
    await query('DELETE FROM streams WHERE id = $1', [streamId]);

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, ip_address)
       VALUES ($1, 'DELETE', 'streams', $2, $3, $4)`,
      [req.user.id, streamId, JSON.stringify(existing.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Stream deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete stream',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/classes/teachers/available
 * @desc    Get available teachers (for assignment)
 * @access  Private
 */
const getAvailableTeachers = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        (SELECT COUNT(*) FROM streams WHERE stream_teacher_id = u.id) as assigned_classes_count
       FROM users u
       WHERE u.role = 'teacher' AND u.is_active = true
       ORDER BY u.first_name, u.last_name`
    );

    res.status(200).json({
      success: true,
      message: 'Available teachers retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve teachers',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/classes/streams/:streamId/download-class-list
 * @desc    Download class list for a stream as Excel file
 * @access  Private
 */
const downloadStreamClassList = async (req, res) => {
  try {
    const { streamId } = req.params;
    const { excelExport } = require('../utils/excelExport');

    // Get stream details
    const streamResult = await query(
      `SELECT s.*, c.class_name 
       FROM streams s
       JOIN classes c ON s.class_id = c.id
       WHERE s.id = $1`,
      [streamId]
    );

    if (streamResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found',
      });
    }

    const stream = streamResult.rows[0];

    // Get learners enrolled in this stream
    const learnersResult = await query(
      `SELECT DISTINCT
        l.id,
        l.admission_number,
        l.first_name,
        l.last_name,
        l.gender,
        l.email
       FROM learners l
       JOIN learner_enrollments le ON l.id = le.learner_id
       WHERE le.stream_id = $1
       ORDER BY l.admission_number`,
      [streamId]
    );

    const learners = learnersResult.rows;

    // Generate Excel file
    const { exportClassList } = require('../utils/excelExport');
    const buffer = await exportClassList(learners, stream.class_name, stream.stream_name);

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ClassList_${stream.class_name}_${stream.stream_name}_${new Date().toISOString().split('T')[0]}.xlsx"`
    );

    res.send(buffer);
  } catch (error) {
    console.error('Error downloading class list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate class list',
      error: error.message,
    });
  }
};

module.exports = {
  getAllClasses,
  getClassById,
  createClass,
  createStream,
  updateStream,
  deleteStream,
  getAvailableTeachers,
  downloadStreamClassList,
};