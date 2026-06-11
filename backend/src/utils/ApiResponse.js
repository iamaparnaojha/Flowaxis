'use strict';

/**
 * Aparna: Every success response goes through here to guarantee shape consistency.
 * The frontend can always trust { success, message, data } — no surprises.
 */
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
  }

  static created(res, data, message = 'Created successfully') {
    return res.status(201).json(new ApiResponse(201, data, message));
  }

  static noContent(res) {
    return res.sendStatus(204);
  }
}

module.exports = ApiResponse;
