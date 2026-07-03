/**
 * Auth Controller
 *
 * Handles HTTP requests for authentication.
 */

const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login };
