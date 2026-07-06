/**
 * Runner Controller
 *
 * Manages the lifecycle of running a Playwright test case and opening its report.
 * Listens to the 'run-test' custom event dispatched by TestListController.
 * Follows Single Responsibility Principle.
 */

import { testCaseApi } from '../services/api.service.js';

const POLLING_INTERVAL_MS = 1500;

export class RunnerController {
  /**
   * @param {import('../pages/MainPage.js').MainPage} page
   * @param {import('../components/Toast.js').Toast} toast
   */
  constructor(page, toast) {
    this._page = page;
    this._toast = toast;
    this._pollingInterval = null;
    this._reportWindow = null;
    this._currentTestId = null;
  }

  // ─── Public ───────────────────────────────────────────────────────────────

  /** Binds to the custom 'run-test' event. Call once during app init. */
  bind() {
    document.addEventListener('run-test', (e) => {
      const { id, name } = e.detail;
      this.run(id, name);
    });
  }

  async run(id, name) {
    this._currentTestId = id;
    this._page.setRunBtnLoading(id);
    this._page.removeReportBtn(id);

    // Open placeholder window synchronously to bypass popup blockers
    this._reportWindow = this._openPlaceholderWindow(name);

    try {
      const data = await testCaseApi.run(id);

      if (!data.success) {
        this._toast.show(data.message, 'error');
        this._page.resetRunBtn(id);
        this._closeReportWindow();
        return;
      }

      this._toast.show(`Running test "${name}"…`, 'info');
      this._startPolling(id);
    } catch (err) {
      this._toast.show(`Failed to run: ${err.message}`, 'error');
      this._page.resetRunBtn(id);
      this._closeReportWindow();
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  _startPolling(testId) {
    this._stopPolling();
    this._pollingInterval = setInterval(() => this._poll(testId), POLLING_INTERVAL_MS);
  }

  _stopPolling() {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
      this._pollingInterval = null;
    }
  }

  async _poll(testId) {
    try {
      const data = await testCaseApi.getRunStatus();

      if (data.status === 'completed') {
        this._stopPolling();
        this._page.resetRunBtn(testId);

        if (data.reportUrl) {
          const reportUrl = `http://localhost:3001${data.reportUrl}`;
          this._toast.show('Test finished! Opening report…', 'success');
          if (this._reportWindow && !this._reportWindow.closed) {
            this._reportWindow.location.href = reportUrl;
          } else {
            window.open(reportUrl, '_blank');
          }
          this._page.addReportBtn(testId, reportUrl);
        } else {
          this._toast.show('Test finished but no report was generated.', 'info');
          this._closeReportWindow();
        }
      } else if (data.status === 'error') {
        this._stopPolling();
        this._page.resetRunBtn(testId);
        this._toast.show('Test run encountered an error.', 'error');
        this._showErrorInReportWindow();
      }
    } catch (err) {
      console.error('Run polling error:', err);
    }
  }

  _openPlaceholderWindow(name) {
    try {
      const win = window.open('about:blank', '_blank');
      if (win) {
        win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Running Test: ${name}...</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
           background: #0f172a; color: #f8fafc; display: flex; align-items: center;
           justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; padding: 2rem; background: #1e293b; border-radius: 1rem;
           border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0,0,0,.3); max-width: 450px; }
    .spinner { width: 40px; height: 40px; border: 4px solid #3b82f6;
               border-top-color: transparent; border-radius: 50%;
               animation: spin 1s linear infinite; margin: 0 auto 1.5rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 1.25rem; margin: 0 0 .5rem; font-weight: 600; }
    p  { color: #94a3b8; font-size: .875rem; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <h2>Running Test "${name}"...</h2>
    <p>Please wait while Playwright executes the test steps. This window will automatically display the HTML report.</p>
  </div>
</body>
</html>`);
      }
      return win;
    } catch {
      return null;
    }
  }

  _closeReportWindow() {
    if (this._reportWindow && !this._reportWindow.closed) {
      this._reportWindow.close();
    }
    this._reportWindow = null;
  }

  _showErrorInReportWindow() {
    if (this._reportWindow && !this._reportWindow.closed) {
      this._reportWindow.document.body.innerHTML = `
        <div style="font-family:sans-serif;background:#0f172a;color:#ef4444;display:flex;
                    align-items:center;justify-content:center;height:100vh;text-align:center;margin:0;">
          <div style="padding:2rem;background:#1e293b;border-radius:1rem;border:1px solid rgba(239,68,68,.3)">
            <h2 style="margin:0 0 .5rem;color:#f87171;">❌ Test Run Failed</h2>
            <p style="color:#94a3b8;margin:0;">Check terminal logs for details.</p>
          </div>
        </div>`;
    }
  }
}
