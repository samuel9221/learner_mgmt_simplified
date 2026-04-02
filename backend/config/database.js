// ============================================================================
// DATABASE CONFIGURATION
// PostgreSQL connection pool and query utilities
// ============================================================================

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'school_mgmt_system',
  user: process.env.DB_USER || 'localhost',
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Pool error handling
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

// Query wrapper with error handling and logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn('⚠️  Slow query detected', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Database query error:', { text, error: error.message });
    throw error;
  }
};

// Transaction wrapper
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Get current academic year
const getCurrentAcademicYear = async () => {
  const text = 'SELECT * FROM academic_years WHERE is_current = TRUE LIMIT 1';
  const result = await query(text);
  return result.rows[0];
};

// Get current term
const getCurrentTerm = async () => {
  const text = `
    SELECT t.* FROM terms t
    JOIN academic_years ay ON t.academic_year_id = ay.id
    WHERE ay.is_current = TRUE AND t.is_current = TRUE
    LIMIT 1
  `;
  const result = await query(text);
  return result.rows[0];
};

// Close pool (for graceful shutdown)
const closePool = async () => {
  await pool.end();
  console.log('Database pool has ended');
};

// Export database utilities
module.exports = {
  pool,
  query,
  transaction,
  getCurrentAcademicYear,
  getCurrentTerm,
  testConnection,
  closePool,
};