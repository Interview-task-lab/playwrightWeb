/**
 * Record Controller
 * Handles recording lifecycle endpoints:
 *   POST /api/record/start
 *   GET  /api/record/status
 */

const recorderService = require('../services/recorder.service');

function startRecording(req, res, next) {
  try {
    const { url, language } = req.body;
    const result = recorderService.start({ url, language });

    const statusCode = result.success ? 200 : 409;
    return res.status(statusCode).json(result);
  } catch (err) {
    return next(err);
  }
}

function getRecordingStatus(req, res, next) {
  try {
    const status = recorderService.getStatus();
    return res.json(status);
  } catch (err) {
    return next(err);
  }
}

module.exports = { startRecording, getRecordingStatus };
