/**
 * Config Controller
 * Handles GET /api/config
 */

const fs = require('fs');
const config = require('../config/app.config');

function getConfig(req, res, next) {
  try {
    let appConfig = { targetUrl: config.recording.defaultUrl };

    if (fs.existsSync(config.paths.config)) {
      const raw = fs.readFileSync(config.paths.config, 'utf-8');
      appConfig = { ...appConfig, ...JSON.parse(raw) };
    }

    return res.json({ success: true, config: appConfig });
  } catch (err) {
    console.warn('Could not load config.json:', err.message);
    return next(err);
  }
}

module.exports = { getConfig };
