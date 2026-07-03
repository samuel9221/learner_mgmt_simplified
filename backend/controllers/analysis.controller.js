const { pool } = require('../config/database');
const { getAllGradingScales } = require('../utils/grading.service');

// GET /api/analysis/stream/:streamId/term/:termId
const getStreamAnalysis = async (req, res) => {
  try {
    const { streamId, termId } = req.params;
    const gradingScales = await getAllGradingScales();

    // Per-subject averages and grade distribution
    const subjectStats = await pool.query(
      `SELECT s.subject_name, s.subject_code,
              COUNT(fr.id) AS total_learners,
              ROUND(AVG(fr.mid_term_score), 2) AS avg_mid_term,
              ROUND(AVG(fr.end_term_score), 2) AS avg_end_term,
              ROUND(AVG(fr.final_score), 2) AS avg_final,
              ROUND(MIN(fr.final_score), 2) AS min_score,
              ROUND(MAX(fr.final_score), 2) AS max_score,
              COUNT(CASE WHEN fr.final_score IS NOT NULL THEN 1 END) AS graded_count
       FROM final_results fr
       JOIN subjects s ON fr.subject_id = s.id
       WHERE fr.stream_id = $1 AND fr.term_id = $2
       GROUP BY s.id, s.subject_name, s.subject_code
       ORDER BY s.subject_name`,
      [streamId, termId]
    );

    // Grade distribution per subject
    const gradeDistribution = await pool.query(
      `SELECT s.subject_name, fr.grade, COUNT(*) AS count
       FROM final_results fr
       JOIN subjects s ON fr.subject_id = s.id
       WHERE fr.stream_id = $1 AND fr.term_id = $2
       GROUP BY s.subject_name, fr.grade
       ORDER BY s.subject_name, fr.grade`,
      [streamId, termId]
    );

    // Overall learner averages + stream rank
    const learnerOverall = await pool.query(
      `SELECT l.id, l.admission_number,
              l.first_name || ' ' || l.last_name AS learner_name,
              l.gender,
              ROUND(AVG(fr.final_score), 2) AS overall_average,
              MIN(fr.stream_rank) AS stream_rank,
              COUNT(fr.id) AS subjects_taken
       FROM final_results fr
       JOIN learners l ON fr.learner_id = l.id
       WHERE fr.stream_id = $1 AND fr.term_id = $2
       GROUP BY l.id, l.admission_number, l.first_name, l.last_name, l.gender
       ORDER BY overall_average DESC NULLS LAST`,
      [streamId, termId]
    );

    // Pass/fail counts (pass = final_score >= lowest passing grade min_score)
    const passThreshold = gradingScales
      .filter(g => g.label !== gradingScales[gradingScales.length - 1].label) // exclude lowest
      .reduce((min, g) => Math.min(min, g.min_score), 100);

    const passFailStats = await pool.query(
      `WITH learner_averages AS (
         SELECT learner_id, AVG(final_score) AS overall_average
         FROM final_results
         WHERE stream_id = $1 AND term_id = $2
         GROUP BY learner_id
       )
       SELECT
         COUNT(CASE WHEN overall_average >= $3 THEN 1 END) AS passed,
         COUNT(CASE WHEN overall_average < $3  THEN 1 END) AS failed,
         COUNT(CASE WHEN overall_average IS NULL THEN 1 END) AS not_graded,
         COUNT(*) AS total_learners
       FROM learner_averages`,
      [streamId, termId, passThreshold]
    );

    res.json({
      success: true,
      data: {
        subject_stats: subjectStats.rows,
        grade_distribution: gradeDistribution.rows,
        learner_overall: learnerOverall.rows,
        pass_fail: passFailStats.rows[0],
        grading_scales: gradingScales,
      }
    });
  } catch (err) {
    console.error('getStreamAnalysis:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/analysis/class/:classId/term/:termId
const getClassAnalysis = async (req, res) => {
  try {
    const { classId, termId } = req.params;

    // Per-stream averages
    const streamStats = await pool.query(
      `SELECT st.id AS stream_id, st.stream_name,
              COUNT(DISTINCT fr.learner_id) AS total_learners,
              ROUND(AVG(fr.final_score), 2) AS avg_final,
              ROUND(MIN(fr.final_score), 2) AS min_score,
              ROUND(MAX(fr.final_score), 2) AS max_score
       FROM final_results fr
       JOIN streams st ON fr.stream_id = st.id
       WHERE st.class_id = $1 AND fr.term_id = $2
       GROUP BY st.id, st.stream_name
       ORDER BY st.stream_name`,
      [classId, termId]
    );

    // Class-wide subject performance
    const subjectStats = await pool.query(
      `SELECT s.subject_name, s.subject_code,
              ROUND(AVG(fr.final_score), 2) AS class_avg,
              COUNT(DISTINCT fr.learner_id) AS total_learners
       FROM final_results fr
       JOIN subjects s ON fr.subject_id = s.id
       JOIN streams st ON fr.stream_id = st.id
       WHERE st.class_id = $1 AND fr.term_id = $2
       GROUP BY s.id, s.subject_name, s.subject_code
       ORDER BY class_avg DESC NULLS LAST`,
      [classId, termId]
    );

    // Top 10 learners in the class
    const topLearners = await pool.query(
      `SELECT l.admission_number,
              l.first_name || ' ' || l.last_name AS learner_name,
              st.stream_name,
              ROUND(AVG(fr.final_score), 2) AS overall_average,
              MIN(fr.class_rank) AS class_rank
       FROM final_results fr
       JOIN learners l ON fr.learner_id = l.id
       JOIN streams st ON fr.stream_id = st.id
       WHERE st.class_id = $1 AND fr.term_id = $2
       GROUP BY l.id, l.admission_number, l.first_name, l.last_name, st.stream_name
       ORDER BY overall_average DESC NULLS LAST
       LIMIT 10`,
      [classId, termId]
    );

    res.json({
      success: true,
      data: {
        stream_stats: streamStats.rows,
        subject_stats: subjectStats.rows,
        top_learners: topLearners.rows,
      }
    });
  } catch (err) {
    console.error('getClassAnalysis:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/analysis/subject/:subjectId/term/:termId
const getSubjectAnalysis = async (req, res) => {
  try {
    const { subjectId, termId } = req.params;

    const stats = await pool.query(
      `SELECT st.stream_name, c.class_name,
              COUNT(DISTINCT fr.learner_id) AS total_learners,
              ROUND(AVG(fr.mid_term_score), 2) AS avg_mid_term,
              ROUND(AVG(fr.end_term_score), 2) AS avg_end_term,
              ROUND(AVG(fr.final_score), 2) AS avg_final,
              ROUND(MIN(fr.final_score), 2) AS min_score,
              ROUND(MAX(fr.final_score), 2) AS max_score
       FROM final_results fr
       JOIN streams st ON fr.stream_id = st.id
       JOIN classes c ON st.class_id = c.id
       WHERE fr.subject_id = $1 AND fr.term_id = $2
       GROUP BY st.id, st.stream_name, c.class_name
       ORDER BY c.class_name, st.stream_name`,
      [subjectId, termId]
    );

    const gradeDistribution = await pool.query(
      `SELECT fr.grade, COUNT(*) AS count
       FROM final_results fr
       WHERE fr.subject_id = $1 AND fr.term_id = $2
       GROUP BY fr.grade
       ORDER BY fr.grade`,
      [subjectId, termId]
    );

    res.json({
      success: true,
      data: {
        stream_stats: stats.rows,
        grade_distribution: gradeDistribution.rows,
      }
    });
  } catch (err) {
    console.error('getSubjectAnalysis:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/analysis/learner/:learnerId/term/:termId
const getLearnerAnalysis = async (req, res) => {
  try {
    const { learnerId, termId } = req.params;

    const results = await pool.query(
      `SELECT fr.*,
              s.subject_name, s.subject_code,
              t.term_number, ay.year_name,
              st.stream_name, c.class_name
       FROM final_results fr
       JOIN subjects s ON fr.subject_id = s.id
       JOIN terms t ON fr.term_id = t.id
       JOIN academic_years ay ON t.academic_year_id = ay.id
       LEFT JOIN streams st ON fr.stream_id = st.id
       LEFT JOIN classes c ON st.class_id = c.id
       WHERE fr.learner_id = $1 AND fr.term_id = $2
       ORDER BY s.subject_name`,
      [learnerId, termId]
    );

    const summary = await pool.query(
      `SELECT ROUND(AVG(final_score), 2) AS overall_average,
              MIN(stream_rank) AS stream_position,
              MIN(class_rank) AS class_position,
              COUNT(*) AS subjects_taken,
              COUNT(CASE WHEN final_score IS NOT NULL THEN 1 END) AS subjects_graded
       FROM final_results
       WHERE learner_id = $1 AND term_id = $2`,
      [learnerId, termId]
    );

    res.json({
      success: true,
      data: {
        results: results.rows,
        summary: summary.rows[0],
      }
    });
  } catch (err) {
    console.error('getLearnerAnalysis:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/analysis/stream/:streamId/term/:termId/rankings
const getStreamRankings = async (req, res) => {
  try {
    const { streamId, termId } = req.params;

    const rankings = await pool.query(
      `WITH summaries AS (
         SELECT l.id AS learner_id,
                l.admission_number,
                l.first_name || ' ' || l.last_name AS learner_name,
                l.gender,
                c.class_name,
                CASE
                  WHEN c.class_name IN ('S1', 'S2', 'S3', 'S4') THEN 9
                  WHEN c.class_name IN ('S5', 'S6') THEN 5
                  ELSE COUNT(DISTINCT fr.subject_id)
                END AS required_subjects,
                COUNT(DISTINCT fr.subject_id) FILTER (WHERE fr.final_score IS NOT NULL) AS subjects_taken,
                COUNT(DISTINCT CASE WHEN s.is_subsidiary = FALSE THEN fr.subject_id END) FILTER (WHERE fr.final_score IS NOT NULL) AS principal_subjects,
                COUNT(DISTINCT CASE WHEN s.is_subsidiary = TRUE THEN fr.subject_id END) FILTER (WHERE fr.final_score IS NOT NULL) AS subsidiary_subjects,
                COUNT(DISTINCT CASE WHEN LOWER(COALESCE(s.subject_code, '')) = 'gp' OR LOWER(COALESCE(s.subject_name, '')) LIKE '%general paper%' THEN fr.subject_id END) FILTER (WHERE fr.final_score IS NOT NULL) AS general_paper_subjects,
                ROUND(AVG(fr.final_score) FILTER (WHERE fr.final_score IS NOT NULL), 2) AS overall_average,
                ROUND(SUM(fr.final_score) FILTER (WHERE fr.final_score IS NOT NULL), 2) AS total_mark,
                MAX(CASE WHEN LOWER(COALESCE(s.subject_code, '')) IN ('math', 'mtc', 'mathematics') OR LOWER(COALESCE(s.subject_name, '')) LIKE '%mathematics%' OR LOWER(COALESCE(s.subject_name, '')) LIKE '%mtc%' THEN fr.final_score END) AS math_score,
                MAX(CASE WHEN LOWER(COALESCE(s.subject_code, '')) IN ('eng', 'english') OR LOWER(COALESCE(s.subject_name, '')) LIKE '%english%' THEN fr.final_score END) AS english_score,
                COUNT(CASE WHEN fr.grade = 'A' THEN 1 END) AS grade_a_count,
                COUNT(CASE WHEN fr.grade = 'B' THEN 1 END) AS grade_b_count,
                COUNT(CASE WHEN fr.grade = 'C' THEN 1 END) AS grade_c_count,
                COUNT(CASE WHEN fr.grade = 'D' THEN 1 END) AS grade_d_count
         FROM final_results fr
         JOIN learners l ON fr.learner_id = l.id
         JOIN streams st ON fr.stream_id = st.id
         JOIN classes c ON st.class_id = c.id
         LEFT JOIN subjects s ON fr.subject_id = s.id
         WHERE fr.stream_id = $1 AND fr.term_id = $2
         GROUP BY l.id, l.admission_number, l.first_name, l.last_name, l.gender, c.class_name
       ),
       ranked AS (
         SELECT learner_id,
                RANK() OVER (ORDER BY overall_average DESC, total_mark DESC, math_score DESC, english_score DESC) AS stream_rank
         FROM summaries
         WHERE subjects_taken = required_subjects
           AND overall_average IS NOT NULL
           AND (
             class_name NOT IN ('S5', 'S6')
             OR (
               principal_subjects = 3
               AND subsidiary_subjects = 2
               AND general_paper_subjects >= 1
             )
           )
       )
       SELECT s.*, r.stream_rank
       FROM summaries s
       LEFT JOIN ranked r ON r.learner_id = s.learner_id
       ORDER BY r.stream_rank ASC NULLS LAST, s.overall_average DESC NULLS LAST, s.total_mark DESC NULLS LAST, s.learner_name`,
      [streamId, termId]
    );

    res.json({ success: true, data: rankings.rows });
  } catch (err) {
    console.error('getStreamRankings:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/analysis/class/:classId/term/:termId/rankings
const getClassRankings = async (req, res) => {
  try {
    const { classId, termId } = req.params;

    const rankings = await pool.query(
      `WITH summaries AS (
         SELECT l.id AS learner_id,
                l.admission_number,
                l.first_name || ' ' || l.last_name AS learner_name,
                l.gender,
                st.stream_name,
                c.class_name,
                CASE
                  WHEN c.class_name IN ('S1', 'S2', 'S3', 'S4') THEN 9
                  WHEN c.class_name IN ('S5', 'S6') THEN 5
                  ELSE COUNT(DISTINCT fr.subject_id)
                END AS required_subjects,
                COUNT(DISTINCT fr.subject_id) FILTER (WHERE fr.final_score IS NOT NULL) AS subjects_taken,
                COUNT(DISTINCT CASE WHEN s.is_subsidiary = FALSE THEN fr.subject_id END) FILTER (WHERE fr.final_score IS NOT NULL) AS principal_subjects,
                COUNT(DISTINCT CASE WHEN s.is_subsidiary = TRUE THEN fr.subject_id END) FILTER (WHERE fr.final_score IS NOT NULL) AS subsidiary_subjects,
                COUNT(DISTINCT CASE WHEN LOWER(COALESCE(s.subject_code, '')) = 'gp' OR LOWER(COALESCE(s.subject_name, '')) LIKE '%general paper%' THEN fr.subject_id END) FILTER (WHERE fr.final_score IS NOT NULL) AS general_paper_subjects,
                ROUND(AVG(fr.final_score) FILTER (WHERE fr.final_score IS NOT NULL), 2) AS overall_average,
                ROUND(SUM(fr.final_score) FILTER (WHERE fr.final_score IS NOT NULL), 2) AS total_mark,
                MAX(CASE WHEN LOWER(COALESCE(s.subject_code, '')) IN ('math', 'mtc', 'mathematics') OR LOWER(COALESCE(s.subject_name, '')) LIKE '%mathematics%' OR LOWER(COALESCE(s.subject_name, '')) LIKE '%mtc%' THEN fr.final_score END) AS math_score,
                MAX(CASE WHEN LOWER(COALESCE(s.subject_code, '')) IN ('eng', 'english') OR LOWER(COALESCE(s.subject_name, '')) LIKE '%english%' THEN fr.final_score END) AS english_score,
                COUNT(CASE WHEN fr.grade = 'A' THEN 1 END) AS grade_a_count,
                COUNT(CASE WHEN fr.grade = 'B' THEN 1 END) AS grade_b_count,
                COUNT(CASE WHEN fr.grade = 'C' THEN 1 END) AS grade_c_count,
                COUNT(CASE WHEN fr.grade = 'D' THEN 1 END) AS grade_d_count
         FROM final_results fr
         JOIN learners l ON fr.learner_id = l.id
         JOIN streams st ON fr.stream_id = st.id
         JOIN classes c ON st.class_id = c.id
         LEFT JOIN subjects s ON fr.subject_id = s.id
         WHERE st.class_id = $1 AND fr.term_id = $2
         GROUP BY l.id, l.admission_number, l.first_name, l.last_name, l.gender, st.stream_name, c.class_name
       ),
       ranked AS (
         SELECT learner_id,
                RANK() OVER (ORDER BY overall_average DESC, total_mark DESC, math_score DESC, english_score DESC) AS class_rank
         FROM summaries
         WHERE subjects_taken = required_subjects
           AND overall_average IS NOT NULL
           AND (
             class_name NOT IN ('S5', 'S6')
             OR (
               principal_subjects = 3
               AND subsidiary_subjects = 2
               AND general_paper_subjects >= 1
             )
           )
       )
       SELECT s.*, r.class_rank
       FROM summaries s
       LEFT JOIN ranked r ON r.learner_id = s.learner_id
       ORDER BY r.class_rank ASC NULLS LAST, s.overall_average DESC NULLS LAST, s.total_mark DESC NULLS LAST, s.learner_name`,
      [classId, termId]
    );

    res.json({ success: true, data: rankings.rows });
  } catch (err) {
    console.error('getClassRankings:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/analysis/term/:termId/overview
const getTermOverview = async (req, res) => {
  try {
    const { termId } = req.params;

    const overview = await pool.query(
      `SELECT
         COUNT(DISTINCT fr.learner_id) AS total_learners,
         COUNT(DISTINCT fr.subject_id) AS total_subjects,
         COUNT(DISTINCT fr.stream_id) AS total_streams,
         ROUND(AVG(fr.final_score), 2) AS school_average,
         COUNT(CASE WHEN fr.grade = 'A' THEN 1 END) AS grade_a,
         COUNT(CASE WHEN fr.grade = 'B' THEN 1 END) AS grade_b,
         COUNT(CASE WHEN fr.grade = 'C' THEN 1 END) AS grade_c,
         COUNT(CASE WHEN fr.grade = 'D' THEN 1 END) AS grade_d,
         COUNT(CASE WHEN fr.final_score IS NULL THEN 1 END) AS not_graded
       FROM final_results fr
       WHERE fr.term_id = $1`,
      [termId]
    );

    res.json({ success: true, data: overview.rows[0] });
  } catch (err) {
    console.error('getTermOverview:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getStreamAnalysis, getClassAnalysis, getSubjectAnalysis,
  getLearnerAnalysis, getStreamRankings, getClassRankings, getTermOverview,
};
