/**
 * Recording Controller
 *
 * Manages the start/poll/complete/error lifecycle of a Playwright recording session.
 * Depends on: ApiService, MainPage, StatusBadge, Toast, StepsList, ClipboardService
 */

import { recordApi } from '../services/api.service.js';
import { copyToClipboard } from '../services/clipboard.service.js';
import { StepsList } from '../components/StepsList.js';

const POLLING_INTERVAL_MS = 1500;

export class RecordingController {
  /**
   * @param {import('../pages/MainPage.js').MainPage} page
   * @param {import('../components/StatusBadge.js').StatusBadge} statusBadge
   * @param {import('../components/Toast.js').Toast} toast
   */
  constructor(page, statusBadge, toast) {
    this._page = page;
    this._badge = statusBadge;
    this._toast = toast;
    this._steps = new StepsList(page.stepsContainer);
    this._pollingInterval = null;
    this._currentResult = null;
  }

  /** Current recording result data (code, steps, url, language) */
  get result() { return this._currentResult; }

  // ─── Public ───────────────────────────────────────────────────────────────

  async start() {
    const url = this._page.selectedUrl;
    const language = this._page.selectedLanguage;

    try {
      this._page.setStartBtnLoading('Starting…');
      const data = await recordApi.start({ url, language });

      if (!data.success) {
        this._toast.show(data.message, 'error');
        this._page.resetStartBtn();
        return;
      }

      this._toast.show('Recording started! A browser window should open.', 'success');
      this._badge.set('recording');
      this._page.showRecordingBanner();
      this._page.hideResults();
      this._page.setStartBtnLoading('Recording…');
      this._startPolling();
    } catch (err) {
      this._toast.show(`Failed to start: ${err.message}`, 'error');
      this._page.resetStartBtn();
    }
  }

  async copyCode() {
    if (!this._currentResult?.code) return;
    try {
      await copyToClipboard(this._currentResult.code);
      this._toast.show('Code copied to clipboard!', 'success');
    } catch {
      this._toast.show('Failed to copy code.', 'error');
    }
  }

  resetForNewRecording() {
    this._page.hideResults();
    this._badge.set('idle');
    this._currentResult = null;
    this._page.testName = '';
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  _startPolling() {
    this._stopPolling();
    this._pollingInterval = setInterval(() => this._poll(), POLLING_INTERVAL_MS);
  }

  _stopPolling() {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
      this._pollingInterval = null;
    }
  }

  async _poll() {
    try {
      const data = await recordApi.getStatus();

      if (data.status === 'completed') {
        this._stopPolling();
        this._onComplete(data);
      } else if (data.status === 'error') {
        this._stopPolling();
        this._onError(data);
      }
    } catch (err) {
      console.error('Recording polling error:', err);
    }
  }

  _onComplete(data) {
    this._page.hideRecordingBanner();
    this._badge.set('completed');
    this._page.resetStartBtn();

    this._currentResult = data.data;
    this._steps.render(this._currentResult.steps);
    this._page.codeOutput.textContent = this._currentResult.code;
    this._page.showResults();

    this._toast.show('Recording completed! Your test is ready.', 'success');
  }

  _onError(data) {
    this._page.hideRecordingBanner();
    this._badge.set('idle');
    this._page.resetStartBtn();
    this._toast.show(data.message || 'Recording failed.', 'error');
  }
}
