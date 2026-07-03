const { pool } = require('../config/database');
const { applyWeight, computeFinalScore, getGradeForScore } = require('../utils/grading.service');

const _getSubjectPaperSetup = async (client, subjectId, streamId) => {
  const streamResult = await client.query(
    `SELECT c.class_name
     FROM streams s
     JOIN classes c ON c.id = s.class_id
     WHERE s.id = $1`,
    [streamId]
  );

  const className = streamResult.rows[0]?.class_name;
  const papersResult = await client.query(
    `SELECT paper_number, paper_name
     FROM subject_papers
     WHERE subject_id = $1
     ORDER BY paper_number ASC`,
    [subjectId]
  );

  const papers = papersResult.rows.map(p => ({
    paper_number: Number(p.paper_number),
    paper_name: p.paper_name,
  }));

  return {
    className,
    papers,
    needsPaperEntry: ['S5', 'S6'].includes(className) && papers.length > 0,
  };
};

const _averagePaperScores = (scores) => {
  const validScores = scores.filter(score => score !== null && score !== undefined && score !== '');
  if (!validScores.length) return null;
  return Number((validScores.reduce((sum, value) => sum + Number(value), 0) / validScores.length).toFixed(2));
};

// ─── Helper: auto-compute & upsert final_result after any score change ───────
const _recomputeFinalResult = async (client, learnerId, subjectId, streamId, termId) => {
  // Fetch both exam sessions for this term
  const sessionsResult = await client.query(
    `SELECT es.id, es.exam_type, er.score
     FROM exam_sessions es
     LEFT JOIN exam_results er
       ON er.exam_session_id = es.id
       AND er.learner_id = $1
       AND er.subject_id = $2
     WHERE es.term_id = $3`,
    [learnerId, subjectId, termId]
  );

  const sessions = sessionsResult.rows;
  const midScores = sessions.filter(s => s.exam_type === 'mid_term' && s.score !== null).map(s => Number(s.score));
  const endScores = sessions.filter(s => s.exam_type === 'end_of_term' && s.score !== null).map(s => Number(s.score));

  const midScore = _averagePaperScores(midScores);
  const endScore = _averagePaperScores(endScores);

  // Compute weighted final (null if either score missing)
  const finalScore = computeFinalScore(midScore, endScore);

  // Resolve grade from grading_scales
  const gradeInfo = await getGradeForScore(finalScore);

  // Upsert into final_results
  // Note: final_score is a GENERATED COLUMN in PG (computed from mid+end stored columns)
  // so we only write mid_term_score and end_term_score; PG computes final_score automatically
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
    [learnerId, subjectId, streamId, termId, midScore, endScore, gradeInfo.grade, gradeInfo.remarks]
  );
};

// ─── Helper: get term_id from a session ──────────────────────────────────────
const _getSessionTerm = async (client, sessionId) => {
  const r = await client.query(`SELECT term_id FROM exam_sessions WHERE id = $1`, [sessionId]);
  return r.rows[0]?.term_id ?? null;
};

const _teacherCanEnterSubject = async (client, teacherId, subjectId, streamId, sessionId) => {
  const result = await client.query(
    `SELECT 1
     FROM subject_teachers st
     JOIN exam_sessions es ON es.id = $4
     JOIN terms t ON t.id = es.term_id
     WHERE st.teacher_id = $1
       AND st.subject_id = $2
       AND st.academic_year_id = t.academic_year_id
       AND (st.stream_id = $3 OR st.stream_id IS NULL)
     LIMIT 1`,
    [teacherId, subjectId, streamId, sessionId]
  );

  return result.rows.length > 0;
};

// ─────────────────────────────────────────────────────────────────────────────

// GET /api/exam-results
const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT er.*, 
              l.first_name, l.last_name, l.admission_number,
              s.subject_name, s.subject_code,
              es.exam_type,
              st.stream_name
       FROM exam_results er
       JOIN learners l ON er.learner_id = l.id
       JOIN subjects s ON er.subject_id = s.id
       JOIN exam_sessions es ON er.exam_session_id = es.id
       LEFT JOIN streams st ON er.stream_id = st.id
       ORDER BY l.admission_number, s.subject_name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getAll exam results:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/exam-results/session/:sessionId
const getBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      `SELECT er.*,
              l.first_name, l.last_name, l.admission_number, l.gender,
              s.subject_name, s.subject_code,
              es.exam_type,
              st.stream_name
       FROM exam_results er
       JOIN learners l ON er.learner_id = l.id
       JOIN subjects s ON er.subject_id = s.id
       JOIN exam_sessions es ON er.exam_session_id = es.id
       LEFT JOIN streams st ON er.stream_id = st.id
       WHERE er.exam_session_id = $1
       ORDER BY l.admission_number, s.subject_name`,
      [sessionId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getBySession:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/exam-results/session/:sessionId/stream/:streamId
const getBySessionAndStream = async (req, res) => {
  try {
    const { sessionId, streamId } = req.params;
    const result = await pool.query(
      `SELECT er.*,
              l.first_name, l.last_name, l.admission_number, l.gender,
              s.subject_name, s.subject_code,
              es.exam_type
       FROM exam_results er
       JOIN learners l ON er.learner_id = l.id
       JOIN subjects s ON er.subject_id = s.id
       JOIN exam_sessions es ON er.exam_session_id = es.id
       WHERE er.exam_session_id = $1 AND er.stream_id = $2
       ORDER BY l.admission_number, s.subject_name`,
      [sessionId, streamId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getBySessionAndStream:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/exam-results/learner/:learnerId
const getByLearner = async (req, res) => {
  try {
    const { learnerId } = req.params;
    const result = await pool.query(
      `SELECT er.*,
              s.subject_name, s.subject_code,
              es.exam_type,
              t.term_number,
              ay.year_name
       FROM exam_results er
       JOIN subjects s ON er.subject_id = s.id
       JOIN exam_sessions es ON er.exam_session_id = es.id
       JOIN terms t ON es.term_id = t.id
       JOIN academic_years ay ON t.academic_year_id = ay.id
       WHERE er.learner_id = $1
       ORDER BY ay.year_name DESC, t.term_number, s.subject_name`,
      [learnerId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getByLearner:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/exam-results/learner/:learnerId/session/:sessionId
const getLearnerSessionResults = async (req, res) => {
  try {
    const { learnerId, sessionId } = req.params;
    const result = await pool.query(
      `SELECT er.*, s.subject_name, s.subject_code, es.exam_type
       FROM exam_results er
       JOIN subjects s ON er.subject_id = s.id
       JOIN exam_sessions es ON er.exam_session_id = es.id
       WHERE er.learner_id = $1 AND er.exam_session_id = $2
       ORDER BY s.subject_name`,
      [learnerId, sessionId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getLearnerSessionResults:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/exam-results/:id
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT er.*, l.first_name, l.last_name, s.subject_name, es.exam_type
       FROM exam_results er
       JOIN learners l ON er.learner_id = l.id
       JOIN subjects s ON er.subject_id = s.id
       JOIN exam_sessions es ON er.exam_session_id = es.id
       WHERE er.id = $1`,
      [id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Result not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('getById exam result:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/exam-results  — single score entry
const create = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { learner_id, subject_id, stream_id, exam_session_id, score, is_absent, paper_number } = req.body;
    const teacher_id = req.user.id;

    const subjectSetup = await _getSubjectPaperSetup(client, subject_id, stream_id);

    if (subjectSetup.needsPaperEntry) {
      if (paper_number === undefined || paper_number === null || paper_number === '') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Paper number is required for S5/S6 subjects with papers' });
      }

      const paperNumbers = subjectSetup.papers.map(p => p.paper_number);
      if (!paperNumbers.includes(Number(paper_number))) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Invalid paper number for this subject' });
      }
    }

    // Validate score range
    if (!is_absent && (score < 0 || score > 100)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Score must be between 0 and 100' });
    }

    // Get session to know exam_type + term_id
    const sessionRow = await client.query(
      `SELECT id, exam_type, term_id FROM exam_sessions WHERE id = $1`,
      [exam_session_id]
    );
    if (!sessionRow.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Exam session not found' });
    }

    const { term_id } = sessionRow.rows[0];

    if (req.user.role === 'teacher') {
      const allowed = await _teacherCanEnterSubject(client, teacher_id, subject_id, stream_id, exam_session_id);
      if (!allowed) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, message: 'You are not assigned to enter marks for this subject' });
      }
    }

    // Insert result (score stored as-is in 0-100; weight applied in final_results)
    const result = await client.query(
      `INSERT INTO exam_results
         (learner_id, subject_id, stream_id, exam_session_id, paper_number, score, is_absent, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (learner_id, subject_id, exam_session_id, paper_number)
       DO UPDATE SET score = EXCLUDED.score, is_absent = EXCLUDED.is_absent,
                     teacher_id = EXCLUDED.teacher_id, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [learner_id, subject_id, stream_id, exam_session_id, subjectSetup.needsPaperEntry ? Number(paper_number) : null, is_absent ? null : score, is_absent ?? false, teacher_id]
    );

    // Auto-recompute final result
    await _recomputeFinalResult(client, learner_id, subject_id, stream_id, term_id);

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('create exam result:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

// POST /api/exam-results/bulk  — enter entire stream/class at once
// Body: { exam_session_id, stream_id, results: [{learner_id, subject_id, score, is_absent}] }
const bulkCreate = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { exam_session_id, stream_id, results } = req.body;
    const teacher_id = req.user.id;

    if (!Array.isArray(results) || !results.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Results array is required' });
    }

    // Get session
    const sessionRow = await client.query(
      `SELECT id, exam_type, term_id FROM exam_sessions WHERE id = $1`,
      [exam_session_id]
    );
    if (!sessionRow.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Exam session not found' });
    }

    const { term_id } = sessionRow.rows[0];
    const inserted = [];
    const checkedSubjects = new Map();
    const paperSetupBySubject = new Map();
    const seenPaperEntries = new Map();

    for (const entry of results) {
      const { learner_id, subject_id, score, is_absent, paper_number } = entry;

      if (!subject_id || !learner_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Each result entry needs learner and subject' });
      }

      // Validate score
      if (!is_absent && (score < 0 || score > 100)) continue;

      if (req.user.role === 'teacher') {
        if (!checkedSubjects.has(subject_id)) {
          checkedSubjects.set(
            subject_id,
            await _teacherCanEnterSubject(client, teacher_id, subject_id, stream_id, exam_session_id)
          );
        }

        if (!checkedSubjects.get(subject_id)) {
          await client.query('ROLLBACK');
          return res.status(403).json({ success: false, message: 'You are not assigned to enter marks for this subject' });
        }
      }

      if (!paperSetupBySubject.has(subject_id)) {
        paperSetupBySubject.set(subject_id, await _getSubjectPaperSetup(client, subject_id, stream_id));
      }

      const subjectSetup = paperSetupBySubject.get(subject_id);
      const normalizedPaperNumber = subjectSetup.needsPaperEntry ? Number(paper_number) : null;

      if (subjectSetup.needsPaperEntry) {
        if (!normalizedPaperNumber || !subjectSetup.papers.some(p => p.paper_number === normalizedPaperNumber)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Each paper entry must include a valid paper number for S5/S6 subjects' });
        }
      }

      const entryKey = `${learner_id}::${subject_id}`;
      if (!seenPaperEntries.has(entryKey)) {
        seenPaperEntries.set(entryKey, new Set());
      }
      if (subjectSetup.needsPaperEntry) {
        seenPaperEntries.get(entryKey).add(normalizedPaperNumber);
      }

      const r = await client.query(
        `INSERT INTO exam_results
           (learner_id, subject_id, stream_id, exam_session_id, paper_number, score, is_absent, teacher_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (learner_id, subject_id, exam_session_id, paper_number)
         DO UPDATE SET score = EXCLUDED.score, is_absent = EXCLUDED.is_absent,
                       teacher_id = EXCLUDED.teacher_id, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [learner_id, subject_id, stream_id, exam_session_id, subjectSetup.needsPaperEntry ? normalizedPaperNumber : null, is_absent ? null : score, is_absent ?? false, teacher_id]
      );
      inserted.push(r.rows[0]);

      // Recompute final for each learner
      await _recomputeFinalResult(client, learner_id, subject_id, stream_id, term_id);
    }

    for (const [entryKey, paperNumbers] of seenPaperEntries.entries()) {
      const [learnerId, subjectId] = entryKey.split('::');
      const subjectSetup = paperSetupBySubject.get(subjectId);
      if (subjectSetup?.needsPaperEntry) {
        const expectedPaperNumbers = subjectSetup.papers.map(p => p.paper_number);
        const missingPapers = expectedPaperNumbers.filter(p => !paperNumbers.has(p));
        if (missingPapers.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: `Please enter marks for all papers for this subject before saving (${missingPapers.join(', ')})` });
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: `${inserted.length} results saved`,
      data: inserted
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('bulkCreate exam results:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

// PUT /api/exam-results/:id
const update = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { score, is_absent } = req.body;

    if (!is_absent && (score < 0 || score > 100)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Score must be between 0 and 100' });
    }

    // Get existing record to know IDs for recompute
    const existing = await client.query(
      `SELECT er.learner_id, er.subject_id, er.stream_id, es.term_id
       FROM exam_results er
       JOIN exam_sessions es ON er.exam_session_id = es.id
       WHERE er.id = $1`,
      [id]
    );
    if (!existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    const { learner_id, subject_id, stream_id, term_id } = existing.rows[0];

    const result = await client.query(
      `UPDATE exam_results
       SET score = $1, is_absent = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [is_absent ? null : score, is_absent ?? false, id]
    );

    // Recompute final result
    await _recomputeFinalResult(client, learner_id, subject_id, stream_id, term_id);

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('update exam result:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

// DELETE /api/exam-results/:id
const remove = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const existing = await client.query(
      `SELECT er.learner_id, er.subject_id, er.stream_id, es.term_id
       FROM exam_results er
       JOIN exam_sessions es ON er.exam_session_id = es.id
       WHERE er.id = $1`,
      [id]
    );
    if (!existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    const { learner_id, subject_id, stream_id, term_id } = existing.rows[0];

    await client.query(`DELETE FROM exam_results WHERE id = $1`, [id]);

    // Recompute (will set scores to null if one exam is now missing)
    await _recomputeFinalResult(client, learner_id, subject_id, stream_id, term_id);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Result deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('remove exam result:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getAll, getBySession, getBySessionAndStream,
  getByLearner, getLearnerSessionResults,
  getById, create, bulkCreate, update, remove,
};
