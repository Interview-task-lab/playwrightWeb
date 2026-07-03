/**
 * StatusBadge Component
 *
 * Manages the header recording status indicator.
 * Single Responsibility: status badge visual state.
 */

export class StatusBadge {
  /**
   * @param {HTMLElement} element - The badge DOM element
   */
  constructor(element) {
    this._el = element;
    this._textEl = element.querySelector('.status-text');
  }

  /**
   * @param {'idle'|'recording'|'completed'} status
   */
  set(status) {
    this._el.className = 'status-badge';

    const states = {
      recording: { cls: 'status-recording', label: 'Recording' },
      completed: { cls: 'status-completed', label: 'Completed' },
      idle: { cls: 'status-idle', label: 'Idle' },
    };

    const { cls, label } = states[status] || states.idle;
    this._el.classList.add(cls);
    this._textEl.textContent = label;
  }
}
