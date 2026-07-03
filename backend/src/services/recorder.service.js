/**
 * Recorder Service
 *
 * Manages per-user `npx playwright codegen` child processes to prevent conflicts.
 * Follows the Session Manager pattern.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/app.config');
const codeParser = require('./codeParser.service');

class RecorderService {
  constructor() {
    this._sessions = new Map(); // userId -> session object
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns whether a user has an active recording session.
   * @param {number} userId
   * @returns {boolean}
   */
  isActive(userId) {
    const session = this._sessions.get(userId);
    return session ? session.activeProcess !== null : false;
  }

  /**
   * Starts a new codegen recording session for a user.
   * @param {number} userId
   * @param {{ url?: string, language?: string }} options
   * @returns {{ success: boolean, message: string }}
   */
  start(userId, { url } = {}) {
    if (this.isActive(userId)) {
      return {
        success: false,
        message: 'A recording session is already active. Close the Playwright browser window first.',
      };
    }

    const targetUrl = url || config.recording.defaultUrl;
    const targetLang = 'javascript';
    const sessionUuid = uuidv4();
    const outputFile = path.join(config.paths.temp, `raw_script_${userId}_${sessionUuid}.js`);

    this._ensureTempDir();

    // Clean up any old output file if it exists
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }

    const args = [
      'playwright', 'codegen', targetUrl,
      `--target=${targetLang}`,
      `--output=${outputFile}`,
    ];

    console.log(`🎬 [User #${userId}] Starting recording: npx ${args.join(' ')}`);

    const activeProcess = spawn('npx', args, {
      cwd: config.paths.root,
      stdio: 'pipe',
      shell: true,
    });

    const session = {
      activeProcess,
      exited: false,
      exitCode: null,
      error: null,
      lastUrl: targetUrl,
      lastLanguage: targetLang,
      outputFile,
      killTimeout: null
    };

    this._sessions.set(userId, session);

    activeProcess.stdout.on('data', (d) =>
      console.log(`[User #${userId} codegen stdout] ${d.toString().trim()}`)
    );
    activeProcess.stderr.on('data', (d) =>
      console.log(`[User #${userId} codegen stderr] ${d.toString().trim()}`)
    );
    activeProcess.on('error', (err) => {
      console.error(`❌ [User #${userId}] Failed to start codegen process:`, err.message);
      session.error = err.message;
      session.exited = true;
      this._cleanup(userId);
    });
    activeProcess.on('close', (code) => {
      console.log(`🛑 [User #${userId}] Codegen process exited with code ${code}`);
      session.exitCode = code;
      session.exited = true;
      this._cleanup(userId);
    });

    // Safety timeout
    session.killTimeout = setTimeout(() => {
      const activeSession = this._sessions.get(userId);
      if (activeSession && activeSession.activeProcess) {
        console.log(`⏰ [User #${userId}] Timeout reached. Killing codegen process.`);
        activeSession.activeProcess.kill('SIGTERM');
      }
    }, config.recording.maxExecutionMs);

    return {
      success: true,
      message: 'Recording started. The Playwright browser window should open on your desktop.',
    };
  }

  /**
   * Returns the recording status for a user.
   * @param {number} userId
   * @returns {{ status: string, message: string, data?: object }}
   */
  getStatus(userId) {
    const session = this._sessions.get(userId);

    if (!session) {
      return { status: 'idle', message: 'No active recording session.' };
    }

    if (session.activeProcess && !session.exited) {
      return {
        status: 'recording',
        message: 'Browser is still open. Execute your test actions, then close the browser window.',
      };
    }

    if (session.exited) {
      // Keep reference to values we need, then clear the session
      const { error, outputFile, lastUrl, lastLanguage } = session;
      this._sessions.delete(userId);

      if (error) {
        return { status: 'error', message: `Recording failed: ${error}` };
      }

      if (fs.existsSync(outputFile)) {
        try {
          let code = fs.readFileSync(outputFile, 'utf-8');
          code = codeParser.uncommentAssertions(code);
          const steps = codeParser.parseCodeToSteps(code, lastLanguage);

          // Clean up the temp file
          try { fs.unlinkSync(outputFile); } catch (_) {}

          return {
            status: 'completed',
            message: 'Recording completed successfully.',
            data: {
              code,
              steps,
              url: lastUrl,
              platform: 'web',
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
          url: lastUrl,
          platform: 'web',
        },
      };
    }

    return { status: 'idle', message: 'No active recording session.' };
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _cleanup(userId) {
    const session = this._sessions.get(userId);
    if (session) {
      if (session.killTimeout) {
        clearTimeout(session.killTimeout);
        session.killTimeout = null;
      }
      session.activeProcess = null;
    }
  }

  _ensureTempDir() {
    if (!fs.existsSync(config.paths.temp)) {
      fs.mkdirSync(config.paths.temp, { recursive: true });
    }
  }
}

module.exports = new RecorderService();
