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
   * @param {{ name: string, url: string, platform: string, code: string, steps: object[], createdBy: number|null, domainId: number|null }} dto
   * @returns {Promise<object>}
   */
  async create({ name, url, platform, code, steps, createdBy, domainId }) {
    const result = await pool.query(
      `INSERT INTO test_cases (name, url, platform, code, steps, created_by, domain_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, url || '', platform || 'web', code, JSON.stringify(steps || []), createdBy, domainId]
    );
    return result.rows[0];
  }

  /**
   * Returns all test cases, optionally filtered by domainId, ordered by creation date descending.
   * @param {number|null} domainId
   * @returns {Promise<object[]>}
   */
  async findAll(domainId = null) {
    let query = `
      SELECT tc.*, d.name as domain_name, u.username as creator_username
      FROM test_cases tc
      LEFT JOIN domains d ON tc.domain_id = d.id
      LEFT JOIN users u ON tc.created_by = u.id
    `;
    const params = [];

    if (domainId !== null) {
      query += ` WHERE tc.domain_id = $1`;
      params.push(domainId);
    }

    query += ` ORDER BY tc.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Returns a single test case by ID, or null if not found.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT tc.*, d.name as domain_name, u.username as creator_username
       FROM test_cases tc
       LEFT JOIN domains d ON tc.domain_id = d.id
       LEFT JOIN users u ON tc.created_by = u.id
       WHERE tc.id = $1`,
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
