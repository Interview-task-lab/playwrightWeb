/**
 * Runner Service
 *
 * Manages the lifecycle of a `npx playwright test` child process.
 * Converts codegen scripts to @playwright/test format, runs them,
 * and tracks results for polling by the client.
 * Follows Single Responsibility Principle.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config/app.config');
const codeParser = require('./codeParser.service');

/** @typedef {'idle'|'running'|'completed'|'error'} RunnerState */

class RunnerService {
  constructor() {
    this._process = null;
    /** @type {RunnerState} */
    this._state = 'idle';
    this._testId = null;
    this._output = '';
    this._reportPath = null;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Whether a test is currently being executed.
   * @returns {boolean}
   */
  get isBusy() {
    return this._process !== null;
  }

  /**
   * Starts running the given test case.
   * @param {{ id: number, name: string, code: string, language: string, url: string }} testCase
   * @param {string} baseUrl - Fallback base URL from app config
   * @returns {{ success: boolean, message: string }}
   */
  run(testCase, baseUrl) {
    if (this._process) {
      return {
        success: false,
        message: 'A test is already running. Please wait for it to finish.',
      };
    }

    const { id, name, code, language, url } = testCase;

    if (!['javascript', 'playwright-test'].includes(language)) {
      return {
        success: false,
        message: `Running ${language} tests is not supported yet. Only JavaScript tests can be run.`,
      };
    }

    this._prepareReportDir(id);
    const testCode = codeParser.convertToPlaywrightTest(code, name);
    const testFile = this._writeTestFile(id, testCode);
    const configFile = this._writeConfigFile(id, url || baseUrl);

    this._state = 'running';
    this._testId = id;
    this._output = '';
    this._reportPath = `/reports/test-${id}/index.html`;

    console.log(`▶️  Running test #${id}: "${name}"`);

    const args = ['playwright', 'test', testFile, `--config=${configFile}`];
    this._process = spawn('npx', args, {
      cwd: config.paths.root,
      stdio: 'pipe',
      shell: true,
    });

    this._process.stdout.on('data', (d) => {
      const text = d.toString();
      this._output += text;
      console.log(`[test stdout] ${text.trim()}`);
    });
    this._process.stderr.on('data', (d) => {
      const text = d.toString();
      this._output += text;
      console.log(`[test stderr] ${text.trim()}`);
    });
    this._process.on('error', (err) => {
      console.error('❌ Test runner error:', err.message);
      this._state = 'error';
      this._output += `\nError: ${err.message}`;
      this._process = null;
    });
    this._process.on('close', (code) => {
      console.log(`🏁 Test #${id} finished with exit code ${code}`);
      this._state = 'completed';
      this._process = null;
      this._safeDelete(testFile);
      this._safeDelete(configFile);
    });

    return {
      success: true,
      message: `Test "${name}" is now running...`,
    };
  }

  /**
   * Returns the current runner state and resets once consumed (completed/error).
   * @returns {{ status: RunnerState, testId?: number, reportUrl?: string, output?: string }}
   */
  getStatus() {
    if (this._state === 'idle') return { status: 'idle' };

    if (this._state === 'running') {
      return { status: 'running', testId: this._testId };
    }

    // completed or error — snapshot then reset
    const result = {
      status: this._state,
      testId: this._testId,
      reportUrl: this._reportPath,
      output: this._output,
    };

    this._state = 'idle';
    this._testId = null;
    this._output = '';
    this._reportPath = null;

    return result;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _prepareReportDir(testId) {
    const dir = path.join(config.paths.reports, `test-${testId}`);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  _writeTestFile(testId, code) {
    const file = path.join(config.paths.root, `run_test_${testId}.spec.js`);
    fs.writeFileSync(file, code, 'utf-8');
    return file;
  }

  _writeConfigFile(testId, baseURL) {
    const reportDir = path.join(config.paths.reports, `test-${testId}`).replace(/\\/g, '/');
    const file = path.join(config.paths.root, `playwright_run_${testId}.config.js`);
    const content = `const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  reporter: [['html', { outputFolder: '${reportDir}', open: 'never' }]],
  use: {
    headless: false,
    baseURL: '${baseURL}',
  },
});
`;
    fs.writeFileSync(file, content, 'utf-8');
    return file;
  }

  _safeDelete(filePath) {
    try { fs.unlinkSync(filePath); } catch (_) { /* intentionally ignored */ }
  }
}

module.exports = new RunnerService();
