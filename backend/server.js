// ============================================================================
// SERVER.JS - Main Application Entry Point
// Uganda NLSC School Management System Backend
// ============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { testConnection, closePool } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/academic-years', require('./routes/academicYearRoutes'));
app.use('/api/terms', require('./routes/termRoutes'));
app.use('/api/classes', require('./routes/classRoutes'));
app.use('/api/streams', require('./routes/streamRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/learners', require('./routes/learnerRoutes'));
app.use('/api/assessments', require('./routes/assessmentRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/system', require('./routes/systemRoutes'));

// Routes added for combinations
app.use('/api/subject-stream-teachers', require('./routes/subjectStreamTeacherRoutes'));
app.use('/api/subject-combinations', require('./routes/subjectCombinationRoutes')); // Add this

// Added Routes 1
app.use('/api/classes', require('./routes/classRoutes'));  // Add this line

//More routes
app.use('/api/subject-stream-teachers', require('./routes/subjectStreamTeacherRoutes')); // Add this

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }
    
    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║   Uganda NLSC School Management System                         ║
║   Backend Server Started Successfully                          ║
║                                                                ║
║   Port:        ${PORT}                                              ║
║   Database:    Connected Successfully!                         ║
╚════════════════════════════════════════════════════════════════╝
      `);
    });
    
    // Graceful shutdown
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