/**
 * Toast Component
 *
 * Renders self-dismissing notification toasts.
 * Single Responsibility: toast display and lifecycle only.
 */

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const DISMISS_MS = 3500;
const FADE_MS = 250;

export class Toast {
  /**
   * @param {HTMLElement} container - The element to append toasts into
   */
  constructor(container) {
    this._container = container;
  }

  /**
   * Shows a toast notification.
   * @param {string} message
   * @param {'success'|'error'|'info'} type
   */
  show(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${ICONS[type] || ICONS.info}</span><span>${message}</span>`;
    this._container.appendChild(el);

    setTimeout(() => {
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), FADE_MS);
    }, DISMISS_MS);
  }
}
