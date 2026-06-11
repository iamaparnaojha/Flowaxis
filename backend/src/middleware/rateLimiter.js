'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Aparna: Auth routes are the primary brute-force target — rate limit them
 * separately from regular API routes. Adjust RATE_LIMIT_MAX via env.
 */
const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: `Too many requests. Try again after ${env.RATE_LIMIT_WINDOW_MS / 60000} minutes.`,
    errors: [],
  },
  keyGenerator: (req) => req.ip,
});

module.exports = { authRateLimiter };
