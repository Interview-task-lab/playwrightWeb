/**
 * API Service
 *
 * Centralizes all HTTP communication with the backend.
 * Single Responsibility: the only place in the frontend that knows
 * the backend base URL or makes fetch() calls.
 *
 * Follows the Service Layer pattern — UI components/controllers
 * import this and never call fetch() directly.
 */

const API_BASE = 'http://localhost:3000/api';

/**
 * Generic fetch wrapper with JSON parsing and error normalization.
 * @param {string} endpoint
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.message || `HTTP ${response.status}`);
    err.statusCode = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export const configApi = {
  get: () => request('/config'),
};

// ─── Recording ────────────────────────────────────────────────────────────────

export const recordApi = {
  start: ({ url, language }) =>
    request('/record/start', {
      method: 'POST',
      body: JSON.stringify({ url, language }),
    }),

  getStatus: () => request('/record/status'),
};

// ─── Test Cases ───────────────────────────────────────────────────────────────

export const testCaseApi = {
  create: (payload) =>
    request('/test-cases', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAll: () => request('/test-cases'),

  delete: (id) =>
    request(`/test-cases/${id}`, { method: 'DELETE' }),

  run: (id) =>
    request(`/test-cases/${id}/run`, { method: 'POST' }),

  getRunStatus: () => request('/test-cases/run-status'),
};
