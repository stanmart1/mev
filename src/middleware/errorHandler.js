/**
 * Global Error Handling Middleware
 * Comprehensive error handling for the MEV Analytics API
 */

const logger = require('../config/logger');

// Error types and codes
const ERROR_TYPES = {
    VALIDATION_ERROR: { status: 400, message: 'Validation failed' },
    AUTHENTICATION_ERROR: { status: 401, message: 'Authentication required' },
    AUTHORIZATION_ERROR: { status: 403, message: 'Insufficient permissions' },
    NOT_FOUND_ERROR: { status: 404, message: 'Resource not found' },
    RATE_LIMIT_ERROR: { status: 429, message: 'Rate limit exceeded' },
    DATABASE_ERROR: { status: 500, message: 'Database operation failed' },
    INTERNAL_ERROR: { status: 500, message: 'Internal server error' }
};

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
    constructor(type, message, details = null) {
        super(message);
        this.name = 'ApiError';
        this.type = type;
        this.status = ERROR_TYPES[type]?.status || 500;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    
    // Log request
    logger.info('API Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId,
        apiKey: req.apiKey?.id
    });

    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('API Response', {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.userId
        });
    });

    next();
}

/**
 * Request validation middleware
 */
function validateRequest(req, res, next) {
    // Check content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (!req.is('application/json')) {
            return res.status(400).json({
                error: 'Content-Type must be application/json',
                code: 'INVALID_CONTENT_TYPE'
            });
        }
    }

    // Check request size
    if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 10 * 1024 * 1024) {
        return res.status(413).json({
            error: 'Request entity too large',
            code: 'PAYLOAD_TOO_LARGE'
        });
    }

    next();
}

/**
 * Database error handler
 */
function handleDatabaseError(error) {
    if (error.code) {
        switch (error.code) {
            case '23505': // Unique violation
                return new ApiError('VALIDATION_ERROR', 'Duplicate entry', { field: error.detail });
            case '23503': // Foreign key violation
                return new ApiError('VALIDATION_ERROR', 'Referenced resource not found');
            case '23502': // Not null violation
                return new ApiError('VALIDATION_ERROR', 'Required field missing', { field: error.column });
            case '42P01': // Undefined table
                return new ApiError('DATABASE_ERROR', 'Database schema error');
            case 'ECONNREFUSED':
            case 'ENOTFOUND':
                return new ApiError('DATABASE_ERROR', 'Database connection failed');
            default:
                return new ApiError('DATABASE_ERROR', 'Database operation failed');
        }
    }
    return new ApiError('DATABASE_ERROR', error.message);
}

/**
 * Main error handling middleware
 */
function errorHandler(err, req, res, next) {
    // If response already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(err);
    }

    let error = err;

    // Handle different error types
    if (!(error instanceof ApiError)) {
        if (error.name === 'ValidationError') {
            error = new ApiError('VALIDATION_ERROR', error.message, error.details);
        } else if (error.name === 'UnauthorizedError') {
            error = new ApiError('AUTHENTICATION_ERROR', 'Invalid token');
        } else if (error.code && error.code.startsWith('23')) {
            error = handleDatabaseError(error);
        } else {
            error = new ApiError('INTERNAL_ERROR', error.message);
        }
    }

    // Log error
    logger.error('API Error', {
        type: error.type,
        message: error.message,
        status: error.status,
        stack: error.stack,
        url: req.url,
        method: req.method,
        userId: req.user?.userId,
        details: error.details
    });

    // Send error response
    const response = {
        error: error.message,
        code: error.type || 'INTERNAL_ERROR',
        timestamp: error.timestamp || new Date().toISOString()
    };

    // Include details in development
    if (process.env.NODE_ENV === 'development' && error.details) {
        response.details = error.details;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
        response.stack = error.stack;
    }

    res.status(error.status || 500).json(response);
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
    });
}

/**
 * Health check middleware
 */
function healthCheck(req, res, next) {
    if (req.path === '/health' || req.path === '/healthz') {
        return res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0'
        });
    }
    next();
}

/**
 * Response formatting middleware
 */
function formatResponse(req, res, next) {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Only format JSON responses
        if (res.get('Content-Type')?.includes('application/json')) {
            try {
                const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                
                // Add metadata to successful responses
                if (res.statusCode >= 200 && res.statusCode < 300 && parsed && !parsed.error) {
                    if (!parsed.metadata) {
                        parsed.metadata = {};
                    }
                    parsed.metadata.timestamp = new Date().toISOString();
                    parsed.metadata.request_id = req.id || req.headers['x-request-id'];
                }
                
                data = JSON.stringify(parsed);
            } catch (e) {
                // If parsing fails, send original data
            }
        }
        
        originalSend.call(this, data);
    };
    
    next();
}

/**
 * CORS configuration
 */
function corsConfig() {
    return {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
        exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
        credentials: true,
        maxAge: 86400 // 24 hours
    };
}

module.exports = {
    ApiError,
    ERROR_TYPES,
    requestLogger,
    validateRequest,
    errorHandler,
    notFoundHandler,
    healthCheck,
    formatResponse,
    corsConfig,
    handleDatabaseError
};