/**
 * Recorder Service
 *
 * Manages the lifecycle of a `npx playwright codegen` child process.
 * Encapsulates all mutable recording state behind a clean API.
 * Follows Single Responsibility Principle — only recording concerns live here.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config/app.config');
const codeParser = require('./codeParser.service');

class RecorderService {
  constructor() {
    this._reset();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns whether a recording session is currently active.
   * @returns {boolean}
   */
  get isActive() {
    return this._activeProcess !== null;
  }

  /**
   * Starts a new codegen recording session.
   * @param {{ url?: string, language?: string }} options
   * @returns {{ success: boolean, message: string }}
   */
  start({ url, language } = {}) {
    if (this._activeProcess) {
      return {
        success: false,
        message: 'A recording session is already active. Close the Playwright browser window first.',
      };
    }

    const targetUrl = url || config.recording.defaultUrl;
    const targetLang = language || config.recording.defaultLanguage;

    this._lastUrl = targetUrl;
    this._lastLanguage = targetLang;
    this._exited = false;
    this._exitCode = null;
    this._error = null;

    // Clean up previous output file
    if (fs.existsSync(config.paths.outputFile)) {
      fs.unlinkSync(config.paths.outputFile);
    }

    this._ensureTempDir();

    const args = [
      'playwright', 'codegen', targetUrl,
      `--target=${targetLang}`,
      `--output=${config.paths.outputFile}`,
    ];

    console.log(`🎬 Starting recording: npx ${args.join(' ')}`);

    this._activeProcess = spawn('npx', args, {
      cwd: config.paths.root,
      stdio: 'pipe',
      shell: true,
    });

    this._activeProcess.stdout.on('data', (d) =>
      console.log(`[codegen stdout] ${d.toString().trim()}`)
    );
    this._activeProcess.stderr.on('data', (d) =>
      console.log(`[codegen stderr] ${d.toString().trim()}`)
    );
    this._activeProcess.on('error', (err) => {
      console.error('❌ Failed to start codegen process:', err.message);
      this._error = err.message;
      this._exited = true;
      this._cleanup();
    });
    this._activeProcess.on('close', (code) => {
      console.log(`🛑 Codegen process exited with code ${code}`);
      this._exitCode = code;
      this._exited = true;
      this._cleanup();
    });

    // Safety timeout
    this._killTimeout = setTimeout(() => {
      if (this._activeProcess) {
        console.log('⏰ 10-minute timeout reached. Killing codegen process.');
        this._activeProcess.kill('SIGTERM');
      }
    }, config.recording.maxExecutionMs);

    return {
      success: true,
      message: 'Recording started. The Playwright browser window should open on your desktop.',
    };
  }

  /**
   * Returns the current recording status and result data when complete.
   * @returns {{ status: string, message: string, data?: object }}
   */
  getStatus() {
    if (this._activeProcess && !this._exited) {
      return {
        status: 'recording',
        message: 'Browser is still open. Execute your test actions, then close the browser window.',
      };
    }

    if (this._exited) {
      if (this._error) {
        const msg = this._error;
        this._exited = false;
        this._error = null;
        return { status: 'error', message: `Recording failed: ${msg}` };
      }

      if (fs.existsSync(config.paths.outputFile)) {
        try {
          let code = fs.readFileSync(config.paths.outputFile, 'utf-8');
          code = codeParser.uncommentAssertions(code);
          const steps = codeParser.parseCodeToSteps(code, this._lastLanguage);

          return {
            status: 'completed',
            message: 'Recording completed successfully.',
            data: {
              code,
              steps,
              url: this._lastUrl,
              language: this._lastLanguage,
            },
          };
        } catch (err) {
          return { status: 'error', message: `Failed to read output file: ${err.message}` };
        }
      }

      return {
        status: 'completed',
        message: 'Recording completed but no actions were recorded.',
        data: {
          code: '// No actions were recorded.',
          steps: [],
          url: this._lastUrl,
          language: this._lastLanguage,
        },
      };
    }

    return { status: 'idle', message: 'No active recording session.' };
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _reset() {
    this._activeProcess = null;
    this._exited = false;
    this._exitCode = null;
    this._error = null;
    this._lastUrl = '';
    this._lastLanguage = '';
    this._killTimeout = null;
  }

  _cleanup() {
    if (this._killTimeout) {
      clearTimeout(this._killTimeout);
      this._killTimeout = null;
    }
    this._activeProcess = null;
  }

  _ensureTempDir() {
    if (!fs.existsSync(config.paths.temp)) {
      fs.mkdirSync(config.paths.temp, { recursive: true });
    }
  }
}

module.exports = new RecorderService();
