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

import { authService } from './auth.service.js';

const API_BASE = 'http://localhost:3001/api';

/**
 * Generic fetch wrapper with JSON parsing and error normalization.
 * @param {string} endpoint
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const token = authService.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...options,
  });

  if (response.status === 401) {
    authService.logout();
    throw new Error('Session expired. Redirecting to login...');
  }

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

// ─── Domains ──────────────────────────────────────────────────────────────────

export const domainApi = {
  getAll: () => request('/domains'),
};

// ─── Recording ────────────────────────────────────────────────────────────────

export const recordApi = {
  start: ({ url }) =>
    request('/record/start', {
      method: 'POST',
      body: JSON.stringify({ url }),
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

  getAll: (domainId = null) => {
    const query = domainId !== null ? `?domainId=${domainId}` : '';
    return request(`/test-cases${query}`);
  },

  delete: (id) =>
    request(`/test-cases/${id}`, { method: 'DELETE' }),

  run: (id) =>
    request(`/test-cases/${id}/run`, { method: 'POST' }),

  getRunStatus: () => request('/test-cases/run-status'),
};

// ─── Run Configurations ──────────────────────────────────────────────────────

export const runConfigurationApi = {
  getAll: () => request('/run-configurations'),
  create: (payload) =>
    request('/run-configurations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  delete: (id) =>
    request(`/run-configurations/${id}`, { method: 'DELETE' }),
  run: (id) =>
    request(`/run-configurations/${id}/run`, { method: 'POST' }),
};

