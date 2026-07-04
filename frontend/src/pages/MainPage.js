/**
 * MainPage — Page Object
 *
 * Centralizes all DOM element references for the main application page.
 * Follows the Page Object Model pattern: provides a single, stable API
 * for accessing and toggling DOM elements so controllers never touch
 * document.getElementById directly.
 */

export class MainPage {
  constructor() {
    // ─── Controls ──────────────────────────────────────────────────────────
    this.controlsSection   = document.getElementById('controlsSection');
    this.urlInput          = document.getElementById('urlInput');
    this.languageSelect    = document.getElementById('languageSelect');
    this.startBtn          = document.getElementById('startBtn');
    this.configUrlDisplay  = document.getElementById('configUrlDisplay');

    // ─── User Profile ──────────────────────────────────────────────────────
    this.headerUsername    = document.getElementById('headerUsername');
    this.headerUserRole    = document.getElementById('headerUserRole');
    this.logoutBtn         = document.getElementById('logoutBtn');

    // ─── Sections ──────────────────────────────────────────────────────────
    this.recordingBanner   = document.getElementById('recordingBanner');
    this.resultsSection    = document.getElementById('resultsSection');

    // ─── Views & Navigation ────────────────────────────────────────────────
    this.domainList        = document.getElementById('domainList');
    this.welcomeView       = document.getElementById('welcomeView');
    this.studioView        = document.getElementById('studioView');
    this.navStudioBtn             = document.getElementById('navStudioBtn');
    this.navTestRunsBtn           = document.getElementById('navTestRunsBtn');
    this.sidebarDomainsSection    = document.getElementById('sidebarDomainsSection');
    this.testRunsView             = document.getElementById('testRunsView');
    
    // ─── Creation Configuration Form ───────────────────────────────────────
    this.toggleCreateConfigBtn    = document.getElementById('toggleCreateConfigBtn');
    this.createConfigSection      = document.getElementById('createConfigSection');
    this.configNameInput          = document.getElementById('configNameInput');
    this.configTypeSelect          = document.getElementById('configTypeSelect');
    this.configRunModeSelect      = document.getElementById('configRunModeSelect');
    this.configDomainSelectWrapper = document.getElementById('configDomainSelectWrapper');
    this.configDomainsList        = document.getElementById('configDomainsList');
    this.configTestCasesWrapper   = document.getElementById('configTestCasesWrapper');
    this.configTestCasesList      = document.getElementById('configTestCasesList');
    this.configSelectedOrderList  = document.getElementById('configSelectedOrderList');
    this.configSelectedOrderEmpty = document.getElementById('configSelectedOrderEmpty');
    this.cancelCreateConfigBtn    = document.getElementById('cancelCreateConfigBtn');
    this.saveConfigBtn            = document.getElementById('saveConfigBtn');

    // ─── List Configuration ───────────────────────────────────────────────
    this.refreshConfigsBtn        = document.getElementById('refreshConfigsBtn');
    this.configsGrid              = document.getElementById('configsGrid');
    this.configsEmptyState        = document.getElementById('configsEmptyState');

    // ─── Results ───────────────────────────────────────────────────────────
    this.stepsContainer    = document.getElementById('stepsContainer');
    this.codeOutput        = document.getElementById('codeOutput');
    this.copyCodeBtn       = document.getElementById('copyCodeBtn');
    this.newRecordingBtn   = document.getElementById('newRecordingBtn');
    this.testNameInput     = document.getElementById('testNameInput');
    this.saveTestBtn       = document.getElementById('saveTestBtn');

    // ─── Saved Tests ───────────────────────────────────────────────────────
    this.savedTestsList    = document.getElementById('savedTestsList');
    this.refreshTestsBtn   = document.getElementById('refreshTestsBtn');

    // ─── Toasts ────────────────────────────────────────────────────────────
    this.toastContainer    = document.getElementById('toastContainer');

    // ─── Status Badge ──────────────────────────────────────────────────────
    this.statusBadge       = document.getElementById('statusBadge');

    // ─── Modal ─────────────────────────────────────────────────────────────
    this.detailModal       = document.getElementById('detailModal');
    this.modalTitle        = document.getElementById('modalTitle');
    this.modalBody         = document.getElementById('modalBody');
    this.closeModalBtn     = document.getElementById('closeModalBtn');
  }

  // ─── Convenience methods ─────────────────────────────────────────────────

  showStudio() {
    this.welcomeView.classList.add('hidden');
    this.testRunsView.classList.add('hidden');
    this.studioView.classList.remove('hidden');

    this.navTestRunsBtn.classList.remove('bg-surface-850', 'text-white');
    this.navTestRunsBtn.classList.add('text-surface-400');
    this.navStudioBtn.classList.add('bg-surface-850', 'text-white');
    this.navStudioBtn.classList.remove('text-surface-400');

    this.sidebarDomainsSection.classList.remove('hidden');
  }

  showTestRuns() {
    this.welcomeView.classList.add('hidden');
    this.studioView.classList.add('hidden');
    this.testRunsView.classList.remove('hidden');

    this.navStudioBtn.classList.remove('bg-surface-850', 'text-white');
    this.navStudioBtn.classList.add('text-surface-400');
    this.navTestRunsBtn.classList.add('bg-surface-850', 'text-white');
    this.navTestRunsBtn.classList.remove('text-surface-400');

    this.sidebarDomainsSection.classList.add('hidden');
  }

  showWelcome() {
    this.studioView.classList.add('hidden');
    this.testRunsView.classList.add('hidden');
    this.welcomeView.classList.remove('hidden');

    this.sidebarDomainsSection.classList.remove('hidden');
  }

  setRecordingAllowed(allowed) {
    if (allowed) {
      this.controlsSection.classList.remove('hidden');
    } else {
      this.controlsSection.classList.add('hidden');
    }
  }

  showRecordingBanner()  { this.recordingBanner.classList.remove('hidden'); }
  hideRecordingBanner()  { this.recordingBanner.classList.add('hidden'); }

  showResults()          {
    this.resultsSection.classList.remove('hidden');
    this.resultsSection.classList.add('fade-in');
  }
  hideResults()          { this.resultsSection.classList.add('hidden'); }

  setStartBtnLoading(label = 'Starting…') {
    this.startBtn.disabled = true;
    this.startBtn.innerHTML = `
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
      ${label}`;
  }

  resetStartBtn() {
    this.startBtn.disabled = false;
    this.startBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>
      </svg>
      Start Recording`;
  }

  setRunBtnLoading(id) {
    const btn = document.getElementById(`runBtn-${id}`);
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
      Running…`;
  }

  resetRunBtn(id) {
    const btn = document.getElementById(`runBtn-${id}`);
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Run`;
  }

  addReportBtn(testId, reportUrl) {
    const runBtn = document.getElementById(`runBtn-${testId}`);
    if (!runBtn || document.getElementById(`reportBtn-${testId}`)) return;

    const btn = document.createElement('a');
    btn.id = `reportBtn-${testId}`;
    btn.href = reportUrl;
    btn.target = '_blank';
    btn.className =
      'btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-accent-500/10 text-accent-400 border border-accent-500/20 hover:bg-accent-500/20';
    btn.innerHTML = `
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293
             l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      Report`;
    runBtn.parentNode.insertBefore(btn, runBtn.nextSibling);
  }

  removeReportBtn(testId) {
    const btn = document.getElementById(`reportBtn-${testId}`);
    if (btn) btn.remove();
  }

  setConfigRunBtnLoading(id) {
    const btn = document.getElementById(`runConfigBtn-${id}`);
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
      Running…`;
  }

  resetConfigRunBtn(id) {
    const btn = document.getElementById(`runConfigBtn-${id}`);
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Run`;
  }

  addConfigReportBtn(configId, reportUrl) {
    const runBtn = document.getElementById(`runConfigBtn-${configId}`);
    if (!runBtn || document.getElementById(`reportConfigBtn-${configId}`)) return;

    const btn = document.createElement('a');
    btn.id = `reportConfigBtn-${configId}`;
    btn.href = reportUrl;
    btn.target = '_blank';
    btn.className =
      'btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-accent-500/10 text-accent-400 border border-accent-500/20 hover:bg-accent-500/20';
    btn.innerHTML = `
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293
             l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      Report`;
    runBtn.parentNode.insertBefore(btn, runBtn.nextSibling);
  }

  removeConfigReportBtn(configId) {
    const btn = document.getElementById(`reportConfigBtn-${configId}`);
    if (btn) btn.remove();
  }

  get selectedUrl()      { return this.urlInput?.value?.trim() ?? ''; }
  get selectedLanguage() { return 'javascript'; }
  get testName()         { return this.testNameInput.value.trim(); }
  set testName(v)        { this.testNameInput.value = v; }
  set configUrl(url)     {
    if (this.urlInput) this.urlInput.value = url;
    if (this.configUrlDisplay) this.configUrlDisplay.textContent = url;
  }
}
