/**
 * TestCase Repository
 *
 * Encapsulates all database access for the `test_cases` table.
 * No business logic lives here — only raw SQL queries.
 * Follows the Repository Pattern to decouple DB from service layer.
 */

const { pool } = require('../config/database');

class TestCaseRepository {
  /**
   * Inserts a new test case and returns the created record.
   * @param {{ name: string, url: string, language: string, code: string, steps: object[] }} dto
   * @returns {Promise<object>}
   */
  async create({ name, url, language, code, steps }) {
    const result = await pool.query(
      `INSERT INTO test_cases (name, url, language, code, steps)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, url || '', language || 'javascript', code, JSON.stringify(steps || [])]
    );
    return result.rows[0];
  }

  /**
   * Returns all test cases ordered by creation date descending.
   * @returns {Promise<object[]>}
   */
  async findAll() {
    const result = await pool.query(
      'SELECT * FROM test_cases ORDER BY created_at DESC'
    );
    return result.rows;
  }

  /**
   * Returns a single test case by ID, or null if not found.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM test_cases WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Deletes a test case by ID.
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteById(id) {
    await pool.query('DELETE FROM test_cases WHERE id = $1', [id]);
  }
}

module.exports = new TestCaseRepository();
