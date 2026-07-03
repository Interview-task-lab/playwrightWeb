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
    // 1. Create domains table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // Ensure parent_id reference column exists in domains
    await pool.query(`
      ALTER TABLE domains
        ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES domains(id) ON DELETE CASCADE;
    `);

    // 2. Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(100) UNIQUE NOT NULL,
        first_name    VARCHAR(100) NOT NULL,
        last_name     VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role          VARCHAR(50)  NOT NULL DEFAULT 'qa',
        domain_id     INTEGER      REFERENCES domains(id) ON DELETE SET NULL,
        is_active     BOOLEAN      DEFAULT true,
        created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create or update test_cases table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        url         TEXT,
        platform    VARCHAR(10) NOT NULL DEFAULT 'web',
        code        TEXT NOT NULL,
        steps       JSONB NOT NULL,
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Rename/Cleanup language column and configure platform column
    await pool.query(`
      DO $$
      BEGIN
        -- If language exists and platform does not, rename it
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='test_cases' AND column_name='language'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='test_cases' AND column_name='platform'
        ) THEN
          ALTER TABLE test_cases RENAME COLUMN language TO platform;
        END IF;

        -- Ensure platform column has the correct type and default
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='test_cases' AND column_name='platform'
        ) THEN
          ALTER TABLE test_cases ALTER COLUMN platform SET DEFAULT 'web';
          UPDATE test_cases SET platform = 'web' WHERE platform IS NULL;
          ALTER TABLE test_cases ALTER COLUMN platform TYPE VARCHAR(10);
          ALTER TABLE test_cases ALTER COLUMN platform SET NOT NULL;
        END IF;

        -- Drop language column if it still exists (since platform is now used)
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='test_cases' AND column_name='language'
        ) THEN
          ALTER TABLE test_cases DROP COLUMN language;
        END IF;
      END $$;
    `);

    // Ensure columns for user/domain references exist in test_cases
    await pool.query(`
      ALTER TABLE test_cases 
        ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL;
    `);

    console.log('✅ Database connected & schema initialization completed.');
  } catch (err) {
    console.error('⚠️  Could not connect to PostgreSQL or execute schema initialization.');
    console.error('   Run "docker-compose up -d" to start the database container.');
    console.error('   Error:', err.message);
  }
}

module.exports = { pool, initDatabase };
