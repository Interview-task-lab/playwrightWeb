/**
 * Runner Controller
 * Handles test execution endpoints:
 *   POST /api/test-cases/:id/run
 *   GET  /api/test-cases/run-status
 */

const runnerService = require('../services/runner.service');
const testCaseService = require('../services/testCase.service');
const config = require('../config/app.config');
const fs = require('fs');

async function runTestCase(req, res, next) {
  try {
    if (runnerService.isBusy) {
      return res.status(409).json({
        success: false,
        message: 'A test is already running. Please wait for it to finish.',
      });
    }

    const id = parseInt(req.params.id, 10);
    const testCase = await testCaseService.getById(id);

    // Read base URL from config.json as fallback
    let baseUrl = config.recording.defaultUrl;
    if (fs.existsSync(config.paths.config)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(config.paths.config, 'utf-8'));
        baseUrl = cfg.targetUrl || baseUrl;
      } catch (_) { /* use default */ }
    }

    const result = runnerService.run(testCase, baseUrl);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

function getRunStatus(req, res, next) {
  try {
    const status = runnerService.getStatus();
    return res.json(status);
  } catch (err) {
    return next(err);
  }
}

module.exports = { runTestCase, getRunStatus };
