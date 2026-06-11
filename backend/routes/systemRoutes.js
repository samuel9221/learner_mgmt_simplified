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

// Get system configuration
router.get('/config', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT config_key, config_value FROM system_config
    `);

    const config = {};
    result.rows.forEach(row => {
      config[row.config_key] = row.config_value;
    });

    res.json({
      success: true,
      data: {
        schoolName: config.school_name || '',
        schoolAddress: config.school_address || '',
        schoolPhone: config.school_phone || '',
        schoolEmail: config.school_email || '',
        schoolMotto: config.school_motto || '',
      }
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system configuration'
    });
  }
});

// Update system configuration
router.put('/config', authenticate, async (req, res) => {
  try {
    const { schoolName, schoolAddress, schoolPhone, schoolEmail, schoolMotto } = req.body;

    // Upsert configuration values
    const configUpdates = [
      { key: 'school_name', value: schoolName },
      { key: 'school_address', value: schoolAddress },
      { key: 'school_phone', value: schoolPhone },
      { key: 'school_email', value: schoolEmail },
      { key: 'school_motto', value: schoolMotto },
    ];

    for (const { key, value } of configUpdates) {
      await query(
        `INSERT INTO system_config (config_key, config_value) 
         VALUES ($1, $2)
         ON CONFLICT (config_key) DO UPDATE SET config_value = $2`,
        [key, value]
      );
    }

    res.json({
      success: true,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system configuration'
    });
  }
});

// Export database as JSON
router.post('/export', authenticate, async (req, res) => {
  try {
    // Fetch all major tables
    const [learners, classes, streams, subjects, users, terms, academicYears, grading_scales, finalResults] = await Promise.all([
      query('SELECT * FROM learners LIMIT 5000'),
      query('SELECT * FROM classes'),
      query('SELECT * FROM streams'),
      query('SELECT * FROM subjects'),
      query('SELECT * FROM users'),
      query('SELECT * FROM terms'),
      query('SELECT * FROM academic_years'),
      query('SELECT * FROM grading_scales'),
      query('SELECT * FROM final_results LIMIT 10000'),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      learners: learners.rows,
      classes: classes.rows,
      streams: streams.rows,
      subjects: subjects.rows,
      users: users.rows,
      terms: terms.rows,
      academicYears: academicYears.rows,
      gradingScales: grading_scales.rows,
      finalResults: finalResults.rows,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="lms_export_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data'
    });
  }
});

// Backup database using node-postgres (cross-platform)
router.post('/backup', authenticate, async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupFile = `lms_backup_${timestamp}.sql`;

    // Get all table names
    const tablesResult = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    let sqlBackup = `-- Database Backup for LMS
-- Generated: ${new Date().toISOString()}
-- This backup contains all tables and data

SET client_encoding = 'UTF8';

`;

    // Backup each table
    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.table_name;

      // Get table schema
      const schemaResult = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      // Create table statement
      sqlBackup += `\n-- Table: ${tableName}\nDROP TABLE IF EXISTS ${tableName} CASCADE;\nCREATE TABLE ${tableName} (\n`;
      
      schemaResult.rows.forEach((col, idx) => {
        sqlBackup += `  ${col.column_name} ${col.data_type}`;
        if (col.is_nullable === 'NO') sqlBackup += ' NOT NULL';
        if (col.column_default) sqlBackup += ` DEFAULT ${col.column_default}`;
        if (idx < schemaResult.rows.length - 1) sqlBackup += ',';
        sqlBackup += '\n';
      });

      sqlBackup += `);\n`;

      // Backup data
      const dataResult = await query(`SELECT * FROM ${tableName}`);
      if (dataResult.rows.length > 0) {
        const columns = Object.keys(dataResult.rows[0]);
        sqlBackup += `\nINSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;
        
        const values = dataResult.rows.map(row => {
          const vals = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (typeof val === 'boolean') return val ? 'true' : 'false';
            if (val instanceof Date) return `'${val.toISOString()}'`;
            return val;
          }).join(', ');
          return `(${vals})`;
        }).join(',\n');
        
        sqlBackup += values + ';\n';
      }
    }

    const blob = new Blob([sqlBackup], { type: 'text/plain' });
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${backupFile}"`);
    res.setHeader('Content-Length', Buffer.byteLength(sqlBackup));
    res.end(sqlBackup);
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to backup database'
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
