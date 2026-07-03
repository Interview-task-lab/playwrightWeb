/**
 * Record Controller
 * Handles recording lifecycle endpoints:
 *   POST /api/record/start
 *   GET  /api/record/status
 */

const recorderService = require('../services/recorder.service');

function startRecording(req, res, next) {
  try {
    const { url } = req.body;
    const userId = req.user.userId;
    const result = recorderService.start(userId, { url });

    const statusCode = result.success ? 200 : 409;
    return res.status(statusCode).json(result);
  } catch (err) {
    return next(err);
  }
}

function getRecordingStatus(req, res, next) {
  try {
    const userId = req.user.userId;
    const status = recorderService.getStatus(userId);
    return res.json(status);
  } catch (err) {
    return next(err);
  }
}

module.exports = { startRecording, getRecordingStatus };
