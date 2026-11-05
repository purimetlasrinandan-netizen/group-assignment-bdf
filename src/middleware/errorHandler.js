/**
 * Centralized Error Handling Middleware
 */

function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  // SQLite foreign key constraint violation
  if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
    return res.status(400).json({
      error: 'Foreign key constraint failed',
      message: 'Referenced photographer or camera does not exist.'
    });
  }

  // SQLite UNIQUE constraint violation
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    return res.status(409).json({
      error: 'Unique constraint conflict',
      message: 'A record with this unique value already exists.'
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};

