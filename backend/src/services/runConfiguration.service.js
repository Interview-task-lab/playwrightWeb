/**
 * RunConfiguration Service
 *
 * Coordinates business logic for creating, retrieving, and validating run configurations.
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/app.config');
const runConfigurationRepository = require('../repositories/runConfiguration.repository');
const domainRepository = require('../repositories/domain.repository');
const testCaseRepository = require('../repositories/testCase.repository');

class RunConfigurationService {
  /**
   * Creates a new run configuration.
   * @param {{ name: string, type: 'custom'|'domain', domainId: number, testCaseIds?: number[], createdBy: number|null }} dto
   * @returns {Promise<object>}
   */
  async createConfig({ name, type, domainIds, testCaseIds, createdBy }) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Configuration name is required.');
    }

    if (type !== 'custom' && type !== 'domain') {
      throw new Error('Type must be either "custom" or "domain".');
    }

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      throw new Error('At least one target domain is required.');
    }

    // Verify all domains exist
    for (const dId of domainIds) {
      const domain = await domainRepository.findById(dId);
      if (!domain) {
        throw new Error(`Target domain with ID ${dId} not found.`);
      }
    }

    // If custom, validate testCaseIds
    if (type === 'custom') {
      if (!testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
        throw new Error('At least one test case must be selected for custom configurations.');
      }

      // Check if all test cases exist and are within the allowed domains or sub-domains
      for (const tcId of testCaseIds) {
        const testCase = await testCaseRepository.findById(tcId);
        if (!testCase) {
          throw new Error(`Test case with ID ${tcId} not found.`);
        }
        
        // Ensure test case belongs to at least one of the selected domains or their descendants
        let isAllowed = false;
        for (const dId of domainIds) {
          const match = await domainRepository.isDescendantOrSelf(dId, testCase.domain_id);
          if (match) {
            isAllowed = true;
            break;
          }
        }

        if (!isAllowed) {
          throw new Error(`Test case "${testCase.name}" does not belong to any of the selected domain hierarchies.`);
        }
      }
    }

    // Create the run configuration
    const config = await runConfigurationRepository.create({ name: name.trim(), type, domainIds, createdBy });

    // Link test cases if type is custom
    if (type === 'custom' && testCaseIds && testCaseIds.length > 0) {
      await runConfigurationRepository.addTestCases(config.id, testCaseIds);
    }

    return config;
  }

  /**
   * Retrieves all configs authorized for a specific user.
   * @param {{ userId: number, role: string, domainId: number|null }} user
   * @returns {Promise<object[]>}
   */
  async getConfigsForUser(user) {
    if (user.role === 'admin' || user.role === 'qa') {
      // Full access
      return await runConfigurationRepository.findAll(null);
    }

    if (!user.domainId) {
      return [];
    }

    // Get all descendant domain IDs (including self)
    const domainIds = await domainRepository.getDescendantOrSelfIds(user.domainId);
    return await runConfigurationRepository.findAll(domainIds);
  }

  /**
   * Retrieves a run configuration by ID.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async getConfigById(id) {
    return await runConfigurationRepository.findById(id);
  }

  /**
   * Retrieves all test cases associated with a configuration.
   * @param {number} configId
   * @returns {Promise<object[]>}
   */
  async getTestCasesForConfig(configId) {
    const config = await runConfigurationRepository.findById(configId);
    if (!config) {
      throw new Error('Run configuration not found.');
    }

    if (config.type === 'domain') {
      // Find all sub-domains recursively for ALL domain_ids
      const allDescendantIds = new Set();
      for (const dId of config.domain_ids) {
        const descendantIds = await domainRepository.getDescendantOrSelfIds(dId);
        descendantIds.forEach(id => allDescendantIds.add(id));
      }
      return await testCaseRepository.findAllInDomains(Array.from(allDescendantIds));
    } else {
      // Custom test cases
      return await runConfigurationRepository.findTestCasesByConfigId(configId);
    }
  }

  /**
   * Deletes a run configuration.
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteConfig(id) {
    const configRecord = await runConfigurationRepository.findById(id);
    if (!configRecord) {
      throw new Error('Run configuration not found.');
    }

    // Delete the report folder from the filesystem if it exists
    const reportDirName = `run-config-${id}`;
    const reportDir = path.join(config.paths.reports, reportDirName);
    try {
      if (fs.existsSync(reportDir)) {
        fs.rmSync(reportDir, { recursive: true, force: true });
        console.log(`🗑️ Deleted report directory on configuration deletion: ${reportDir}`);
      }
    } catch (err) {
      console.error(`Failed to delete report directory on configuration deletion:`, err.message);
    }

    await runConfigurationRepository.deleteById(id);
  }
}

module.exports = new RunConfigurationService();
