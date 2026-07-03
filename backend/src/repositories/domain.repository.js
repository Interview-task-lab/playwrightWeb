/**
 * Domain Repository
 *
 * Encapsulates all database access for the `domains` table.
 * Follows the Repository Pattern.
 */

const { pool } = require('../config/database');

class DomainRepository {
  /**
   * Finds a domain by name.
   * @param {string} name
   * @returns {Promise<object|null>}
   */
  async findByName(name) {
    const result = await pool.query(
      'SELECT * FROM domains WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  }

  /**
   * Finds a domain by ID.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM domains WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Returns all domains.
   * @returns {Promise<object[]>}
   */
  async findAll() {
    const result = await pool.query(
      'SELECT * FROM domains ORDER BY parent_id NULLS FIRST, name ASC'
    );
    return result.rows;
  }

  /**
   * Checks recursively if a child domain is a descendant of (or equal to) a parent domain.
   * @param {number} parentDomainId
   * @param {number} childDomainId
   * @returns {Promise<boolean>}
   */
  async isDescendantOrSelf(parentDomainId, childDomainId) {
    if (parentDomainId === childDomainId) return true;
    if (!parentDomainId || !childDomainId) return false;

    const result = await pool.query(
      `WITH RECURSIVE subdomains AS (
         SELECT id FROM domains WHERE id = $1
         UNION
         SELECT d.id FROM domains d INNER JOIN subdomains s ON d.parent_id = s.id
       )
       SELECT EXISTS (SELECT 1 FROM subdomains WHERE id = $2)`,
      [parentDomainId, childDomainId]
    );
    return result.rows[0].exists;
  }

  /**
   * Retrieves all descendant domain IDs (including itself) for a parent domain.
   * @param {number} parentDomainId
   * @returns {Promise<number[]>}
   */
  async getDescendantOrSelfIds(parentDomainId) {
    if (!parentDomainId) return [];

    const result = await pool.query(
      `WITH RECURSIVE subdomains AS (
         SELECT id FROM domains WHERE id = $1
         UNION
         SELECT d.id FROM domains d INNER JOIN subdomains s ON d.parent_id = s.id
       )
       SELECT id FROM subdomains`,
      [parentDomainId]
    );
    return result.rows.map(r => r.id);
  }
}

module.exports = new DomainRepository();
