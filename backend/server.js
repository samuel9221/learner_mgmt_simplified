// ============================================================================
// SERVER.JS - Main Application Entry Point
// Uganda NLSC School Management System Backend
// ============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { testConnection, closePool } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const ensureExamTables = require('./utils/ensureExamTables');
const path = require('path'); //added for automatic serving of static files

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// ── Core routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',             require('./routes/authRoutes'));
app.use('/api/users',            require('./routes/userRoutes'));
app.use('/api/academic-years',   require('./routes/academicYearRoutes'));
app.use('/api/terms',            require('./routes/termRoutes'));
app.use('/api/classes',          require('./routes/classRoutes'));
app.use('/api/streams',          require('./routes/streamRoutes'));
app.use('/api/subjects',         require('./routes/subjectRoutes'));
app.use('/api/learners',         require('./routes/learnerRoutes'));
app.use('/api/analytics',        require('./routes/analyticsRoutes'));
app.use('/api/system',           require('./routes/systemRoutes'));

// Subject extras
app.use('/api/subject-stream-teachers', require('./routes/subjectStreamTeacherRoutes'));
app.use('/api/subject-combinations',    require('./routes/subjectCombinationRoutes'));

// ── Exam system routes ────────────────────────────────────────────────────────
app.use('/api/grading-scales', require('./routes/gradingScales.routes'));
app.use('/api/exam-sessions',  require('./routes/examSessions.routes'));
app.use('/api/exam-results',   require('./routes/examResults.routes'));
app.use('/api/final-results',  require('./routes/finalResults.routes'));
app.use('/api/analysis',       require('./routes/analysis.routes'));

app.use('/api/reports', require('./routes/reports.routes'));

//added for automatic serving of static files
/* Serve React/Vite frontend */
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// React catch-all route
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(
    path.join(__dirname, '../frontend/dist/index.html')
  );
});
// code for auto start ends here

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    await ensureExamTables();
    console.log('✅ Exam tables verified');

    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║   School Management System                                     ║
║   Backend Server Started Successfully                          ║
║                                                                ║
║   Port:        ${PORT}                                           ║
║   Database:    Connected Successfully!                         ║
╚════════════════════════════════════════════════════════════════╝
      `);
    });

    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Closing server...');
      server.close(async () => {
        await closePool();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;