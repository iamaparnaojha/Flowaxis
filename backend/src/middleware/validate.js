'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Aparna: Factory that returns a middleware validating req against a Zod schema.
 * Accepts an object with `body`, `query`, and/or `params` schemas.
 * 
 * Usage: router.post('/', validate({ body: mySchema }), controller)
 */
const validate = (schemas) => (req, _res, next) => {
  const errors = [];

  for (const [source, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        errors.push({ field: issue.path.join('.'), message: issue.message });
      });
    } else {
      // Replace the raw input with the parsed (coerced + stripped) version
      req[source] = result.data;
    }
  }

  if (errors.length > 0) {
    throw ApiError.badRequest('Validation failed', errors);
  }

  next();
};

module.exports = validate;
