/**
 * Express Application Setup
 *
 * Configures middleware, mounts API routes, and sets up static report serving.
 * Keeps entry point (server.js) clean — only bootstrapping lives there.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const config = require('./config/app.config');
const errorHandler = require('./middleware/errorHandler');

const configRoutes = require('./routes/config.routes');
const recordRoutes = require('./routes/record.routes');
const testCaseRoutes = require('./routes/testCase.routes');
const runnerRoutes = require('./routes/runner.routes');

const app = express();

// ─── Ensure temp directories exist ───────────────────────────────────────────
[config.paths.temp, config.paths.reports].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── CORS — only allow configured frontend origins ────────────────────────────
app.use(cors({
  origin: config.server.corsOrigins,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Static: Playwright HTML Reports ─────────────────────────────────────────
app.use('/reports', express.static(config.paths.reports));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/config', configRoutes);
app.use('/api/record', recordRoutes);
app.use('/api/test-cases', testCaseRoutes);
app.use('/api/test-cases', runnerRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// ─── Centralized error handler (must be last) ─────────────────────────────────
app.use(errorHandler);

module.exports = app;
