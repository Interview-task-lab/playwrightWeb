/**
 * Centralized Error Handler Middleware
 *
 * Catches all errors propagated via next(err) in controllers.
 * Provides consistent JSON error responses across the API.
 * Must be registered as the LAST middleware in app.js.
 */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';

  if (statusCode === 500) {
    console.error('❌ Internal Server Error:', err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;
