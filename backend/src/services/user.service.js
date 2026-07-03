/**
 * User Service
 *
 * Implements business logic for managing users.
 * Specifically handles transliterating Turkish characters, auto-generating
 * a unique username, and hashing default passwords using bcrypt.
 */

const bcrypt = require('bcrypt');
const userRepository = require('../repositories/user.repository');

class UserService {
  /**
   * Helper to convert Turkish characters to their English equivalents and lowercase the text.
   * @param {string} text
   * @returns {string}
   */
  _transliterate(text) {
    const map = {
      'ç': 'c', 'Ç': 'c',
      'ğ': 'g', 'Ğ': 'g',
      'ı': 'i', 'I': 'i', 'İ': 'i',
      'ö': 'o', 'Ö': 'o',
      'ş': 's', 'Ş': 's',
      'ü': 'u', 'Ü': 'u'
    };
    return text
      .replace(/[çÇğĞıIİöÖşŞüÜ]/g, match => map[match])
      .toLowerCase();
  }

  /**
   * Auto-generates a unique username based on first and last name.
   * Format: <first_letter_of_firstname><lastname> (lowercase, sanitized).
   * Appends incremental numbers if the username is already taken.
   * @param {string} firstName
   * @param {string} lastName
   * @returns {Promise<string>}
   */
  async _generateUniqueUsername(firstName, lastName) {
    const cleanFirst = this._transliterate(firstName.trim());
    const cleanLast = this._transliterate(lastName.trim());

    if (!cleanFirst || !cleanLast) {
      throw new Error('First name and last name must contain valid alphabetic characters.');
    }

    const firstLetter = cleanFirst.charAt(0);
    // Remove any non-alphanumeric characters
    const baseUsername = `${firstLetter}${cleanLast}`.replace(/[^a-z0-9]/g, '');

    if (!baseUsername) {
      throw new Error('Could not generate a valid username from first and last name.');
    }

    let username = baseUsername;
    let counter = 2;

    while (await userRepository.usernameExists(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  /**
   * Creates a new user with a hashed default password.
   * @param {{ firstName: string, lastName: string, role: string, domainId: number|null }} dto
   * @returns {Promise<object>} - The created user record (excluding password hash)
   */
  async create({ firstName, lastName, role, domainId }) {
    if (!firstName || !lastName || !role) {
      const err = new Error('First name, last name, and role are required.');
      err.statusCode = 400;
      throw err;
    }

    const username = await this._generateUniqueUsername(firstName, lastName);

    const saltRounds = 10;
    const defaultPassword = '123456';
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    return userRepository.create({
      username,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      passwordHash,
      role,
      domainId: domainId || null
    });
  }

  /**
   * Retrieves all users.
   * @returns {Promise<object[]>}
   */
  async getAll() {
    return userRepository.findAll();
  }

  /**
   * Retrieves a single user by ID.
   * @param {number} id
   * @returns {Promise<object>}
   */
  async getById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }
}

module.exports = new UserService();
