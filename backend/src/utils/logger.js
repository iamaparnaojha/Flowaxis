'use strict';

const morgan = require('morgan');
const env = require('../config/env');

// Aparna: Surface the authenticated caller's ID in every log line.
// This makes tracing "who did what" trivial in production logs.
morgan.token('caller-id', (req) => req.caller?.id ?? 'anonymous');

const devFormat = ':method :url :status :response-time ms — user::caller-id';
const prodFormat = ':remote-addr - :method :url :status :res[content-length] :response-time ms — user::caller-id';

const requestLogger = morgan(env.NODE_ENV === 'production' ? prodFormat : devFormat, {
  // Health check pings are noise — skip them
  skip: (req) => req.url === '/health',
});

module.exports = { requestLogger };
