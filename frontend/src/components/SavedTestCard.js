/**
 * SavedTestCard Component
 *
 * Renders a single saved test case row with action buttons.
 * Accepts callbacks so the component stays decoupled from business logic.
 */

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text ?? '');
  return div.innerHTML;
}

/**
 * @param {object} tc - Test case record
 * @param {{ onRun, onView, onDelete }} callbacks
 * @returns {string} - HTML string
 */
export function renderSavedTestCard(tc, { onRun, onView, onDelete }) {
  const date = new Date(tc.created_at).toLocaleString();
  const stepsCount = Array.isArray(tc.steps) ? tc.steps.length : 0;
  const safeName = escapeHtml(tc.name);

  return `
    <div class="saved-test-card fade-in" data-test-id="${tc.id}">
      <div class="flex items-center gap-4 flex-1 min-w-0">
        <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-500/20 to-accent-600/10
                    flex items-center justify-center flex-shrink-0">
          <span class="text-accent-400 text-sm font-bold">#${tc.id}</span>
        </div>
        <div class="min-w-0">
          <div class="font-semibold text-sm text-surface-100 truncate">${safeName}</div>
          <div class="flex items-center gap-3 mt-1">
            <span class="text-xs text-surface-500 truncate max-w-[200px]">${escapeHtml(tc.url || '—')}</span>
            <span class="lang-badge">${escapeHtml(tc.language)}</span>
            <span class="text-xs text-surface-500">${stepsCount} steps</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0 ml-4">
        <span class="text-xs text-surface-500 hidden sm:block">${date}</span>
        <button id="runBtn-${tc.id}" class="btn-run text-xs py-1.5 px-3">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132
                 a1 1 0 000-1.664z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Run
        </button>
        <button id="viewBtn-${tc.id}" class="btn-secondary text-xs py-1.5 px-3">View</button>
        <button id="deleteBtn-${tc.id}" class="btn-danger text-xs py-1.5 px-2">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5
                 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>`;
}
