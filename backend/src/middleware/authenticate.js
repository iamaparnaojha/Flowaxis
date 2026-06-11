'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Aparna: Injects `req.caller` with the verified token payload.
 * Controllers never touch JWT logic directly — they just read req.caller.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('No bearer token provided');
  }

  const rawToken = authHeader.slice(7);

  let decoded;
  try {
    decoded = jwt.verify(rawToken, env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired — use /auth/refresh');
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  // Attach caller identity so downstream middleware and controllers can use it
  req.caller = {
    id: decoded.sub,
    role: decoded.role,
  };

  next();
});

module.exports = authenticate;
