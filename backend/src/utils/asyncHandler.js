'use strict';

/**
 * Aparna: Eliminates try-catch boilerplate from every controller.
 * Any unhandled promise rejection in a route handler gets forwarded
 * to Express's centralized error middleware automatically.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
