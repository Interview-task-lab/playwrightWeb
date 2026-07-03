/**
 * Application-level configuration constants.
 * All environment-specific values should be defined here,
 * pulling from process.env with safe defaults.
 */

const path = require('path');

const config = {
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    /** Allowed frontend origins (CORS). Extend for production. */
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:8080', 'http://127.0.0.1:8080'],
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5434,
    user: process.env.DB_USER || 'codegen_user',
    password: process.env.DB_PASSWORD || 'codegen_password',
    database: process.env.DB_NAME || 'codegen_db',
  },

  paths: {
    root: path.resolve(__dirname, '..', '..'),
    temp: path.resolve(__dirname, '..', '..', 'temp'),
    reports: path.resolve(__dirname, '..', '..', 'temp', 'reports'),
    config: path.resolve(__dirname, '..', '..', 'config.json'),
    outputFile: path.resolve(__dirname, '..', '..', 'temp', 'raw_script.js'),
  },

  recording: {
    maxExecutionMs: 10 * 60 * 1000, // 10 minutes
    defaultUrl: 'https://www.enuygun.com/',
    defaultLanguage: 'javascript',
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'playwright-studio-dev-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
};

module.exports = config;
