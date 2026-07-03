/**
 * User Repository
 *
 * Encapsulates all database access for the `users` table.
 * Follows the Repository Pattern.
 */

const { pool } = require('../config/database');

class UserRepository {
  /**
   * Inserts a new user and returns the created record.
   * @param {{ username: string, firstName: string, lastName: string, passwordHash: string, role: string, domainId: number|null }} user
   * @returns {Promise<object>}
   */
  async create({ username, firstName, lastName, passwordHash, role, domainId }) {
    const result = await pool.query(
      `INSERT INTO users (username, first_name, last_name, password_hash, role, domain_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, first_name, last_name, role, domain_id, is_active, created_at`,
      [username, firstName, lastName, passwordHash, role, domainId]
    );
    return result.rows[0];
  }

  /**
   * Finds a user by username.
   * @param {string} username
   * @returns {Promise<object|null>}
   */
  async findByUsername(username) {
    const result = await pool.query(
      `SELECT u.*, d.name as domain_name
       FROM users u
       LEFT JOIN domains d ON u.domain_id = d.id
       WHERE u.username = $1`,
      [username]
    );
    return result.rows[0] || null;
  }

  /**
   * Finds a user by ID.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT id, username, first_name, last_name, role, domain_id, is_active, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Checks if a username already exists.
   * @param {string} username
   * @returns {Promise<boolean>}
   */
  async usernameExists(username) {
    const result = await pool.query(
      'SELECT 1 FROM users WHERE username = $1',
      [username]
    );
    return result.rowCount > 0;
  }

  /**
   * Returns all users (excluding password hash) ordered by created_at.
   * @returns {Promise<object[]>}
   */
  async findAll() {
    const result = await pool.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.role, u.domain_id, d.name as domain_name, u.is_active, u.created_at
       FROM users u
       LEFT JOIN domains d ON u.domain_id = d.id
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  }
}

module.exports = new UserRepository();
