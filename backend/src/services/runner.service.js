/**
 * Runner Service
 *
 * Manages per-user `npx playwright test` executions to prevent file and port conflicts.
 * Follows the Session Manager pattern.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/app.config');
const codeParser = require('./codeParser.service');

/** @typedef {'idle'|'running'|'completed'|'error'} RunnerState */

class RunnerService {
  constructor() {
    this._sessions = new Map(); // userId -> session object
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Whether a user is currently executing a test.
   * @param {number} userId
   * @returns {boolean}
   */
  isBusy(userId) {
    const session = this._sessions.get(userId);
    return session ? session.process !== null : false;
  }

  /**
   * Starts running a test case for a specific user.
   * @param {number} userId
   * @param {{ id: number, name: string, code: string, platform: string, url: string }} testCase
   * @param {string} baseUrl - Fallback base URL from app config
   * @returns {{ success: boolean, message: string }}
   */
  run(userId, testCase, baseUrl) {
    if (this.isBusy(userId)) {
      return {
        success: false,
        message: 'A test is already running. Please wait for it to finish.',
      };
    }

    const { id, name, code, platform, url } = testCase;

    if (platform !== 'web') {
      return {
        success: false,
        message: `Running ${platform} tests is not supported yet. Only Web tests can be run.`,
      };
    }

    const sessionUuid = uuidv4();
    const reportDirName = `test-${id}-${userId}-${sessionUuid}`;
    const reportDir = path.join(config.paths.reports, reportDirName);

    // Ensure reports directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const testCode = codeParser.convertToPlaywrightTest(code, name);
    const testFile = path.join(config.paths.root, `run_test_${userId}_${sessionUuid}.spec.js`);
    fs.writeFileSync(testFile, testCode, 'utf-8');

    // Create unique playwright config
    const reportDirEscaped = reportDir.replace(/\\/g, '/');
    const configFile = path.join(config.paths.root, `playwright_run_${userId}_${sessionUuid}.config.js`);
    const configContent = `const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  reporter: [['html', { outputFolder: '${reportDirEscaped}', open: 'never' }]],
  use: {
    headless: false,
    baseURL: '${url || baseUrl}',
  },
});
`;
    fs.writeFileSync(configFile, configContent, 'utf-8');

    console.log(`▶️  [User #${userId}] Running test #${id}: "${name}"`);

    const args = ['playwright', 'test', testFile, `--config=${configFile}`];
    const process = spawn('npx', args, {
      cwd: config.paths.root,
      stdio: 'pipe',
      shell: true,
    });

    const session = {
      process,
      state: 'running',
      testId: id,
      output: '',
      reportPath: `/reports/${reportDirName}/index.html`,
      testFile,
      configFile
    };

    this._sessions.set(userId, session);

    process.stdout.on('data', (d) => {
      const text = d.toString();
      session.output += text;
      console.log(`[User #${userId} test stdout] ${text.trim()}`);
    });
    process.stderr.on('data', (d) => {
      const text = d.toString();
      session.output += text;
      console.log(`[User #${userId} test stderr] ${text.trim()}`);
    });
    process.on('error', (err) => {
      console.error(`❌ [User #${userId}] Test runner error:`, err.message);
      session.state = 'error';
      session.output += `\nError: ${err.message}`;
      session.process = null;
    });
    process.on('close', (code) => {
      console.log(`🏁 [User #${userId}] Test #${id} finished with exit code ${code}`);
      session.state = code === 0 ? 'completed' : 'error';
      session.process = null;
      this._safeDelete(testFile);
      this._safeDelete(configFile);
    });

    return {
      success: true,
      message: `Test "${name}" is now running...`,
    };
  }
  /**
   * Starts running a set of test cases (run configuration) for a user.
   * @param {number} userId
   * @param {{ id: number, name: string }} runConfig
   * @param {Array<{ id: number, name: string, code: string, platform: string, url: string }>} testCases
   * @param {string} baseUrl
   * @returns {{ success: boolean, message: string }}
   */
  runMultiple(userId, runConfig, testCases, baseUrl) {
    if (this.isBusy(userId)) {
      return {
        success: false,
        message: 'A test run is already active. Please wait for it to finish.',
      };
    }

    if (testCases.some(tc => tc.platform !== 'web')) {
      return {
        success: false,
        message: 'Running non-web tests is not supported yet. Only Web tests can be run.',
      };
    }

    const sessionUuid = uuidv4();
    const reportDirName = `run-config-${runConfig.id}`;
    const reportDir = path.join(config.paths.reports, reportDirName);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Create temp directory for spec files
    const runDirName = `run_dir_${userId}_${sessionUuid}`;
    const runDir = path.join(config.paths.root, runDirName);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    // Write all spec files
    testCases.forEach((tc) => {
      const testCode = codeParser.convertToPlaywrightTest(tc.code, tc.name);
      const tcFile = path.join(runDir, `test_${tc.id}.spec.js`);
      fs.writeFileSync(tcFile, testCode, 'utf-8');
    });

    const reportDirEscaped = reportDir.replace(/\\/g, '/');
    const configFile = path.join(config.paths.root, `playwright_run_${userId}_${sessionUuid}.config.js`);
    const configContent = `const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  reporter: [['html', { outputFolder: '${reportDirEscaped}', open: 'never' }]],
  use: {
    headless: false,
    baseURL: '${baseUrl}',
  },
});
`;
    fs.writeFileSync(configFile, configContent, 'utf-8');

    console.log(`▶️  [User #${userId}] Running config #${runConfig.id}: "${runConfig.name}" with ${testCases.length} tests`);

    const args = ['playwright', 'test', runDirName, `--config=${configFile}`];
    const process = spawn('npx', args, {
      cwd: config.paths.root,
      stdio: 'pipe',
      shell: true,
    });

    const session = {
      process,
      state: 'running',
      runConfigId: runConfig.id,
      isConfigRun: true,
      output: '',
      reportPath: `/reports/${reportDirName}/index.html`,
      runDir,
      configFile,
    };

    this._sessions.set(userId, session);

    process.stdout.on('data', (d) => {
      const text = d.toString();
      session.output += text;
      console.log(`[User #${userId} config stdout] ${text.trim()}`);
    });
    process.stderr.on('data', (d) => {
      const text = d.toString();
      session.output += text;
      console.log(`[User #${userId} config stderr] ${text.trim()}`);
    });
    process.on('error', (err) => {
      console.error(`❌ [User #${userId}] Run config error:`, err.message);
      session.state = 'error';
      session.output += `\nError: ${err.message}`;
      session.process = null;
    });
    process.on('close', async (code) => {
      console.log(`🏁 [User #${userId}] Run config #${runConfig.id} finished with exit code ${code}`);
      session.state = code === 0 ? 'completed' : 'error';
      session.process = null;
      
      // Save last_report_url to DB when finished (completed or error)
      if (session.state === 'completed' || session.state === 'error') {
        try {
          const runConfigRepository = require('../repositories/runConfiguration.repository');
          await runConfigRepository.updateLastReportUrl(runConfig.id, session.reportPath);
          console.log(`💾 Saved last_report_url for config #${runConfig.id}: ${session.reportPath}`);
        } catch (dbErr) {
          console.error(`Failed to save report URL for config #${runConfig.id} to DB:`, dbErr.message);
        }
      }

      try {
        fs.rmSync(runDir, { recursive: true, force: true });
      } catch (err) {
        console.error('Failed to remove temp run directory:', err.message);
      }
      this._safeDelete(configFile);
    });

    return {
      success: true,
      message: `Run configuration "${runConfig.name}" is now executing...`,
    };
  }

  /**
   * Returns the current runner status for a user and cleans it up if finished.
   * @param {number} userId
   * @returns {{ status: RunnerState, testId?: number, runConfigId?: number, isConfigRun?: boolean, reportUrl?: string, output?: string }}
   */
  getStatus(userId) {
    const session = this._sessions.get(userId);

    if (!session) return { status: 'idle' };

    if (session.state === 'running') {
      return {
        status: 'running',
        testId: session.testId,
        runConfigId: session.runConfigId,
        isConfigRun: session.isConfigRun,
      };
    }

    // completed or error - extract status then remove session
    const result = {
      status: session.state,
      testId: session.testId,
      runConfigId: session.runConfigId,
      isConfigRun: session.isConfigRun,
      reportUrl: session.reportPath,
      output: session.output,
    };

    this._sessions.delete(userId);

    return result;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _safeDelete(filePath) {
    try { fs.unlinkSync(filePath); } catch (_) { /* intentionally ignored */ }
  }
}

module.exports = new RunnerService();
