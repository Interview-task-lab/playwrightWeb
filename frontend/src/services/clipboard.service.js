/**
 * Clipboard Service
 *
 * Abstracts clipboard access with a graceful fallback for older browsers.
 * Single Responsibility: clipboard operations only.
 */

/**
 * Copies the given text to the clipboard.
 * Falls back to the legacy execCommand approach if the Clipboard API is unavailable.
 * @param {string} text
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Legacy fallback
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}
