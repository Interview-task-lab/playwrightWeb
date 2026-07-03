/**
 * RunConfiguration Repository
 *
 * Encapsulates database access for run_configurations and run_configuration_test_cases tables.
 */

const { pool } = require('../config/database');

class RunConfigurationRepository {
  /**
   * Inserts a new run configuration and returns the created record.
   * @param {{ name: string, type: 'custom'|'domain', domainId: number, createdBy: number|null }} dto
   * @returns {Promise<object>}
   */
  async create({ name, type, domainIds, createdBy }) {
    const result = await pool.query(
      `INSERT INTO run_configurations (name, type, domain_ids, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, type, domainIds, createdBy]
    );
    return result.rows[0];
  }

  /**
   * Associates test cases with a run configuration.
   * @param {number} configId
   * @param {number[]} testCaseIds
   * @returns {Promise<void>}
   */
  async addTestCases(configId, testCaseIds) {
    if (!testCaseIds || testCaseIds.length === 0) return;

    const values = [];
    const valuePlaceholders = [];
    
    testCaseIds.forEach((tcId, idx) => {
      values.push(configId, tcId);
      const baseIdx = idx * 2;
      valuePlaceholders.push(`($${baseIdx + 1}, $${baseIdx + 2})`);
    });

    const query = `
      INSERT INTO run_configuration_test_cases (run_configuration_id, test_case_id)
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    await pool.query(query, values);
  }

  /**
   * Returns all run configurations, optionally filtered by domain IDs.
   * @param {number[]|null} domainIds
   * @returns {Promise<object[]>}
   */
  async findAll(domainIds = null) {
    let query = `
      SELECT rc.*, 
             (SELECT STRING_AGG(name, ', ') FROM domains WHERE id = ANY(rc.domain_ids)) as domain_names,
             u.username as creator_username
      FROM run_configurations rc
      LEFT JOIN users u ON rc.created_by = u.id
    `;
    const params = [];

    if (domainIds && domainIds.length > 0) {
      query += ` WHERE rc.domain_ids <@ $1`;
      params.push(domainIds);
    }

    query += ` ORDER BY rc.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Returns a single run configuration by ID.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT rc.*, 
              (SELECT STRING_AGG(name, ', ') FROM domains WHERE id = ANY(rc.domain_ids)) as domain_names,
              u.username as creator_username
       FROM run_configurations rc
       LEFT JOIN users u ON rc.created_by = u.id
       WHERE rc.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Retrieves all test cases associated with a run configuration.
   * @param {number} configId
   * @returns {Promise<object[]>}
   */
  async findTestCasesByConfigId(configId) {
    const result = await pool.query(
      `SELECT tc.*, d.name as domain_name
       FROM test_cases tc
       INNER JOIN run_configuration_test_cases rctc ON tc.id = rctc.test_case_id
       LEFT JOIN domains d ON tc.domain_id = d.id
       WHERE rctc.run_configuration_id = $1
       ORDER BY tc.created_at DESC`,
      [configId]
    );
    return result.rows;
  }

  /**
   * Updates the last run report URL of a run configuration.
   * @param {number} configId
   * @param {string|null} lastReportUrl
   * @returns {Promise<void>}
   */
  async updateLastReportUrl(configId, lastReportUrl) {
    await pool.query(
      `UPDATE run_configurations 
       SET last_report_url = $1 
       WHERE id = $2`,
      [lastReportUrl, configId]
    );
  }

  /**
   * Deletes a run configuration by ID.
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteById(id) {
    await pool.query('DELETE FROM run_configurations WHERE id = $1', [id]);
  }
}

module.exports = new RunConfigurationRepository();
