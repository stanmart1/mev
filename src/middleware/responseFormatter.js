/**
 * Response formatter middleware for consistent API responses
 */

const formatSuccessResponse = (data, message = null, meta = {}) => {
  return {
    success: true,
    data,
    message,
    meta,
    timestamp: new Date().toISOString()
  };
};

const formatErrorResponse = (error, code = 'INTERNAL_ERROR', statusCode = 500) => {
  return {
    success: false,
    error: {
      message: error.message || error,
      code,
      statusCode
    },
    timestamp: new Date().toISOString()
  };
};

const responseFormatter = (req, res, next) => {
  // Add helper methods to response object
  res.success = (data, message = null, meta = {}) => {
    return res.json(formatSuccessResponse(data, message, meta));
  };

  res.error = (error, code = 'INTERNAL_ERROR', statusCode = 500) => {
    return res.status(statusCode).json(formatErrorResponse(error, code, statusCode));
  };

  next();
};

module.exports = {
  responseFormatter,
  formatSuccessResponse,
  formatErrorResponse
};