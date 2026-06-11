'use strict';

const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/**
 * Aparna: All errors flow here. Operational errors (ApiError instances) get
 * a clean JSON response; unexpected crashes get logged and return a generic 500.
 * This keeps stack traces out of API responses in production.
 */
const errorHandler = (err, req, res, _next) => {
  // Always log the full error internally
  if (env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${req.method} ${req.url} — ${err.message}`);
    if (!err.isOperational) console.error(err.stack);
  }

  // Mongoose validation error — shape it into our standard format
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // MongoDB duplicate key error (e.g., email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] ?? 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
      errors: [],
    });
  }

  // Malformed MongoDB ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field: ${err.path}`,
      errors: [],
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // Unexpected crash — hide internals from clients in production
  const message =
    env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message;

  return res.status(500).json({ success: false, message, errors: [] });
};

module.exports = errorHandler;
