/**
 * TestList Controller
 *
 * Manages loading, displaying, saving, and deleting test cases.
 * Depends on: ApiService, MainPage, Toast, Modal
 */

import { testCaseApi } from '../services/api.service.js';
import { renderSavedTestCard } from '../components/SavedTestCard.js';
import { copyToClipboard } from '../services/clipboard.service.js';

export class TestListController {
  /**
   * @param {import('../pages/MainPage.js').MainPage} page
   * @param {import('../components/Toast.js').Toast} toast
   * @param {import('../components/Modal.js').Modal} modal
   * @param {() => object|null} getRecordingResult - Callback to get current recording result
   */
  constructor(page, toast, modal, getRecordingResult) {
    this._page = page;
    this._toast = toast;
    this._modal = modal;
    this._getResult = getRecordingResult;
    /** @type {object[]} Local cache of test cases */
    this._testCases = [];
  }

  // ─── Public ───────────────────────────────────────────────────────────────

  async load() {
    try {
      const data = await testCaseApi.getAll();

      if (!data.success || !data.testCases?.length) {
        this._renderEmpty();
        return;
      }

      this._testCases = data.testCases;
      this._render();
    } catch {
      this._page.savedTestsList.innerHTML = `
        <div class="text-center py-8 text-surface-500 text-sm">
          ⚠️ Could not load tests. Is the backend running?
        </div>`;
    }
  }

  async save() {
    const result = this._getResult();
    if (!result) {
      this._toast.show('No recording result to save.', 'error');
      return;
    }

    const name = this._page.testName;
    if (!name) {
      this._toast.show('Please enter a test name before saving.', 'error');
      this._page.testNameInput.focus();
      return;
    }

    try {
      this._page.saveTestBtn.disabled = true;
      const data = await testCaseApi.create({
        name,
        url: result.url,
        language: result.language,
        code: result.code,
        steps: result.steps,
      });

      if (data.success) {
        this._toast.show(`Test "${name}" saved!`, 'success');
        this._page.testName = '';
        await this.load();
      } else {
        this._toast.show(data.message || 'Failed to save test.', 'error');
      }
    } catch (err) {
      this._toast.show(`Failed to save: ${err.message}`, 'error');
    } finally {
      this._page.saveTestBtn.disabled = false;
    }
  }

  async delete(id, name) {
    if (!confirm(`Delete test "${name}"?`)) return;

    try {
      await testCaseApi.delete(id);
      this._toast.show(`Test "${name}" deleted.`, 'info');
      await this.load();
    } catch (err) {
      this._toast.show(`Failed to delete: ${err.message}`, 'error');
    }
  }

  viewDetail(id) {
    const tc = this._testCases.find((t) => t.id === id);
    if (tc) this._modal.open(tc);
  }

  async copyModalCode() {
    const code = this._modal.currentCode;
    if (!code) return;
    try {
      await copyToClipboard(code);
      this._toast.show('Code copied!', 'success');
    } catch {
      this._toast.show('Failed to copy.', 'error');
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  _render() {
    this._page.savedTestsList.innerHTML = this._testCases
      .map((tc) => renderSavedTestCard(tc, {}))
      .join('');

    // Bind events after render
    this._testCases.forEach((tc) => {
      document.getElementById(`runBtn-${tc.id}`)
        ?.addEventListener('click', () => this._emitRun(tc.id, tc.name));
      document.getElementById(`viewBtn-${tc.id}`)
        ?.addEventListener('click', () => this.viewDetail(tc.id));
      document.getElementById(`deleteBtn-${tc.id}`)
        ?.addEventListener('click', () => this.delete(tc.id, tc.name));
    });

    // Modal copy button (rendered inside modal body dynamically)
    document.addEventListener('click', (e) => {
      if (e.target.closest('#modalCopyBtn')) this.copyModalCode();
    }, { once: false });
  }

  _renderEmpty() {
    this._testCases = [];
    this._page.savedTestsList.innerHTML = `
      <div class="text-center py-12 text-surface-500 text-sm">
        <svg class="w-10 h-10 mx-auto mb-3 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14
               0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
        </svg>
        No saved test cases yet. Record a test and save it!
      </div>`;
  }

  /** Emits a run event — RunnerController listens to this */
  _emitRun(id, name) {
    document.dispatchEvent(new CustomEvent('run-test', { detail: { id, name } }));
  }
}
