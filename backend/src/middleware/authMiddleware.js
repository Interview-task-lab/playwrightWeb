/**
 * Auth Middleware
 *
 * Verifies JWT token on incoming requests.
 * Extracts "Bearer <token>" from Authorization header and sets `req.user`.
 */

const authService = require('../services/auth.service');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({
      success: false,
      message: err.message || 'Invalid or expired token.',
    });
  }
}

module.exports = authenticate;
