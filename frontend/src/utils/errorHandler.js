/**
 * Enterprise-grade error handling utility
 */

export class APIError extends Error {
  constructor(message, code, statusCode, details = {}) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends Error {
  constructor(message, field, value) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export const errorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  WEBSOCKET_CONNECTION_FAILED: 'WEBSOCKET_CONNECTION_FAILED'
};

export const handleAPIError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.error?.message || data?.message || 'API request failed';
    const code = data?.error?.code || getErrorCodeFromStatus(status);
    const apiError = new APIError(message, code, status, data?.error?.details);
    
    // Preserve retryAfter for rate limit errors
    if (status === 429 && data?.error?.retryAfter) {
      apiError.retryAfter = data.error.retryAfter;
    }
    
    return apiError;
  }
  
  if (error.request) {
    return new APIError('Network connection failed', errorCodes.NETWORK_ERROR, 0);
  }
  
  return new APIError(error.message, errorCodes.INTERNAL_SERVER_ERROR, 500);
};

const getErrorCodeFromStatus = (status) => {
  switch (status) {
    case 401: return errorCodes.AUTHENTICATION_FAILED;
    case 403: return errorCodes.AUTHORIZATION_FAILED;
    case 404: return errorCodes.RESOURCE_NOT_FOUND;
    case 422: return errorCodes.VALIDATION_ERROR;
    case 429: return errorCodes.RATE_LIMIT_EXCEEDED;
    default: return errorCodes.INTERNAL_SERVER_ERROR;
  }
};

export const logError = (error, context = {}) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack
    },
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  console.error('Application Error:', errorLog);
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // sendToMonitoringService(errorLog);
  }
};