// ============================================================================
// SUBJECT COMBINATION CONTROLLER
// Manage subject combinations for S5/S6
// ============================================================================

const { query, transaction } = require('../config/database');

/**
 * @route   GET /api/subject-combinations
 * @desc    Get all subject combinations
 * @access  Private
 */
const getAllCombinations = async (req, res) => {
  try {
    const { is_active } = req.query;

    let whereClause = '';
    const params = [];

    if (is_active !== undefined) {
      whereClause = 'WHERE is_active = $1';
      params.push(is_active === 'true');
    }

    const result = await query(
      `SELECT 
        sc.*,
        (SELECT COUNT(*) FROM combination_subjects WHERE combination_id = sc.id) as subject_count
       FROM subject_combinations sc
       ${whereClause}
       ORDER BY sc.combination_name`,
      params
    );

    // Get subjects for each combination
    for (let combination of result.rows) {
      const subjects = await query(
        `SELECT 
          cs.id as cs_id,
          cs.is_compulsory,
          s.id,
          s.subject_code,
          s.subject_name,
          s.description
         FROM combination_subjects cs
         JOIN subjects s ON cs.subject_id = s.id
         WHERE cs.combination_id = $1
         ORDER BY s.subject_name`,
        [combination.id]
      );
      combination.subjects = subjects.rows;
    }

    res.status(200).json({
      success: true,
      message: 'Subject combinations retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching combinations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve combinations',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/subject-combinations/:id
 * @desc    Get combination by ID
 * @access  Private
 */
const getCombinationById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        sc.*,
        (SELECT COUNT(*) FROM combination_subjects WHERE combination_id = sc.id) as subject_count
       FROM subject_combinations sc
       WHERE sc.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Combination not found',
      });
    }

    const combination = result.rows[0];

    // Get subjects
    const subjects = await query(
      `SELECT 
        cs.id as cs_id,
        cs.is_compulsory,
        s.id,
        s.subject_code,
        s.subject_name,
        s.description
       FROM combination_subjects cs
       JOIN subjects s ON cs.subject_id = s.id
       WHERE cs.combination_id = $1
       ORDER BY s.subject_name`,
      [id]
    );

    combination.subjects = subjects.rows;

    res.status(200).json({
      success: true,
      message: 'Combination retrieved successfully',
      data: combination,
    });
  } catch (error) {
    console.error('Error fetching combination:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve combination',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/subject-combinations
 * @desc    Create new combination
 * @access  Private (Admin)
 */
const createCombination = async (req, res) => {
  try {
    const { combination_name, combination_code, description, subject_ids } = req.body;

    // Validation
    if (!combination_name || !combination_code) {
      return res.status(400).json({
        success: false,
        message: 'Combination name and code are required',
      });
    }

    if (!subject_ids || subject_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one subject must be selected',
      });
    }

    // Expect exactly 5 subjects (3 principals + 1 subsidiary + GP)
    if (subject_ids.length !== 5) {
      return res.status(400).json({
        success: false,
        message: 'Combination must have exactly 5 subjects (3 principals + 1 subsidiary + GP)',
      });
    }

    // Check if combination code already exists
    const existing = await query(
      'SELECT id FROM subject_combinations WHERE combination_code = $1',
      [combination_code]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Combination code already exists',
      });
    }

    // Verify all subjects exist
    for (const subjectId of subject_ids) {
      const subjectCheck = await query(
        'SELECT id FROM subjects WHERE id = $1',
        [subjectId]
      );
      
      if (subjectCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Subject with ID ${subjectId} not found`,
        });
      }
    }

    // Use transaction to create combination and add subjects
    const result = await transaction(async (client) => {
      // Create combination
      const combResult = await client.query(
        `INSERT INTO subject_combinations (combination_name, combination_code, description, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [combination_name, combination_code, description, req.user.id]
      );

      const combinationId = combResult.rows[0].id;

      // Add subjects to combination
      for (const subjectId of subject_ids) {
        await client.query(
          `INSERT INTO combination_subjects (combination_id, subject_id, is_compulsory)
           VALUES ($1, $2, $3)`,
          [combinationId, subjectId, true]
        );
      }

      return combResult.rows[0];
    });

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_data, ip_address)
       VALUES ($1, 'CREATE', 'subject_combinations', $2, $3, $4)`,
      [req.user.id, result.id, JSON.stringify(result), req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Combination created successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error creating combination:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create combination',
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/subject-combinations/:id
 * @desc    Update combination
 * @access  Private (Admin)
 */
const updateCombination = async (req, res) => {
  try {
    const { id } = req.params;
    const { combination_name, combination_code, description, subject_ids } = req.body;

    // Check if exists
    const existing = await query(
      'SELECT * FROM subject_combinations WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Combination not found',
      });
    }

    // Check if new code conflicts
    if (combination_code && combination_code !== existing.rows[0].combination_code) {
      const codeCheck = await query(
        'SELECT id FROM subject_combinations WHERE combination_code = $1 AND id != $2',
        [combination_code, id]
      );

      if (codeCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Combination code already exists',
        });
      }
    }

    // Validate subject_ids if provided
    if (subject_ids) {
      if (subject_ids.length !== 5) {
        return res.status(400).json({
          success: false,
          message: 'Combination must have exactly 5 subjects (3 principals + 1 subsidiary + GP)',
        });
      }

      // Verify all subjects exist
      for (const subjectId of subject_ids) {
        const subjectCheck = await query(
          'SELECT id FROM subjects WHERE id = $1',
          [subjectId]
        );
        
        if (subjectCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: `Subject with ID ${subjectId} not found`,
          });
        }
      }
    }

    // Use transaction
    const result = await transaction(async (client) => {
      // Update combination
      const combResult = await client.query(
        `UPDATE subject_combinations 
         SET combination_name = COALESCE($1, combination_name),
             combination_code = COALESCE($2, combination_code),
             description = COALESCE($3, description),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [combination_name, combination_code, description, id]
      );

      // Update subjects if provided
      if (subject_ids && subject_ids.length > 0) {
        // Remove old subjects
        await client.query(
          'DELETE FROM combination_subjects WHERE combination_id = $1',
          [id]
        );

        // Add new subjects
        for (const subjectId of subject_ids) {
          await client.query(
            `INSERT INTO combination_subjects (combination_id, subject_id, is_compulsory)
             VALUES ($1, $2, $3)`,
            [id, subjectId, true]
          );
        }
      }

      return combResult.rows[0];
    });

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES ($1, 'UPDATE', 'subject_combinations', $2, $3, $4, $5)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), JSON.stringify(result), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Combination updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error updating combination:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update combination',
      error: error.message,
    });
  }
};

/**
 * @route   PATCH /api/subject-combinations/:id/toggle-active
 * @desc    Activate/deactivate combination
 * @access  Private (Admin)
 */
const toggleCombinationActive = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT * FROM subject_combinations WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Combination not found',
      });
    }

    const result = await query(
      `UPDATE subject_combinations 
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, ip_address)
       VALUES ($1, 'TOGGLE_ACTIVE', 'subject_combinations', $2, $3)`,
      [req.user.id, id, req.ip]
    );

    res.status(200).json({
      success: true,
      message: `Combination ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error toggling combination:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle combination',
      error: error.message,
    });
  }
};

/**
 * @route   DELETE /api/subject-combinations/:id
 * @desc    Delete combination
 * @access  Private (Admin)
 */
const deleteCombination = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT * FROM subject_combinations WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Combination not found',
      });
    }

    // Check if any students are using this combination
    const usageCheck = await query(
      'SELECT COUNT(*) FROM learner_subjects WHERE combination_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete combination that is assigned to students',
      });
    }

    // Delete (subjects will cascade)
    await query('DELETE FROM subject_combinations WHERE id = $1', [id]);

    // Log action
    await query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, ip_address)
       VALUES ($1, 'DELETE', 'subject_combinations', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify(existing.rows[0]), req.ip]
    );

    res.status(200).json({
      success: true,
      message: 'Combination deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting combination:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete combination',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/subject-combinations/:id/available-subjects
 * @desc    Get subjects available for S5/S6 (not subsidiaries)
 * @access  Private
 */
const getAvailableSubjectsForCombination = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM subjects 
       WHERE is_subsidiary = FALSE
       AND ('S5' = ANY(applicable_levels) OR 'S6' = ANY(applicable_levels))
       ORDER BY subject_name`
    );

    res.status(200).json({
      success: true,
      message: 'Available subjects retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching available subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available subjects',
      error: error.message,
    });
  }
};

module.exports = {
  getAllCombinations,
  getCombinationById,
  createCombination,
  updateCombination,
  toggleCombinationActive,
  deleteCombination,
  getAvailableSubjectsForCombination,
};