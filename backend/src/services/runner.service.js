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
   * Returns the current runner status for a user and cleans it up if finished.
   * @param {number} userId
   * @returns {{ status: RunnerState, testId?: number, reportUrl?: string, output?: string }}
   */
  getStatus(userId) {
    const session = this._sessions.get(userId);

    if (!session) return { status: 'idle' };

    if (session.state === 'running') {
      return { status: 'running', testId: session.testId };
    }

    // completed or error - extract status then remove session
    const result = {
      status: session.state,
      testId: session.testId,
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
