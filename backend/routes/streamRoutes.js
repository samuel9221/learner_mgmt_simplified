const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { academic_year_id } = req.query;
    const params = [];
    let whereClause = '';

    if (academic_year_id) {
      params.push(academic_year_id);
      whereClause = 'WHERE c.academic_year_id = $1';
    }

    const result = await query(
      `SELECT
        s.id,
        s.stream_name,
        s.class_id,
        s.stream_teacher_id,
        c.class_name,
        c.academic_year_id,
        ay.year_name,
        u.first_name AS stream_teacher_first_name,
        u.last_name AS stream_teacher_last_name
       FROM streams s
       JOIN classes c ON s.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       LEFT JOIN users u ON s.stream_teacher_id = u.id
       ${whereClause}
       ORDER BY c.class_name, s.stream_name`,
      params
    );

    res.status(200).json({
      success: true,
      message: 'Streams retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve streams',
      error: error.message,
    });
  }
});

module.exports = router;
