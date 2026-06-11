'use strict';

/**
 * Aparna: All thrown errors in this codebase are ApiError instances.
 * This gives the error handler a single, predictable shape to work with,
 * and separates operational errors (expected, user-facing) from programmer
 * errors (unexpected crashes) using the isOperational flag.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Insufficient permissions') {
    return new ApiError(403, message);
  }

  static notFound(resource = 'Resource') {
    return new ApiError(404, `${resource} not found`);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  static internal(message = 'An unexpected error occurred') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
