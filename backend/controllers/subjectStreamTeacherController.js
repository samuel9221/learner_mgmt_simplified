// ============================================================================
// SUBJECT-STREAM-TEACHER CONTROLLER
// Manage teacher assignments to subjects in streams
// ============================================================================

const { query, transaction } = require('../config/database');

const TEACHER_SUBJECT_LIMIT = 3;
const TEACHER_STREAM_SUBJECT_LIMIT = 2;

const validateTeacherAssignmentLoad = async (teacherId, subjectId, streamId, excludeAssignmentId = null) => {
  const subjectParams = excludeAssignmentId
    ? [teacherId, subjectId, excludeAssignmentId]
    : [teacherId, subjectId];
  const subjectExcludeClause = excludeAssignmentId ? 'AND id != $3' : '';

  const subjectLoad = await query(
    `SELECT
       COUNT(DISTINCT subject_id) AS subject_count,
       BOOL_OR(subject_id = $2) AS already_teaches_subject
     FROM subject_stream_teachers
     WHERE teacher_id = $1 ${subjectExcludeClause}`,
    subjectParams
  );

  const subjectCount = parseInt(subjectLoad.rows[0].subject_count, 10) || 0;
  const alreadyTeachesSubject = subjectLoad.rows[0].already_teaches_subject === true;

  if (!alreadyTeachesSubject && subjectCount >= TEACHER_SUBJECT_LIMIT) {
    return {
      valid: false,
      status: 403,
      message: `Teacher has already been assigned the maximum of ${TEACHER_SUBJECT_LIMIT} different subjects. They can only be added to more streams for those same subjects.`,
    };
  }

  const streamParams = excludeAssignmentId
    ? [teacherId, subjectId, streamId, excludeAssignmentId]
    : [teacherId, subjectId, streamId];
  const streamExcludeClause = excludeAssignmentId ? 'AND id != $4' : '';

  const streamLoad = await query(
    `SELECT
       COUNT(DISTINCT subject_id) AS stream_subject_count,
       BOOL_OR(subject_id = $2) AS already_teaches_subject_in_stream
     FROM subject_stream_teachers
     WHERE teacher_id = $1
       AND stream_id = $3
       ${streamExcludeClause}`,
    streamParams
  );

  const streamSubjectCount = parseInt(streamLoad.rows[0].stream_subject_count, 10) || 0;
  const alreadyTeachesSubjectInStream = streamLoad.rows[0].already_teaches_subject_in_stream === true;

  if (!alreadyTeachesSubjectInStream && streamSubjectCount >= TEACHER_STREAM_SUBJECT_LIMIT) {
    return {
      valid: false,
      status: 403,
      message: `Teacher cannot teach more than ${TEACHER_STREAM_SUBJECT_LIMIT} subjects in the same stream.`,
    };
  }

  return { valid: true };
};

/**
 * @route   GET /api/subject-stream-teachers
 * @desc    Get all subject-stream-teacher assignments
 * @access  Private
 */
const getAllAssignments = async (req, res) => {
  try {
    const { stream_id, subject_id, teacher_id } = req.query;

    let whereClause = '';
    const params = [];

    if (stream_id) {
      whereClause = 'WHERE stream_id = $1';
      params.push(stream_id);
    } else if (subject_id) {
      whereClause = 'WHERE subject_id = $1';
      params.push(subject_id);
    } else if (teacher_id) {
      whereClause = 'WHERE teacher_id = $1';
      params.push(teacher_id);
    }

    const result = await query(
      `SELECT * FROM v_subject_stream_teacher_assignments ${whereClause}`,
      params
    );

    res.status(200).json({
      success: true,
      message: 'Assignments retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assignments',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/subject-stream-teachers/stream/:streamId
 * @desc    Get all subject assignments for a specific stream
 * @access  Private
 */
const getStreamAssignments = async (req, res) => {
  try {
    const { streamId } = req.params;

    const result = await query(
      `SELECT * FROM v_subject_stream_teacher_assignments 
       WHERE stream_id = $1
       ORDER BY subject_name`,
      [streamId]
    );

    res.status(200).json({
      success: true,
      message: 'Stream assignments retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching stream assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stream assignments',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/subject-stream-teachers/teacher/:teacherId
 * @desc    Get all assignments for a specific teacher
 * @access  Private
 */
const getTeacherAssignments = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const result = await query(
      `SELECT * FROM v_subject_stream_teacher_assignments 
       WHERE teacher_id = $1
       ORDER BY class_name, stream_name, subject_name`,
      [teacherId]
    );

    // Get subject count
    const subjectCount = await query(
      `SELECT COUNT(DISTINCT subject_id) as subject_count
       FROM subject_stream_teachers
       WHERE teacher_id = $1`,
      [teacherId]
    );

    res.status(200).json({
      success: true,
      message: 'Teacher assignments retrieved successfully',
      data: {
        assignments: result.rows,
        subject_count: parseInt(subjectCount.rows[0].subject_count),
      },
    });
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve teacher assignments',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/subject-stream-teachers
 * @desc    Assign teacher to subject in stream
 * @access  Private (Admin)
 */
const assignTeacherToSubject = async (req, res) => {
  try {
    const { subject_id, stream_id, teacher_id } = req.body;

    // Validation
    if (!subject_id || !stream_id || !teacher_id) {
      return res.status(400).json({
        success: false,
        message: 'Subject, stream, and teacher are required',
      });
    }

    // Check if subject exists
    const subjectCheck = await query('SELECT * FROM subjects WHERE id = $1', [subject_id]);
    if (subjectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    // Check if stream exists
    const streamCheck = await query('SELECT * FROM streams WHERE id = $1', [stream_id]);
    if (streamCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found',
      });
    }

    // Check if teacher exists and is a teacher
    const teacherCheck = await query(
      "SELECT * FROM users WHERE id = $1 AND role = 'teacher' AND is_active = true",
      [teacher_id]
    );
    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or inactive',
      });
    }

    // Check if assignment already exists
    const existing = await query(
      'SELECT * FROM subject_stream_teachers WHERE subject_id = $1 AND stream_id = $2',
      [subject_id, stream_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This subject is already assigned to a teacher in this stream',
        current_teacher: existing.rows[0],
      });
    }
    const loadValidation = await validateTeacherAssignmentLoad(teacher_id, subject_id, stream_id);
    if (!loadValidation.valid) {
      return res.status(loadValidation.status).json({
        success: false,
        message: loadValidation.message,
      });
    }

    // Create assignment
    const result = await query(
      `INSERT INTO subject_stream_teachers (subject_id, stream_id, teacher_id, assigned_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [subject_id, stream_id, teacher_id, req.user.id]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_data, ip_address)
       VALUES ($1, 'CREATE', 'subject_stream_teachers', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
    );

    // Get full assignment details
    const assignment = await query(
      'SELECT * FROM v_subject_stream_teacher_assignments WHERE id = $1',
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      message: 'Teacher assigned to subject successfully',
      data: assignment.rows[0],
    });
  } catch (error) {
    console.error('Error assigning teacher:', error);
    
    // Handle trigger constraint error
    if (error.message.includes('cannot be assigned more than 3')) {
      return res.status(403).json({
        success: false,
        message: 'Teacher has already been assigned the maximum of 3 different subjects. They can only be added to more streams for those same subjects.',
      });
    }

    if (error.message.includes('cannot teach more than 2 subjects in the same stream')) {
      return res.status(403).json({
        success: false,
        message: 'Teacher cannot teach more than 2 subjects in the same stream',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to assign teacher to subject',
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/subject-stream-teachers/:id
 * @desc    Update assignment (change teacher)
 * @access  Private (Admin)
 */
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacher_id } = req.body;

    // Validation
    if (!teacher_id) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID is required',
      });
    }

    // Check if assignment exists
    const existing = await query(
      'SELECT * FROM subject_stream_teachers WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Check if teacher exists and is a teacher
    const teacherCheck = await query(
      "SELECT * FROM users WHERE id = $1 AND role = 'teacher' AND is_active = true",
      [teacher_id]
    );

    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or inactive',
      });
    }
    const loadValidation = await validateTeacherAssignmentLoad(
      teacher_id,
      existing.rows[0].subject_id,
      existing.rows[0].stream_id,
      id
    );

    if (!loadValidation.valid) {
      return res.status(loadValidation.status).json({
        success: false,
        message: loadValidation.message.replace('Teacher', 'New teacher'),
      });
    }

    // Update assignment
    const result = await query(
      `UPDATE subject_stream_teachers 
       SET teacher_id = $1
       WHERE id = $2
       RETURNING *`,
      [teacher_id, id]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES ($1, 'UPDATE', 'subject_stream_teachers', $2, $3, $4, $5)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0]), req.ip]
    );

    // Get full assignment details
    const assignment = await query(
      'SELECT * FROM v_subject_stream_teacher_assignments WHERE id = $1',
      [result.rows[0].id]
    );

    res.status(200).json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment.rows[0],
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    if (error.message.includes('cannot be assigned more than 3')) {
      return res.status(403).json({
        success: false,
        message: 'New teacher has already been assigned the maximum of 3 different subjects. They can only be added to more streams for those same subjects.',
      });
    }

    if (error.message.includes('cannot teach more than 2 subjects in the same stream')) {
      return res.status(403).json({
        success: false,
        message: 'New teacher cannot teach more than 2 subjects in the same stream',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update assignment',
      error: error.message,
    });
  }
};

/**
 * @route   DELETE /api/subject-stream-teachers/:id
 * @desc    Remove assignment
 * @access  Private (Admin)
 */
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if exists
    const existing = await query(
      'SELECT * FROM subject_stream_teachers WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Delete
    await query('DELETE FROM subject_stream_teachers WHERE id = $1', [id]);

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, ip_address)
       VALUES ($1, 'DELETE', 'subject_stream_teachers', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Assignment removed successfully',
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove assignment',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/subject-stream-teachers/available-teachers
 * @desc    Get teachers available for assignment (not at max subjects)
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
        COALESCE(
          (SELECT COUNT(DISTINCT subject_id) 
           FROM subject_stream_teachers 
           WHERE teacher_id = u.id), 
          0
        ) as subject_count,
        true as can_assign_more
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
    console.error('Error fetching available teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available teachers',
      error: error.message,
    });
  }
};

module.exports = {
  getAllAssignments,
  getStreamAssignments,
  getTeacherAssignments,
  assignTeacherToSubject,
  updateAssignment,
  deleteAssignment,
  getAvailableTeachers,
};