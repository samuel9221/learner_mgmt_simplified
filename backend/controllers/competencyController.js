// ============================================================================
// COMPETENCY CONTROLLER
// Manage competency areas and individual competencies
// ============================================================================

const { query, transaction } = require('../config/database');

/**
 * @route   GET /api/competencies/subject/:subjectId/areas
 * @desc    Get all competency areas for a subject
 * @access  Private
 */
const getSubjectCompetencyAreas = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const result = await query(
      `SELECT 
        ca.*,
        (SELECT COUNT(*) FROM competencies WHERE competency_area_id = ca.id) as competency_count
       FROM competency_areas ca
       WHERE ca.subject_id = $1
       ORDER BY ca.order_number, ca.competency_name`,
      [subjectId]
    );

    res.status(200).json({
      success: true,
      message: 'Competency areas retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching competency areas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve competency areas',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/competencies/area/:areaId
 * @desc    Get all competencies in an area
 * @access  Private
 */
const getAreaCompetencies = async (req, res) => {
  try {
    const { areaId } = req.params;

    const result = await query(
      `SELECT c.*
       FROM competencies c
       WHERE c.competency_area_id = $1
       ORDER BY c.order_number, c.competency_text`,
      [areaId]
    );

    res.status(200).json({
      success: true,
      message: 'Competencies retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching competencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve competencies',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/competencies/areas
 * @desc    Create competency area
 * @access  Private (Admin)
 */
const createCompetencyArea = async (req, res) => {
  try {
    const { subject_id, competency_name, description, order_number } = req.body;

    // Validation
    if (!subject_id || !competency_name) {
      return res.status(400).json({
        success: false,
        message: 'Subject and competency area name are required',
      });
    }

    // Check if subject exists
    const subjectCheck = await query('SELECT id FROM subjects WHERE id = $1', [subject_id]);
    if (subjectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    // Create competency area
    const result = await query(
      `INSERT INTO competency_areas (subject_id, competency_name, description, order_number)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [subject_id, competency_name, description, order_number || 0]
    );

    res.status(201).json({
      success: true,
      message: 'Competency area created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating competency area:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create competency area',
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/competencies/areas/:id
 * @desc    Update competency area
 * @access  Private (Admin)
 */
const updateCompetencyArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { competency_name, description, order_number } = req.body;

    const existing = await query('SELECT * FROM competency_areas WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Competency area not found',
      });
    }

    const result = await query(
      `UPDATE competency_areas 
       SET competency_name = COALESCE($1, competency_name),
           description = COALESCE($2, description),
           order_number = COALESCE($3, order_number),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [competency_name, description, order_number, id]
    );

    res.status(200).json({
      success: true,
      message: 'Competency area updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating competency area:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update competency area',
      error: error.message,
    });
  }
};

/**
 * @route   DELETE /api/competencies/areas/:id
 * @desc    Delete competency area
 * @access  Private (Admin)
 */
const deleteCompetencyArea = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT * FROM competency_areas WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Competency area not found',
      });
    }

    // Check if has competencies
    const competencyCheck = await query(
      'SELECT COUNT(*) FROM competencies WHERE competency_area_id = $1',
      [id]
    );

    if (parseInt(competencyCheck.rows[0].count) > 0) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete competency area with existing competencies',
      });
    }

    await query('DELETE FROM competency_areas WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Competency area deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting competency area:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete competency area',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/competencies
 * @desc    Create competency
 * @access  Private (Admin)
 */
const createCompetency = async (req, res) => {
  try {
    const {
      competency_area_id,
      subject_id,
      competency_code,
      competency_text,
      order_number,
    } = req.body;

    // Validation
    if (!competency_area_id || !subject_id || !competency_text) {
      return res.status(400).json({
        success: false,
        message: 'Competency area, subject, and competency text are required',
      });
    }

    // Create competency
    const result = await query(
      `INSERT INTO competencies (
        competency_area_id, subject_id, competency_code, 
        competency_text, order_number, created_by
      )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        competency_area_id,
        subject_id,
        competency_code,
        competency_text,
        order_number || 0,
        req.user.id,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Competency created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating competency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create competency',
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/competencies/:id
 * @desc    Update competency
 * @access  Private (Admin)
 */
const updateCompetency = async (req, res) => {
  try {
    const { id } = req.params;
    const { competency_code, competency_text, order_number } = req.body;

    const existing = await query('SELECT * FROM competencies WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Competency not found',
      });
    }

    const result = await query(
      `UPDATE competencies 
       SET competency_code = COALESCE($1, competency_code),
           competency_text = COALESCE($2, competency_text),
           order_number = COALESCE($3, order_number),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [competency_code, competency_text, order_number, id]
    );

    res.status(200).json({
      success: true,
      message: 'Competency updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating competency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update competency',
      error: error.message,
    });
  }
};

/**
 * @route   DELETE /api/competencies/:id
 * @desc    Delete competency
 * @access  Private (Admin)
 */
const deleteCompetency = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT * FROM competencies WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Competency not found',
      });
    }

    // Check if used in assessments
    const assessmentCheck = await query(
      'SELECT COUNT(*) FROM assessment_competencies WHERE competency_id = $1',
      [id]
    );

    if (parseInt(assessmentCheck.rows[0].count) > 0) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete competency that has been used in assessments',
      });
    }

    await query('DELETE FROM competencies WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Competency deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting competency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete competency',
      error: error.message,
    });
  }
};

module.exports = {
  getSubjectCompetencyAreas,
  getAreaCompetencies,
  createCompetencyArea,
  updateCompetencyArea,
  deleteCompetencyArea,
  createCompetency,
  updateCompetency,
  deleteCompetency,
};