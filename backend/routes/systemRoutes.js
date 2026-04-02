/* added items begins here*/
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Get dashboard statistics
router.get('/dashboard/stats', authenticate, async (req, res) => {
  try {
    // Get total learners
    const learnersResult = await query('SELECT COUNT(*) FROM learners WHERE status = $1', ['active']);
    const totalLearners = parseInt(learnersResult.rows[0].count);

    // Get total classes
    const classesResult = await query('SELECT COUNT(*) FROM classes');
    const totalClasses = parseInt(classesResult.rows[0].count);

    // Get total teachers
    const teachersResult = await query('SELECT COUNT(*) FROM users WHERE role = $1 AND is_active = TRUE', ['teacher']);
    const totalTeachers = parseInt(teachersResult.rows[0].count);

    // Get current academic year
    const academicYearResult = await query('SELECT year_name FROM academic_years WHERE is_current = TRUE LIMIT 1');
    const currentAcademicYear = academicYearResult.rows[0]?.year_name || 'N/A';

    // Get current term
    const termResult = await query(`
      SELECT t.term_number 
      FROM terms t
      JOIN academic_years ay ON t.academic_year_id = ay.id
      WHERE ay.is_current = TRUE AND t.is_current = TRUE
      LIMIT 1
    `);
    const currentTerm = termResult.rows[0]?.term_number || 1;

    // Get recent enrollments (last 30 days)
    const enrollmentsResult = await query(`
      SELECT COUNT(*) FROM learner_enrollments 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const recentEnrollments = parseInt(enrollmentsResult.rows[0].count);

    // Calculate assessment completion (mock for now)
    const assessmentCompletion = 85;

    res.json({
      success: true,
      data: {
        totalLearners,
        totalClasses,
        totalTeachers,
        assessmentCompletion,
        currentAcademicYear,
        currentTerm: `Term ${currentTerm}`,
        recentEnrollments,
        pendingAssessments: 0 // Will implement later
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

module.exports = router;
/* added items stops here*/
router.get('/', (req, res) => {
  res.status(200).json({ 
    success: true,
    message: 'system routes - implementation pending' 
  });
});

module.exports = router;
