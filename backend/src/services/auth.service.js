/**
 * Auth Service
 *
 * Implements logic for authenticating users, validating passwords,
 * and signing/verifying JWT tokens.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config/app.config');
const userRepository = require('../repositories/user.repository');

class AuthService {
  /**
   * Authenticates a user by username and password.
   * Generates and returns a JWT token on success.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{ token: string, user: object }>}
   */
  async login(username, password) {
    if (!username || !password) {
      const err = new Error('Username and password are required.');
      err.statusCode = 400;
      throw err;
    }

    const user = await userRepository.findByUsername(username.trim());
    if (!user) {
      const err = new Error('Invalid username or password.');
      err.statusCode = 401;
      throw err;
    }

    // Verify status
    if (!user.is_active) {
      const err = new Error('This user account has been deactivated.');
      err.statusCode = 403;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid username or password.');
      err.statusCode = 401;
      throw err;
    }

    // Sign JWT
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      domainId: user.domain_id,
      domainName: user.domain_name
    };

    const token = jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
    });

    // Remove password hash from returned user object
    delete user.password_hash;

    return {
      token,
      user
    };
  }

  /**
   * Verifies and decodes a JWT token.
   * @param {string} token
   * @returns {object} - The decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.auth.jwtSecret);
    } catch (err) {
      const error = new Error('Invalid or expired token.');
      error.statusCode = 401;
      throw error;
    }
  }
}

module.exports = new AuthService();
