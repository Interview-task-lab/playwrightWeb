/**
 * TestCase Service
 *
 * Implements all business logic related to test cases.
 * Depends on the repository for persistence and codeParser for transformations.
 * Controllers should ONLY call this service — never the repository directly.
 */

const testCaseRepository = require('../repositories/testCase.repository');
const domainRepository = require('../repositories/domain.repository');
const codeParser = require('./codeParser.service');

class TestCaseService {
  /**
   * Creates and persists a new test case.
   * Automatically uncomments Codegen assertions and regenerates steps if needed.
   * @param {{ name: string, url?: string, platform?: string, code: string, steps?: object[], createdBy: number|null, domainId: number|null }} dto
   * @returns {Promise<object>}
   */
  async create({ name, url, platform, code, steps, createdBy, domainId }) {
    if (!name || !code) {
      const err = new Error('Name and code are required.');
      err.statusCode = 400;
      throw err;
    }

    // Un-comment code block assertions to make recorded scripts executable
    const cleanCode = codeParser.uncommentAssertions(code);

    const finalSteps = steps?.length
      ? steps
      : codeParser.parseCodeToSteps(cleanCode, 'javascript');

    return testCaseRepository.create({
      name,
      url,
      platform: platform || 'web',
      code: cleanCode,
      steps: finalSteps,
      createdBy,
      domainId
    });
  }

  /**
   * Returns all test cases, setting a dynamic readOnly flag based on the user's domain.
   * @param {object} user - Authenticated user details
   * @param {number|null} domainId
   * @returns {Promise<object[]>}
   */
  async getAll(user, domainId = null) {
    const testCases = await testCaseRepository.findAll(domainId);

    let allowedDomainIds = new Set();
    if (user.role !== 'admin' && user.role !== 'qa' && user.domainId) {
      const ids = await domainRepository.getDescendantOrSelfIds(user.domainId);
      allowedDomainIds = new Set(ids);
    }

    return testCases.map((tc) => {
      let readOnly = false;
      if (user.role !== 'admin' && user.role !== 'qa') {
        readOnly = !allowedDomainIds.has(tc.domain_id);
      }
      return { ...tc, readOnly };
    });
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
