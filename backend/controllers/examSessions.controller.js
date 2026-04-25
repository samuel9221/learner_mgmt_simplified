const pool = require('../config/database');

// GET /api/exam-sessions
const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT es.*, t.term_number, ay.year_name
       FROM exam_sessions es
       JOIN terms t ON es.term_id = t.id
       JOIN academic_years ay ON t.academic_year_id = ay.id
       ORDER BY ay.year_name DESC, t.term_number, es.exam_type`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getAll exam sessions:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/exam-sessions/term/:termId
const getByTerm = async (req, res) => {
  try {
    const { termId } = req.params;
    const result = await pool.query(
      `SELECT es.*, t.term_number, ay.year_name
       FROM exam_sessions es
       JOIN terms t ON es.term_id = t.id
       JOIN academic_years ay ON t.academic_year_id = ay.id
       WHERE es.term_id = $1
       ORDER BY es.exam_type`,
      [termId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getByTerm exam sessions:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/exam-sessions/:id
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT es.*, t.term_number, ay.year_name
       FROM exam_sessions es
       JOIN terms t ON es.term_id = t.id
       JOIN academic_years ay ON t.academic_year_id = ay.id
       WHERE es.id = $1`,
      [id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Exam session not found' });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('getById exam session:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/exam-sessions
const create = async (req, res) => {
  try {
    const { term_id, exam_type, start_date, end_date } = req.body;
    const created_by = req.user.id;

    // Check duplicate
    const exists = await pool.query(
      `SELECT id FROM exam_sessions WHERE term_id = $1 AND exam_type = $2`,
      [term_id, exam_type]
    );
    if (exists.rows.length)
      return res.status(400).json({
        success: false,
        message: `A ${exam_type.replace('_', ' ')} session already exists for this term`
      });

    const result = await pool.query(
      `INSERT INTO exam_sessions (term_id, exam_type, start_date, end_date, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [term_id, exam_type, start_date, end_date, created_by]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('create exam session:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/exam-sessions/:id
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.body;
    // Note: term_id and exam_type should not be changed — create a new one instead

    const result = await pool.query(
      `UPDATE exam_sessions
       SET start_date = $1, end_date = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [start_date, end_date, id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Exam session not found' });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('update exam session:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/exam-sessions/:id/toggle-active
const toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE exam_sessions
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Exam session not found' });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('toggleActive exam session:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/exam-sessions/:id
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // Block deletion if results exist for this session
    const hasResults = await pool.query(
      `SELECT id FROM exam_results WHERE exam_session_id = $1 LIMIT 1`,
      [id]
    );
    if (hasResults.rows.length)
      return res.status(400).json({
        success: false,
        message: 'Cannot delete session — exam results exist. Delete results first.'
      });

    const result = await pool.query(
      `DELETE FROM exam_sessions WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Exam session not found' });

    res.json({ success: true, message: 'Exam session deleted' });
  } catch (err) {
    console.error('remove exam session:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAll, getByTerm, getById, create, update, toggleActive, remove };