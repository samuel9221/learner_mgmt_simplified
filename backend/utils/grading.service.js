const pool = require('../config/database');

/**
 * WEIGHT CONSTANTS
 * Users always enter scores out of 100.
 * The system converts internally:
 *   mid_term  → score × 0.40  (40% weight)
 *   end_of_term → score × 0.60 (60% weight)
 *
 * final_score = (mid_term_score × 0.40) + (end_term_score × 0.60)
 * PostgreSQL GENERATED COLUMN handles this automatically in final_results,
 * but we also compute it here for validation and intermediate use.
 */
const WEIGHTS = {
  mid_term: 0.40,
  end_of_term: 0.60,
};

/**
 * Convert a raw score (0–100) to its weighted contribution.
 * @param {number} score       - Raw score entered by teacher (0–100)
 * @param {'mid_term'|'end_of_term'} examType
 * @returns {number}           - Weighted score
 */
const applyWeight = (score, examType) => {
  if (score === null || score === undefined) return null;
  return parseFloat((score * WEIGHTS[examType]).toFixed(2));
};

/**
 * Compute the final weighted score from both raw scores.
 * @param {number|null} midScore  - Raw mid-term score (0–100)
 * @param {number|null} endScore  - Raw end-of-term score (0–100)
 * @returns {number|null}         - Final score (0–100 scale), or null if either is missing
 */
const computeFinalScore = (midScore, endScore) => {
  if (midScore === null || midScore === undefined) return null;
  if (endScore === null || endScore === undefined) return null;
  return parseFloat(((midScore * WEIGHTS.mid_term) + (endScore * WEIGHTS.end_of_term)).toFixed(2));
};

/**
 * Look up the grade label for a given score from the grading_scales table.
 * Falls back to 'N/A' if no matching scale is found.
 * @param {number} score
 * @returns {Promise<{grade: string, grade_name: string, remarks: string, color_code: string}>}
 */
const getGradeForScore = async (score) => {
  if (score === null || score === undefined) {
    return { grade: 'N/A', grade_name: 'Not Assessed', remarks: '', color_code: '#9ca3af' };
  }

  const result = await pool.query(
    `SELECT label AS grade, grade_name, remarks, color_code
     FROM grading_scales
     WHERE is_active = TRUE
       AND $1 >= min_score
       AND $1 <= max_score
     LIMIT 1`,
    [score]
  );

  if (!result.rows.length) {
    return { grade: 'N/A', grade_name: 'Ungraded', remarks: '', color_code: '#9ca3af' };
  }

  return result.rows[0];
};

/**
 * Get all active grading scales (for frontend display / report headers).
 * @returns {Promise<Array>}
 */
const getAllGradingScales = async () => {
  const result = await pool.query(
    `SELECT label, grade_name, min_score, max_score, remarks, color_code
     FROM grading_scales
     WHERE is_active = TRUE
     ORDER BY min_score DESC`
  );
  return result.rows;
};

module.exports = {
  WEIGHTS,
  applyWeight,
  computeFinalScore,
  getGradeForScore,
  getAllGradingScales,
};