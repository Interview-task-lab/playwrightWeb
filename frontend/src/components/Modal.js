/**
 * Modal Component
 *
 * Controls the test detail modal overlay.
 * Single Responsibility: modal open/close and content rendering.
 */

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export class Modal {
  /**
   * @param {HTMLElement} overlayEl
   * @param {HTMLElement} titleEl
   * @param {HTMLElement} bodyEl
   * @param {HTMLElement} closeBtn
   */
  constructor(overlayEl, titleEl, bodyEl, closeBtn) {
    this._overlay = overlayEl;
    this._titleEl = titleEl;
    this._bodyEl = bodyEl;
    this._code = null;

    closeBtn.addEventListener('click', () => this.close());
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) this.close();
    });
  }

  /**
   * Opens the modal with test case details.
   * @param {{ name: string, steps: object[], code: string }} testCase
   */
  open(testCase) {
    this._code = testCase.code;
    this._titleEl.textContent = testCase.name;
    const steps = Array.isArray(testCase.steps) ? testCase.steps : [];

    this._bodyEl.innerHTML = `
      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-3 flex items-center gap-2">
          <svg class="w-3.5 h-3.5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
                 M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          Test Steps (${steps.length})
        </h4>
        <div class="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
          ${steps.length > 0
            ? steps.map((s) => `
                <div class="step-item">
                  <div class="step-number">${s.step}</div>
                  <div class="step-description">${escapeHtml(s.description)}</div>
                </div>`).join('')
            : '<p class="text-surface-500 text-sm">No steps recorded.</p>'
          }
        </div>
      </div>
      <div>
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
            Code
          </h4>
          <button id="modalCopyBtn" class="btn-secondary text-xs py-1 px-2.5">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke-width="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke-width="2"/>
            </svg>
            Copy
          </button>
        </div>
        <pre class="code-block max-h-[400px] overflow-y-auto custom-scrollbar">
          <code class="text-sm font-mono">${escapeHtml(testCase.code)}</code>
        </pre>
      </div>`;

    this._overlay.classList.remove('hidden');
  }

  close() {
    this._overlay.classList.add('hidden');
    this._code = null;
  }

  /** Returns the currently displayed code (for copy operations). */
  get currentCode() {
    return this._code;
  }
}
