// ============================================================================
// SUBJECT CONTROLLER
// CRUD operations for subjects
// ============================================================================

const { query, transaction } = require('../config/database');

/**
 * @route   GET /api/subjects
 * @desc    Get all subjects
 * @access  Private
 */
const getAllSubjects = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (search) {
      whereClause = 'WHERE s.subject_name ILIKE $1 OR s.subject_code ILIKE $1';
      params.push(`%${search}%`);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM subjects s ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data with statistics
    const dataQuery = `
      SELECT 
        s.*,
        (SELECT COUNT(DISTINCT teacher_id) 
         FROM subject_teachers st 
         WHERE st.subject_id = s.id) as teacher_count,
        (SELECT COUNT(*) 
         FROM competency_areas ca 
         WHERE ca.subject_id = s.id) as competency_count
      FROM subjects s
      ${whereClause}
      ORDER BY s.subject_name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await query(dataQuery, [...params, limit, offset]);

    res.status(200).json({
      success: true,
      message: 'Subjects retrieved successfully',
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subjects',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/subjects/:id
 * @desc    Get subject by ID
 * @access  Private
 */
const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        s.*,
        (SELECT COUNT(DISTINCT teacher_id) 
         FROM subject_teachers st 
         WHERE st.subject_id = s.id) as teacher_count,
        (SELECT COUNT(*) 
         FROM competency_areas ca 
         WHERE ca.subject_id = s.id) as competency_count
       FROM subjects s
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subject retrieved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subject',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/subjects/:id/teachers
 * @desc    Get teachers assigned to a subject
 * @access  Private
 */
const getSubjectTeachers = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subject exists
    const subjectCheck = await query('SELECT * FROM subjects WHERE id = $1', [id]);
    
    if (subjectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    const result = await query(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        st.assigned_at,
        st.assigned_by
       FROM subject_teachers st
       JOIN users u ON st.teacher_id = u.id
       WHERE st.subject_id = $1
       ORDER BY u.first_name, u.last_name`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Subject teachers retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching subject teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subject teachers',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/subjects/:id/competencies
 * @desc    Get competency areas for a subject
 * @access  Private
 */
const getSubjectCompetencies = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subject exists
    const subjectCheck = await query('SELECT * FROM subjects WHERE id = $1', [id]);
    
    if (subjectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    const result = await query(
      `SELECT 
        ca.*,
        (SELECT COUNT(*) 
         FROM learning_outcomes lo 
         WHERE lo.competency_area_id = ca.id) as learning_outcome_count
       FROM competency_areas ca
       WHERE ca.subject_id = $1
       ORDER BY ca.competency_name`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Subject competencies retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching subject competencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subject competencies',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/subjects
 * @desc    Create new subject
 * @access  Private (Admin)
 */
const createSubject = async (req, res) => {
  try {
    const { subject_code, subject_name, description, is_compulsory, applicable_levels, is_subsidiary } = req.body;

    // Validation
    if (!subject_code || !subject_name) {
      return res.status(400).json({
        success: false,
        message: 'Subject code and name are required',
      });
    }

    // Check if subject code already exists
    const existing = await query(
      'SELECT id FROM subjects WHERE subject_code = $1',
      [subject_code]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Subject code already exists',
      });
    }

    // Default applicable_levels if not provided
    const levels = applicable_levels || ['S1','S2','S3','S4','S5','S6'];

    // Get the logged-in user's ID
    const createdBy = req.user.id;

    // Create subject
    const result = await query(
      `INSERT INTO subjects (subject_code, subject_name, description, is_compulsory, applicable_levels, is_subsidiary, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [subject_code, subject_name, description, is_compulsory || false, levels, is_subsidiary || false, createdBy]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_data, ip_address)
       VALUES ($1, 'CREATE', 'subjects', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subject',
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/subjects/:id
 * @desc    Update subject
 * @access  Private (Admin)
 */
const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_code, subject_name, description, is_compulsory, applicable_levels, is_subsidiary } = req.body;

    // Check if exists
    const existing = await query('SELECT * FROM subjects WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    // Check if new subject code conflicts with another subject
    if (subject_code && subject_code !== existing.rows[0].subject_code) {
      const codeCheck = await query(
        'SELECT id FROM subjects WHERE subject_code = $1 AND id != $2',
        [subject_code, id]
      );

      if (codeCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Subject code already exists',
        });
      }
    }

    // Update
    const result = await query(
      `UPDATE subjects 
       SET subject_code = COALESCE($1, subject_code),
           subject_name = COALESCE($2, subject_name),
           description = COALESCE($3, description),
           is_compulsory = COALESCE($4, is_compulsory),
           applicable_levels = COALESCE($5, applicable_levels),
           is_subsidiary = COALESCE($6, is_subsidiary),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [subject_code, subject_name, description, is_compulsory, applicable_levels, is_subsidiary, id]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES ($1, 'UPDATE', 'subjects', $2, $3, $4, $5)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Subject updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subject',
      error: error.message,
    });
  }
};

/**
 * @route   DELETE /api/subjects/:id
 * @desc    Delete subject
 * @access  Private (Admin)
 */
const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if exists
    const existing = await query('SELECT * FROM subjects WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    // Check if has assigned teachers
    const teacherCheck = await query(
      'SELECT COUNT(*) FROM subject_teachers WHERE subject_id = $1',
      [id]
    );

    if (parseInt(teacherCheck.rows[0].count) > 0) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete subject with assigned teachers',
      });
    }

    // Check if has competency areas
    const competencyCheck = await query(
      'SELECT COUNT(*) FROM competency_areas WHERE subject_id = $1',
      [id]
    );

    if (parseInt(competencyCheck.rows[0].count) > 0) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete subject with existing competencies',
      });
    }

    // Delete
    await query('DELETE FROM subjects WHERE id = $1', [id]);

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, ip_address)
       VALUES ($1, 'DELETE', 'subjects', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subject',
      error: error.message,
    });
  }
};

// added more code for subject papers

/**
 * @route   GET /api/subjects/:id/papers
 * @desc    Get papers for a subject
 * @access  Private
 */
const getSubjectPapers = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subject exists
    const subjectCheck = await query('SELECT * FROM subjects WHERE id = $1', [id]);
    
    if (subjectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    const result = await query(
      `SELECT * FROM subject_papers 
       WHERE subject_id = $1 
       ORDER BY paper_number ASC`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Subject papers retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching subject papers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subject papers',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/subjects/:id/papers
 * @desc    Add paper to a subject
 * @access  Private (Admin)
 */
const addSubjectPaper = async (req, res) => {
  try {
    const { id } = req.params;
    const { paper_number, paper_name } = req.body;

    // Validation
    if (!paper_number) {
      return res.status(400).json({
        success: false,
        message: 'Paper number is required',
      });
    }

    // Check if subject exists
    const subjectCheck = await query('SELECT * FROM subjects WHERE id = $1', [id]);
    
    if (subjectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    // Check if paper already exists
    const existing = await query(
      'SELECT id FROM subject_papers WHERE subject_id = $1 AND paper_number = $2',
      [id, paper_number]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Paper number already exists for this subject',
      });
    }

    // Create paper
    const result = await query(
      `INSERT INTO subject_papers (subject_id, paper_number, paper_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, paper_number, paper_name]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_data, ip_address)
       VALUES ($1, 'CREATE', 'subject_papers', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Subject paper added successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error adding subject paper:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add subject paper',
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/subjects/papers/:paperId
 * @desc    Update subject paper
 * @access  Private (Admin)
 */
const updateSubjectPaper = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { paper_number, paper_name } = req.body;

    // Check if paper exists
    const existing = await query('SELECT * FROM subject_papers WHERE id = $1', [paperId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject paper not found',
      });
    }

    // Check for duplicate paper number (if changing)
    if (paper_number && paper_number !== existing.rows[0].paper_number) {
      const duplicate = await query(
        'SELECT id FROM subject_papers WHERE subject_id = $1 AND paper_number = $2 AND id != $3',
        [existing.rows[0].subject_id, paper_number, paperId]
      );

      if (duplicate.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Paper number already exists for this subject',
        });
      }
    }

    // Update paper
    const result = await query(
      `UPDATE subject_papers 
       SET paper_number = COALESCE($1, paper_number),
           paper_name = COALESCE($2, paper_name),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [paper_number, paper_name, paperId]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES ($1, 'UPDATE', 'subject_papers', $2, $3, $4, $5)`,
      [req.user.id, paperId, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Subject paper updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating subject paper:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subject paper',
      error: error.message,
    });
  }
};

/**
 * @route   DELETE /api/subjects/papers/:paperId
 * @desc    Delete subject paper
 * @access  Private (Admin)
 */
const deleteSubjectPaper = async (req, res) => {
  try {
    const { paperId } = req.params;

    // Check if exists
    const existing = await query('SELECT * FROM subject_papers WHERE id = $1', [paperId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject paper not found',
      });
    }

    // Delete
    await query('DELETE FROM subject_papers WHERE id = $1', [paperId]);

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, ip_address)
       VALUES ($1, 'DELETE', 'subject_papers', $2, $3, $4)`,
      [req.user.id, paperId, JSON.stringify(existing.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Subject paper deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting subject paper:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subject paper',
      error: error.message,
    });
  }
};

//additional endpoints for subjects being compulsory or subsidiary or optional can be added here
/**
 * @route   GET /api/subjects/compulsory/:level
 * @desc    Get compulsory subjects for a level
 * @access  Private
 */
const getCompulsorySubjects = async (req, res) => {
  try {
    const { level } = req.params;

    const result = await query(
      `SELECT * FROM subjects 
       WHERE is_compulsory = TRUE 
       AND $1 = ANY(applicable_levels)
       ORDER BY subject_name`,
      [level]
    );

    res.status(200).json({
      success: true,
      message: 'Compulsory subjects retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching compulsory subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compulsory subjects',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/subjects/optional/:level
 * @desc    Get optional subjects for a level
 * @access  Private
 */
const getOptionalSubjects = async (req, res) => {
  try {
    const { level } = req.params;

    const result = await query(
      `SELECT * FROM subjects 
       WHERE is_compulsory = FALSE 
       AND is_subsidiary = FALSE
       AND $1 = ANY(applicable_levels)
       ORDER BY subject_name`,
      [level]
    );

    res.status(200).json({
      success: true,
      message: 'Optional subjects retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching optional subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve optional subjects',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/subjects/subsidiaries
 * @desc    Get subsidiary subjects (for S5/S6)
 * @access  Private
 */
const getSubsidiarySubjects = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM subjects 
       WHERE is_subsidiary = TRUE
       ORDER BY subject_name`
    );

    res.status(200).json({
      success: true,
      message: 'Subsidiary subjects retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching subsidiary subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subsidiary subjects',
      error: error.message,
    });
  }
};
module.exports = {
  getAllSubjects,
  getSubjectById,
  getSubjectTeachers,
  getSubjectCompetencies,
  getCompulsorySubjects,
  getOptionalSubjects,
  getSubsidiarySubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectPapers,
  addSubjectPaper,
  updateSubjectPaper,
  deleteSubjectPaper,
};