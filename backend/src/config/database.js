/**
 * PostgreSQL connection pool.
 * Single shared pool instance across the entire application.
 * Follows the Singleton pattern — import this wherever DB access is needed.
 */

const { Pool } = require('pg');
const config = require('./app.config');

const pool = new Pool(config.database);

/**
 * Initializes the database by ensuring the required schema exists.
 * Should be called once during application startup.
 * @returns {Promise<void>}
 */
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        url         TEXT,
        language    VARCHAR(50) NOT NULL,
        code        TEXT NOT NULL,
        steps       JSONB NOT NULL,
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Database connected & test_cases table ready.');
  } catch (err) {
    console.error('⚠️  Could not connect to PostgreSQL. Test saving will be unavailable.');
    console.error('   Run "docker-compose up -d" to start the database container.');
    console.error('   Error:', err.message);
  }
}

module.exports = { pool, initDatabase };
