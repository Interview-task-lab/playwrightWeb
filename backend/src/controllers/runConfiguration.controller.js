/**
 * RunConfiguration Controller
 *
 * Exposes API endpoints for managing and executing run configurations.
 */

const runConfigurationService = require('../services/runConfiguration.service');
const runnerService = require('../services/runner.service');
const appConfig = require('../config/app.config');
const fs = require('fs');

async function createConfig(req, res, next) {
  try {
    const { name, type, domainIds, testCaseIds } = req.body;
    const createdBy = req.user.userId;

    const config = await runConfigurationService.createConfig({
      name,
      type,
      domainIds,
      testCaseIds,
      createdBy,
    });

    return res.status(201).json({
      success: true,
      message: 'Run configuration created successfully.',
      config,
    });
  } catch (err) {
    if (err.message.includes('required') || err.message.includes('must be') || err.message.includes('not found') || err.message.includes('hierarchy')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
}

async function getConfigs(req, res, next) {
  try {
    const configs = await runConfigurationService.getConfigsForUser(req.user);
    return res.json({
      success: true,
      configs,
    });
  } catch (err) {
    return next(err);
  }
}

async function runConfig(req, res, next) {
  try {
    const userId = req.user.userId;
    const configId = parseInt(req.params.id, 10);

    if (runnerService.isBusy(userId)) {
      return res.status(409).json({
        success: false,
        message: 'A test run is already active. Please wait for it to finish.',
      });
    }

    const configObj = await runConfigurationService.getConfigById(configId);
    if (!configObj) {
      return res.status(404).json({
        success: false,
        message: 'Run configuration not found.',
      });
    }

    const testCases = await runConfigurationService.getTestCasesForConfig(configId);
    if (!testCases || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No test cases found in this configuration/domain to run.',
      });
    }

    // Determine target/base URL
    let baseUrl = appConfig.recording.defaultUrl;
    if (fs.existsSync(appConfig.paths.config)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(appConfig.paths.config, 'utf-8'));
        baseUrl = cfg.targetUrl || baseUrl;
      } catch (_) { /* use default */ }
    }

    const result = runnerService.runMultiple(userId, configObj, testCases, baseUrl);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function deleteConfig(req, res, next) {
  try {
    const configId = parseInt(req.params.id, 10);
    await runConfigurationService.deleteConfig(configId);

    return res.json({
      success: true,
      message: 'Run configuration deleted successfully.',
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return next(err);
  }
}

async function getTestsForConfig(req, res, next) {
  try {
    const configId = parseInt(req.params.id, 10);
    const testCases = await runConfigurationService.getTestCasesForConfig(configId);
    return res.json({
      success: true,
      testCases,
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return next(err);
  }
}

module.exports = {
  createConfig,
  getConfigs,
  runConfig,
  deleteConfig,
  getTestsForConfig,
};

