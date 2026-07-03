// ============================================================================
// LEARNER CONTROLLER (Updated to match actual schema)
// Manage learner admissions, enrollments, and subject assignments
// ============================================================================

const { query, transaction } = require('../config/database');

/**
 * @route   GET /api/learners
 * @desc    Get all learners
 * @access  Private
 */
const getAllLearners = async (req, res) => {
  try {
    const { status, stream_id, academic_year_id, subject_id, page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause = `WHERE l.status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      const searchClause = `(l.first_name ILIKE $${paramCount} OR l.last_name ILIKE $${paramCount} OR l.admission_number ILIKE $${paramCount})`;
      whereClause = whereClause ? `${whereClause} AND ${searchClause}` : `WHERE ${searchClause}`;
      params.push(`%${search}%`);
    }

    if (stream_id) {
      paramCount++;
      const streamClause = `le.stream_id = $${paramCount}`;
      whereClause = whereClause ? `${whereClause} AND ${streamClause}` : `WHERE ${streamClause}`;
      params.push(stream_id);
    }

    if (academic_year_id) {
      paramCount++;
      const yearClause = `le.academic_year_id = $${paramCount}`;
      whereClause = whereClause ? `${whereClause} AND ${yearClause}` : `WHERE ${yearClause}`;
      params.push(academic_year_id);
    }

    if (subject_id) {
      paramCount++;
      const subjectClause = `ls.subject_id = $${paramCount}`;
      whereClause = whereClause ? `${whereClause} AND ${subjectClause}` : `WHERE ${subjectClause}`;
      params.push(subject_id);
    }

    const subjectJoin = subject_id
      ? `JOIN learner_subjects ls
           ON ls.learner_id = l.id
          AND ls.academic_year_id = le.academic_year_id`
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT l.id)
      FROM learners l
      LEFT JOIN learner_enrollments le ON l.id = le.learner_id AND le.status = 'active'
      ${subjectJoin}
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get learners with current enrollment info
    const dataQuery = `
      SELECT 
        l.*,
        le.stream_id,
        le.class_id,
        le.academic_year_id,
        s.stream_name,
        c.class_name,
        ay.year_name as academic_year
      FROM learners l
      LEFT JOIN learner_enrollments le ON l.id = le.learner_id AND le.status = 'active'
      LEFT JOIN streams s ON le.stream_id = s.id
      LEFT JOIN classes c ON le.class_id = c.id
      LEFT JOIN academic_years ay ON le.academic_year_id = ay.id
      ${subjectJoin}
      ${whereClause}
      ORDER BY l.last_name, l.first_name
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const result = await query(dataQuery, [...params, limit, offset]);

    res.status(200).json({
      success: true,
      message: 'Learners retrieved successfully',
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching learners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve learners',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/learners/:id
 * @desc    Get learner by ID
 * @access  Private
 */
const getLearnerById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get learner info
    const learnerResult = await query(
      'SELECT * FROM learners WHERE id = $1',
      [id]
    );

    if (learnerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found',
      });
    }

    const learner = learnerResult.rows[0];

    // Get current enrollment
    const enrollmentResult = await query(
      `SELECT 
        le.*,
        s.stream_name,
        c.class_name,
        ay.year_name as academic_year
       FROM learner_enrollments le
       JOIN streams s ON le.stream_id = s.id
       JOIN classes c ON le.class_id = c.id
       JOIN academic_years ay ON le.academic_year_id = ay.id
       WHERE le.learner_id = $1 AND le.status = 'active'
       ORDER BY le.enrollment_date DESC
       LIMIT 1`,
      [id]
    );

    learner.current_enrollment = enrollmentResult.rows[0] || null;

    // Get assigned subjects for current year
    if (learner.current_enrollment) {
      const subjectsResult = await query(
        `SELECT 
          ls.*,
          s.subject_code,
          s.subject_name,
          s.is_subsidiary,
          sc.combination_name,
          sc.combination_code
         FROM learner_subjects ls
         JOIN subjects s ON ls.subject_id = s.id
         LEFT JOIN subject_combinations sc ON ls.combination_id = sc.id
         WHERE ls.learner_id = $1 AND ls.academic_year_id = $2
         ORDER BY s.is_subsidiary, s.subject_name`,
        [id, learner.current_enrollment.academic_year_id]
      );

      learner.subjects = subjectsResult.rows;
    } else {
      learner.subjects = [];
    }

    res.status(200).json({
      success: true,
      message: 'Learner retrieved successfully',
      data: learner,
    });
  } catch (error) {
    console.error('Error fetching learner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve learner',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/learners
 * @desc    Admit new learner (create profile only)
 * @access  Private (Admin)
 */
const admitLearner = async (req, res) => {
  try {
    const {
      admission_number,
      first_name,
      middle_name,
      last_name,
      date_of_birth,
      gender,
      entry_year_id,
      entry_class,
      former_school,
      nationality,
      phone_number,
      email,
      address,
      guardian_name,
      guardian_phone,
      guardian_email,
      guardian_relationship,
      medical_conditions,
      allergies,
      blood_group,
    } = req.body;

    // Validation
    if (!admission_number || !first_name || !last_name || !date_of_birth || !gender) {
      return res.status(400).json({
        success: false,
        message: 'Admission number, first name, last name, date of birth, and gender are required',
      });
    }

    // Check if admission number already exists
    const existing = await query(
      'SELECT id FROM learners WHERE admission_number = $1',
      [admission_number]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Admission number already exists',
      });
    }

    // Create learner
    const result = await query(
      `INSERT INTO learners (
        admission_number, first_name, middle_name, last_name, 
        date_of_birth, gender, entry_year_id, entry_class, former_school,
        nationality, phone_number, email, address,
        guardian_name, guardian_phone, guardian_email, guardian_relationship,
        medical_conditions, allergies, blood_group,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        admission_number, first_name, middle_name, last_name,
        date_of_birth, gender, entry_year_id, entry_class, former_school,
        nationality, phone_number, email, address,
        guardian_name, guardian_phone, guardian_email, guardian_relationship,
        medical_conditions, allergies, blood_group,
        req.user.id
      ]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_data, ip_address)
       VALUES ($1, 'CREATE', 'learners', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Learner admitted successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error admitting learner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to admit learner',
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/learners/:id
 * @desc    Update learner
 * @access  Private (Admin)
 */
const updateLearner = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if exists
    const existing = await query('SELECT * FROM learners WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found',
      });
    }

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 0;

    const allowedFields = [
      'first_name', 'middle_name', 'last_name', 'date_of_birth', 'gender',
      'nationality', 'phone_number', 'email', 'address',
      'guardian_name', 'guardian_phone', 'guardian_email', 'guardian_relationship',
      'medical_conditions', 'allergies', 'blood_group', 'status', 'photo_url', 'notes'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(updateData[field]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    paramCount++;
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE learners SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES ($1, 'UPDATE', 'learners', $2, $3, $4, $5)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Learner updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating learner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update learner',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/learners/:id/enroll
 * @desc    Enroll learner in a stream with subject assignment
 * @access  Private (Admin)
 */
const enrollLearner = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      class_id,
      stream_id,
      academic_year_id,
      optional_subjects, // For S1-S4: array of 2 subject IDs
      combination_id,    // For S5-S6: combination ID
      subsidiary_id,     // Legacy field; S5-S6 subsidiaries are defined by the combination
    } = req.body;

    // Validation
    if (!class_id || !stream_id || !academic_year_id) {
      return res.status(400).json({
        success: false,
        message: 'Class, stream, and academic year are required',
      });
    }

    // Check if learner exists
    const learnerCheck = await query('SELECT * FROM learners WHERE id = $1', [id]);
    if (learnerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found',
      });
    }

    // Get class info
    const classCheck = await query('SELECT * FROM classes WHERE id = $1', [class_id]);
    if (classCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    const classLevel = classCheck.rows[0].class_name; // e.g., 'S1', 'S5'

    // Check if stream exists
    const streamCheck = await query('SELECT * FROM streams WHERE id = $1', [stream_id]);
    if (streamCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found',
      });
    }

    // Check if already enrolled
    const enrollmentCheck = await query(
      'SELECT id FROM learner_enrollments WHERE learner_id = $1 AND class_id = $2 AND stream_id = $3 AND academic_year_id = $4',
      [id, class_id, stream_id, academic_year_id]
    );

    if (enrollmentCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Learner already enrolled in this stream for this academic year',
      });
    }

    // Use transaction for enrollment + subject assignment
    const result = await transaction(async (client) => {
      // 1. Create enrollment
      const enrollmentResult = await client.query(
        `INSERT INTO learner_enrollments (learner_id, class_id, stream_id, academic_year_id, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, class_id, stream_id, academic_year_id, req.user.id]
      );

      const enrollment = enrollmentResult.rows[0];

      // 2. Assign subjects based on level
      if (classLevel.match(/S[1-4]/)) {
        // S1-S4: Assign 7 compulsory + 2 optional
        await assignSubjectsS1ToS4(client, id, academic_year_id, classLevel, optional_subjects, req.user.id);
      } else if (classLevel.match(/S[5-6]/)) {
        // S5-S6: Assign 3 principals + 2 subsidiaries from the combination
        await assignSubjectsS5ToS6(client, id, academic_year_id, combination_id, req.user.id);
      }

      return enrollment;
    });

    res.status(201).json({
      success: true,
      message: 'Learner enrolled and subjects assigned successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error enrolling learner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll learner',
      error: error.message,
    });
  }
};

// Helper function: Assign subjects for S1-S4
async function assignSubjectsS1ToS4(client, learnerId, academicYearId, classLevel, optionalSubjects, userId) {
  const compulsoryResult = await client.query(
    `SELECT id FROM subjects
     WHERE is_compulsory = TRUE
     AND is_subsidiary = FALSE
     AND $1 = ANY(applicable_levels)`,
    [classLevel]
  );

  const compulsorySubjects = compulsoryResult.rows;
  if (compulsorySubjects.length !== 7) {
    throw new Error(`${classLevel} must have exactly 7 compulsory subjects so learners take 9 subjects in total`);
  }

  if (!Array.isArray(optionalSubjects) || optionalSubjects.length !== 2 || new Set(optionalSubjects).size !== 2) {
    throw new Error('Exactly 2 different optional subjects must be selected for S1-S4');
  }

  for (const subject of compulsorySubjects) {
    await client.query(
      `INSERT INTO learner_subjects (learner_id, subject_id, academic_year_id, is_compulsory, assigned_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (learner_id, subject_id, academic_year_id) DO NOTHING`,
      [learnerId, subject.id, academicYearId, true, userId]
    );
  }

  for (const subjectId of optionalSubjects) {
    const subjectCheck = await client.query(
      `SELECT id FROM subjects
       WHERE id = $1
       AND is_compulsory = FALSE
       AND is_subsidiary = FALSE
       AND $2 = ANY(applicable_levels)`,
      [subjectId, classLevel]
    );

    if (subjectCheck.rows.length === 0) {
      throw new Error('Invalid optional subject selected');
    }

    await client.query(
      `INSERT INTO learner_subjects (learner_id, subject_id, academic_year_id, is_compulsory, assigned_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (learner_id, subject_id, academic_year_id) DO NOTHING`,
      [learnerId, subjectId, academicYearId, false, userId]
    );
  }
}

// Helper function: Assign subjects for S5-S6
async function assignSubjectsS5ToS6(client, learnerId, academicYearId, combinationId, userId) {
  if (!combinationId) {
    throw new Error('Combination is required for S5-S6');
  }

  const combinationResult = await client.query(
    `SELECT s.id AS subject_id, s.subject_code, s.subject_name, s.is_subsidiary
     FROM combination_subjects cs
     JOIN subjects s ON cs.subject_id = s.id
     WHERE cs.combination_id = $1`,
    [combinationId]
  );

  const subjects = combinationResult.rows;
  const principalCount = subjects.filter(s => !s.is_subsidiary).length;
  const subsidiaryCount = subjects.filter(s => s.is_subsidiary).length;
  const hasGeneralPaper = subjects.some(s => String(s.subject_code).toUpperCase() === 'GP');

  if (subjects.length !== 5 || principalCount !== 3 || subsidiaryCount !== 2 || !hasGeneralPaper) {
    throw new Error('S5-S6 combinations must contain exactly 3 principal subjects and 2 subsidiary subjects, including General Paper');
  }

  for (const subject of subjects) {
    await client.query(
      `INSERT INTO learner_subjects (learner_id, subject_id, academic_year_id, combination_id, is_compulsory, assigned_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (learner_id, subject_id, academic_year_id) DO NOTHING`,
      [learnerId, subject.subject_id, academicYearId, combinationId, true, userId]
    );
  }
}

/**
 * @route   DELETE /api/learners/:id
 * @desc    Delete learner
 * @access  Private (Admin)
 */
const deleteLearner = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT * FROM learners WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found',
      });
    }

    // Delete (enrollments and subjects will cascade)
    await query('DELETE FROM learners WHERE id = $1', [id]);

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, ip_address)
       VALUES ($1, 'DELETE', 'learners', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Learner deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting learner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete learner',
      error: error.message,
    });
  }
};

module.exports = {
  getAllLearners,
  getLearnerById,
  admitLearner,
  updateLearner,
  enrollLearner,
  deleteLearner,
};
