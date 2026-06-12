const { pool } = require('../config/database');
const { computeFinalScore, getGradeForScore } = require('../utils/grading.service');

// GET /api/final-results/term/:termId
const getByTerm = async (req, res) => {
  try {
    const { termId } = req.params;
    const result = await pool.query(
      `SELECT fr.*,
              l.first_name, l.last_name, l.admission_number, l.gender,
              s.subject_name, s.subject_code,
              st.stream_name,
              c.class_name
       FROM final_results fr
       JOIN learners l ON fr.learner_id = l.id
       JOIN subjects s ON fr.subject_id = s.id
       LEFT JOIN streams st ON fr.stream_id = st.id
       LEFT JOIN classes c ON st.class_id = c.id
       WHERE fr.term_id = $1
       ORDER BY st.stream_name, l.admission_number, s.subject_name`,
      [termId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getByTerm final results:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/final-results/term/:termId/stream/:streamId
const getByTermAndStream = async (req, res) => {
  try {
    const { termId, streamId } = req.params;
    const result = await pool.query(
      `SELECT fr.*,
              l.first_name, l.last_name, l.admission_number, l.gender,
              s.subject_name, s.subject_code
       FROM final_results fr
       JOIN learners l ON fr.learner_id = l.id
       JOIN subjects s ON fr.subject_id = s.id
       WHERE fr.term_id = $1 AND fr.stream_id = $2
       ORDER BY l.admission_number, s.subject_name`,
      [termId, streamId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getByTermAndStream:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/final-results/learner/:learnerId
const getByLearner = async (req, res) => {
  try {
    const { learnerId } = req.params;
    const result = await pool.query(
      `SELECT fr.*,
              s.subject_name, s.subject_code,
              t.term_number, ay.year_name
       FROM final_results fr
       JOIN subjects s ON fr.subject_id = s.id
       JOIN terms t ON fr.term_id = t.id
       JOIN academic_years ay ON t.academic_year_id = ay.id
       WHERE fr.learner_id = $1
       ORDER BY ay.year_name DESC, t.term_number, s.subject_name`,
      [learnerId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getByLearner final results:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/final-results/learner/:learnerId/term/:termId
const getLearnerTermResults = async (req, res) => {
  try {
    const { learnerId, termId } = req.params;
    const result = await pool.query(
      `SELECT fr.*,
              s.subject_name, s.subject_code,
              t.term_number, ay.year_name
       FROM final_results fr
       JOIN subjects s ON fr.subject_id = s.id
       JOIN terms t ON fr.term_id = t.id
       JOIN academic_years ay ON t.academic_year_id = ay.id
       WHERE fr.learner_id = $1 AND fr.term_id = $2
       ORDER BY s.subject_name`,
      [learnerId, termId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getLearnerTermResults:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/final-results/:id
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT fr.*, l.first_name, l.last_name, s.subject_name
       FROM final_results fr
       JOIN learners l ON fr.learner_id = l.id
       JOIN subjects s ON fr.subject_id = s.id
       WHERE fr.id = $1`,
      [id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Final result not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('getById final result:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/final-results/compute/term/:termId
// Recomputes all final results + rankings for an entire term (admin action)
const computeForTerm = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { termId } = req.params;

    // Get all exam results for the term
    const examRows = await client.query(
      `SELECT er.learner_id, er.subject_id, er.stream_id,
              es.exam_type, er.score
       FROM exam_results er
       JOIN exam_sessions es ON er.exam_session_id = es.id
       WHERE es.term_id = $1`,
      [termId]
    );

    // Group by learner + subject
    const grouped = {};
    for (const row of examRows.rows) {
      const key = `${row.learner_id}__${row.subject_id}`;
      if (!grouped[key]) {
        grouped[key] = { learner_id: row.learner_id, subject_id: row.subject_id, stream_id: row.stream_id };
      }
      grouped[key][row.exam_type] = row.score; // mid_term or end_of_term
    }

    // Upsert each final result
    for (const entry of Object.values(grouped)) {
      const midScore = entry.mid_term ?? null;
      const endScore = entry.end_of_term ?? null;
      const gradeInfo = await getGradeForScore(computeFinalScore(midScore, endScore));

      await client.query(
        `INSERT INTO final_results
           (learner_id, subject_id, stream_id, term_id, mid_term_score, end_term_score, grade, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (learner_id, subject_id, term_id)
         DO UPDATE SET
           mid_term_score = EXCLUDED.mid_term_score,
           end_term_score = EXCLUDED.end_term_score,
           grade          = EXCLUDED.grade,
           remarks        = EXCLUDED.remarks,
           updated_at     = CURRENT_TIMESTAMP`,
        [entry.learner_id, entry.subject_id, entry.stream_id, termId, midScore, endScore, gradeInfo.grade, gradeInfo.remarks]
      );
    }

    // Compute stream rankings per subject
    await _computeRankings(client, termId);

    await client.query('COMMIT');
    res.json({ success: true, message: `Final results computed for term`, count: Object.keys(grouped).length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('computeForTerm:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

// POST /api/final-results/compute/learner/:learnerId/term/:termId
const computeForLearner = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { learnerId, termId } = req.params;

    const examRows = await client.query(
      `SELECT er.subject_id, er.stream_id, es.exam_type, er.score
       FROM exam_results er
       JOIN exam_sessions es ON er.exam_session_id = es.id
       WHERE es.term_id = $1 AND er.learner_id = $2`,
      [termId, learnerId]
    );

    const grouped = {};
    for (const row of examRows.rows) {
      if (!grouped[row.subject_id]) {
        grouped[row.subject_id] = { subject_id: row.subject_id, stream_id: row.stream_id };
      }
      grouped[row.subject_id][row.exam_type] = row.score;
    }

    for (const entry of Object.values(grouped)) {
      const midScore = entry.mid_term ?? null;
      const endScore = entry.end_of_term ?? null;
      const gradeInfo = await getGradeForScore(computeFinalScore(midScore, endScore));

      await client.query(
        `INSERT INTO final_results
           (learner_id, subject_id, stream_id, term_id, mid_term_score, end_term_score, grade, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (learner_id, subject_id, term_id)
         DO UPDATE SET
           mid_term_score = EXCLUDED.mid_term_score,
           end_term_score = EXCLUDED.end_term_score,
           grade          = EXCLUDED.grade,
           remarks        = EXCLUDED.remarks,
           updated_at     = CURRENT_TIMESTAMP`,
        [learnerId, entry.subject_id, entry.stream_id, termId, midScore, endScore, gradeInfo.grade, gradeInfo.remarks]
      );
    }

    await _computeRankings(client, termId);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Final results computed for learner' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('computeForLearner:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

// PUT /api/final-results/:id (admin manual override)
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, remarks } = req.body;

    const result = await pool.query(
      `UPDATE final_results
       SET grade = $1, remarks = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [grade, remarks, id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Final result not found' });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('update final result:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Private: compute stream + class rankings ─────────────────────────────────
const _computeRankings = async (client, termId) => {
  // Stream ranking: rank by avg final_score per learner within each stream
  await client.query(`
    WITH stream_averages AS (
      SELECT learner_id, stream_id,
             AVG(final_score) AS avg_score
      FROM final_results
      WHERE term_id = $1 AND final_score IS NOT NULL
      GROUP BY learner_id, stream_id
    ),
    ranked AS (
      SELECT learner_id, stream_id,
             RANK() OVER (PARTITION BY stream_id ORDER BY avg_score DESC) AS stream_rank
      FROM stream_averages
    )
    UPDATE final_results fr
    SET stream_rank = r.stream_rank
    FROM ranked r
    WHERE fr.learner_id = r.learner_id
      AND fr.stream_id  = r.stream_id
      AND fr.term_id    = $1
  `, [termId]);

  // Class ranking: rank by avg final_score per learner within each class
  await client.query(`
    WITH class_averages AS (
      SELECT fr.learner_id, c.id AS class_id,
             AVG(fr.final_score) AS avg_score
      FROM final_results fr
      JOIN streams st ON fr.stream_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE fr.term_id = $1 AND fr.final_score IS NOT NULL
      GROUP BY fr.learner_id, c.id
    ),
    ranked AS (
      SELECT learner_id, class_id,
             RANK() OVER (PARTITION BY class_id ORDER BY avg_score DESC) AS class_rank
      FROM class_averages
    )
    UPDATE final_results fr
    SET class_rank = r.class_rank
    FROM ranked r
    JOIN streams st ON fr.stream_id = st.id
    WHERE fr.learner_id = r.learner_id
      AND st.class_id   = r.class_id
      AND fr.term_id    = $1
  `, [termId]);
};

// GET /api/final-results/term/:termId/stream/:streamId/download
const downloadStreamMarks = async (req, res) => {
  try {
    const { termId, streamId } = req.params;
    const { pool } = require('../config/database');
    const { exportStreamMarks } = require('../utils/excelExport');

    // Get term and stream details
    const [termRes, streamRes] = await Promise.all([
      pool.query(
        `SELECT t.term_number, ay.year_name 
         FROM terms t
         JOIN academic_years ay ON t.academic_year_id = ay.id
         WHERE t.id = $1`,
        [termId]
      ),
      pool.query(
        `SELECT s.stream_name, c.class_name
         FROM streams s
         JOIN classes c ON s.class_id = c.id
         WHERE s.id = $1`,
        [streamId]
      ),
    ]);

    if (termRes.rows.length === 0 || streamRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Term or stream not found',
      });
    }

    const term = termRes.rows[0];
    const stream = streamRes.rows[0];
    const termName = `${term.year_name} - Term ${term.term_number}`;

    // Get final results for this term and stream
    const resultsRes = await pool.query(
      `SELECT fr.*,
              l.first_name, l.last_name, l.admission_number,
              s.subject_name, s.subject_code
       FROM final_results fr
       JOIN learners l ON fr.learner_id = l.id
       JOIN subjects s ON fr.subject_id = s.id
       WHERE fr.term_id = $1 AND fr.stream_id = $2
       ORDER BY l.admission_number, s.subject_name`,
      [termId, streamId]
    );

    const results = resultsRes.rows;

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No results found for this stream and term',
      });
    }

    // Generate Excel file
    const buffer = await exportStreamMarks(results, stream.class_name, stream.stream_name, termName);

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="StreamMarks_${stream.class_name}_${stream.stream_name}_${term.year_name}_T${term.term_number}_${new Date().toISOString().split('T')[0]}.xlsx"`
    );

    res.send(buffer);
  } catch (err) {
    console.error('downloadStreamMarks:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getByTerm, getByTermAndStream, getByLearner,
  getLearnerTermResults, getById,
  computeForTerm, computeForLearner, update,
  downloadStreamMarks,
};
