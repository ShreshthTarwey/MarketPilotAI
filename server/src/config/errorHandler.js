/**
 * errorHandler.js
 * Centralized error handling middleware for the Express REST API.
 * Catches route errors, unhandled rejections, and formats JSON responses.
 */

/**
 * Handles 404 Route Not Found errors.
 */
function handle404(req, res, next) {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested path '${req.originalUrl}' does not exist on this server.`,
    path: req.originalUrl
  });
}

/**
 * Global error handler middleware.
 * Intercepts route exceptions, validation failures, and server crashes.
 */
function globalErrorHandler(err, req, res, next) {
  console.error(`\n[Server Error Audit Log]:`);
  console.error(`Path: ${req.method} ${req.originalUrl}`);
  console.error(`Timestamp: ${new Date().toISOString()}`);
  console.error(err.stack || err);
  console.error(`==================================================\n`);

  // Detect rate limit limit errors from Groq/Yahoo/Tavily
  const isRateLimit = 
    (err.message && err.message.toLowerCase().includes('rate limit')) ||
    (err.status === 429) ||
    (err.statusCode === 429);

  if (isRateLimit) {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'API limits hit on Groq, Yahoo Finance, or Tavily Search. Please wait a few seconds and try again.',
      details: err.message
    });
  }

  // Handle Express body-parser JSON syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Malformed JSON body payload detected.',
      details: err.message
    });
  }

  // Standard server execution error fallback
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred during research execution.',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = {
  handle404,
  globalErrorHandler
};
