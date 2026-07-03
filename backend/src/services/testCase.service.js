/**
 * TestCase Service
 *
 * Implements all business logic related to test cases.
 * Depends on the repository for persistence and codeParser for transformations.
 * Controllers should ONLY call this service — never the repository directly.
 */

const testCaseRepository = require('../repositories/testCase.repository');
const codeParser = require('./codeParser.service');

class TestCaseService {
  /**
   * Creates and persists a new test case.
   * Automatically uncomments Codegen assertions and regenerates steps if needed.
   * @param {{ name: string, url?: string, language?: string, code: string, steps?: object[] }} dto
   * @returns {Promise<object>} - The created test case record
   * @throws {Error} - If name or code is missing
   */
  async create({ name, url, language, code, steps }) {
    if (!name || !code) {
      const err = new Error('Name and code are required.');
      err.statusCode = 400;
      throw err;
    }

    // Ensure commented-out assertions from Codegen are active
    const cleanCode = codeParser.uncommentAssertions(code);

    // Regenerate steps if not provided or if they contain commented descriptions
    const needsSteps =
      !steps ||
      steps.length === 0 ||
      steps.some((s) => typeof s.description === 'string' && s.description.startsWith('//'));

    const finalSteps = needsSteps
      ? codeParser.parseCodeToSteps(cleanCode, language)
      : steps;

    return testCaseRepository.create({
      name,
      url,
      language,
      code: cleanCode,
      steps: finalSteps,
    });
  }

  /**
   * Returns all test cases.
   * @returns {Promise<object[]>}
   */
  async getAll() {
    return testCaseRepository.findAll();
  }

  /**
   * Returns a single test case by ID.
   * @param {number} id
   * @returns {Promise<object>}
   * @throws {Error} - If not found
   */
  async getById(id) {
    const testCase = await testCaseRepository.findById(id);
    if (!testCase) {
      const err = new Error('Test case not found.');
      err.statusCode = 404;
      throw err;
    }
    return testCase;
  }

  /**
   * Deletes a test case by ID.
   * @param {number} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    await testCaseRepository.deleteById(id);
  }
}

module.exports = new TestCaseService();
