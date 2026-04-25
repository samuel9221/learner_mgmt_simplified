const pool = require('../config/database');

// GET /api/grading-scales
const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM grading_scales ORDER BY min_score DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getAll grading scales:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/grading-scales/:id
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM grading_scales WHERE id = $1`,
      [id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Grading scale not found' });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('getById grading scale:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/grading-scales
const create = async (req, res) => {
  try {
    const { label, grade_name, min_score, max_score, remarks, color_code } = req.body;
    const created_by = req.user.id;

    // Validate no gaps or overlaps
    const overlap = await pool.query(
      `SELECT id FROM grading_scales
       WHERE is_active = TRUE
         AND NOT (max_score < $1 OR min_score > $2)`,
      [min_score, max_score]
    );
    if (overlap.rows.length > 0)
      return res.status(400).json({
        success: false,
        message: 'Score range overlaps with an existing grading scale'
      });

    const result = await pool.query(
      `INSERT INTO grading_scales
        (label, grade_name, min_score, max_score, remarks, color_code, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [label, grade_name, min_score, max_score, remarks, color_code, created_by]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('create grading scale:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/grading-scales/:id
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, grade_name, min_score, max_score, remarks, color_code, is_active } = req.body;

    // Validate no overlaps with OTHER scales
    const overlap = await pool.query(
      `SELECT id FROM grading_scales
       WHERE is_active = TRUE
         AND id != $1
         AND NOT (max_score < $2 OR min_score > $3)`,
      [id, min_score, max_score]
    );
    if (overlap.rows.length > 0)
      return res.status(400).json({
        success: false,
        message: 'Score range overlaps with an existing grading scale'
      });

    const result = await pool.query(
      `UPDATE grading_scales
       SET label = $1, grade_name = $2, min_score = $3, max_score = $4,
           remarks = $5, color_code = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [label, grade_name, min_score, max_score, remarks, color_code, is_active, id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Grading scale not found' });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('update grading scale:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/grading-scales/:id
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM grading_scales WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Grading scale not found' });

    res.json({ success: true, message: 'Grading scale deleted' });
  } catch (err) {
    console.error('remove grading scale:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/grading-scales/reset/defaults
const resetToDefaults = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Wipe existing scales
    await client.query('DELETE FROM grading_scales');

    // Re-insert defaults
    await client.query(
      `INSERT INTO grading_scales (label, grade_name, min_score, max_score, remarks, color_code, created_by)
       VALUES
        ('A', 'Excellent',      80,    100,   'Outstanding performance',       '#22c55e', $1),
        ('B', 'Good',           65,    79.99, 'Above average performance',     '#3b82f6', $1),
        ('C', 'Satisfactory',   50,    64.99, 'Average performance',           '#f59e0b', $1),
        ('D', 'Below Average',   0,    49.99, 'Needs significant improvement', '#ef4444', $1)`,
      [req.user.id]
    );

    await client.query('COMMIT');
    const result = await pool.query(`SELECT * FROM grading_scales ORDER BY min_score DESC`);
    res.json({ success: true, message: 'Grading scales reset to defaults', data: result.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('resetToDefaults grading scales:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = { getAll, getById, create, update, remove, resetToDefaults };