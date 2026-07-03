/**
 * StepsList Component
 *
 * Renders a list of Playwright test step descriptions.
 * Single Responsibility: step list rendering only.
 */

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export class StepsList {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this._container = container;
  }

  /**
   * Renders the steps list.
   * @param {{ step: number, description: string }[]} steps
   */
  render(steps) {
    if (!steps || steps.length === 0) {
      this._container.innerHTML = `
        <div class="text-center py-8 text-surface-500 text-sm">
          No actions were detected during the recording.
        </div>`;
      return;
    }

    this._container.innerHTML = steps
      .map(
        (s) => `
        <div class="step-item">
          <div class="step-number">${s.step}</div>
          <div class="step-description">${escapeHtml(s.description)}</div>
        </div>`
      )
      .join('');
  }

  clear() {
    this._container.innerHTML = '';
  }
}
