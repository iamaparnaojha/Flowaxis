'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Aparna: Factory middleware — call authorize('admin') or authorize('admin', 'user').
 * The authenticate middleware must run first to populate req.caller.
 */
const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.caller) {
    // This is a programming mistake, not a user mistake — 500, not 403
    throw ApiError.internal('authorize() used without authenticate() — check route definition');
  }

  const callerRole = req.caller.role;

  if (!allowedRoles.includes(callerRole)) {
    throw ApiError.forbidden(
      `This action requires one of: [${allowedRoles.join(', ')}]. Your role: ${callerRole}`
    );
  }

  next();
};

module.exports = authorize;
