const { EventEmitter } = require('events');

// Enhanced rate limiting with progressive lockout
const loginAttempts = new Map(); // email -> { count, firstAttempt, lockoutUntil, suspiciousIPs }
const ipAttempts = new Map(); // ip -> { count, firstAttempt, lockoutUntil }
const userRequests = new Map(); // userId -> [timestamps]

/**
 * Enhanced login rate limiting with progressive account lockout
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxAttempts - Maximum attempts before lockout
 * @returns {Function} Express middleware
 */
function enhancedLoginRateLimit(windowMs = 15 * 60 * 1000, maxAttempts = 5) {
    return async (req, res, next) => {
        const email = req.body.email?.toLowerCase();
        const ip = req.ip;
        const now = Date.now();
        
        if (!email) {
            return next();
        }

        // Check IP-based rate limiting first
        if (ipAttempts.has(ip)) {
            const ipData = ipAttempts.get(ip);
            
            if (ipData.lockoutUntil && now < ipData.lockoutUntil) {
                const remainingTime = Math.ceil((ipData.lockoutUntil - now) / 60000);
                return res.status(429).json({
                    error: `IP temporarily blocked. Try again in ${remainingTime} minutes.`,
                    code: 'IP_LOCKOUT',
                    retryAfter: Math.ceil((ipData.lockoutUntil - now) / 1000)
                });
            }
            
            // Reset if window has passed
            if (now - ipData.firstAttempt > windowMs) {
                ipAttempts.delete(ip);
            }
        }

        // Check email-based rate limiting
        if (loginAttempts.has(email)) {
            const attempts = loginAttempts.get(email);
            
            // Check if account is locked out
            if (attempts.lockoutUntil && now < attempts.lockoutUntil) {
                const remainingTime = Math.ceil((attempts.lockoutUntil - now) / 60000);
                return res.status(429).json({
                    error: `Account temporarily locked. Try again in ${remainingTime} minutes.`,
                    code: 'ACCOUNT_LOCKOUT',
                    retryAfter: Math.ceil((attempts.lockoutUntil - now) / 1000)
                });
            }
            
            // Reset if window has passed
            if (now - attempts.firstAttempt > windowMs) {
                loginAttempts.delete(email);
            } else if (attempts.count >= maxAttempts) {
                // Progressive lockout: 15min, 30min, 1hr, 2hr, 24hr
                const lockoutDurations = [15, 30, 60, 120, 1440]; // minutes
                const lockoutIndex = Math.min(attempts.lockoutCount || 0, lockoutDurations.length - 1);
                const lockoutMinutes = lockoutDurations[lockoutIndex];
                
                attempts.lockoutUntil = now + (lockoutMinutes * 60 * 1000);
                attempts.lockoutCount = (attempts.lockoutCount || 0) + 1;
                attempts.suspiciousIPs = attempts.suspiciousIPs || new Set();
                attempts.suspiciousIPs.add(ip);
                
                // Log security event
                logSecurityEvent('account_lockout', {
                    email,
                    ip,
                    lockoutMinutes,
                    lockoutCount: attempts.lockoutCount,
                    suspiciousIPCount: attempts.suspiciousIPs.size
                });
                
                return res.status(429).json({
                    error: `Account locked due to multiple failed attempts. Try again in ${lockoutMinutes} minutes.`,
                    code: 'ACCOUNT_LOCKOUT',
                    retryAfter: lockoutMinutes * 60
                });
            }
        }

        next();
    };
}

/**
 * Record failed login attempt
 * @param {string} email - Email address
 * @param {string} ip - IP address
 */
function recordFailedLogin(email, ip) {
    const now = Date.now();
    
    // Record email-based attempt
    if (loginAttempts.has(email)) {
        const attempts = loginAttempts.get(email);
        attempts.count++;
        attempts.suspiciousIPs = attempts.suspiciousIPs || new Set();
        attempts.suspiciousIPs.add(ip);
    } else {
        loginAttempts.set(email, {
            count: 1,
            firstAttempt: now,
            suspiciousIPs: new Set([ip])
        });
    }
    
    // Record IP-based attempt
    if (ipAttempts.has(ip)) {
        const attempts = ipAttempts.get(ip);
        attempts.count++;
        
        // Block IP after 20 failed attempts from different emails
        if (attempts.count >= 20) {
            attempts.lockoutUntil = now + (60 * 60 * 1000); // 1 hour
            logSecurityEvent('ip_lockout', { ip, attemptCount: attempts.count });
        }
    } else {
        ipAttempts.set(ip, {
            count: 1,
            firstAttempt: now
        });
    }
}

/**
 * Clear successful login attempts
 * @param {string} email - Email address
 */
function clearLoginAttempts(email) {
    if (loginAttempts.has(email)) {
        loginAttempts.delete(email);
    }
}

/**
 * Log security events
 * @param {string} eventType - Type of security event
 * @param {Object} details - Event details
 */
function logSecurityEvent(eventType, details) {
    console.log(`🚨 Security Event: ${eventType}`, {
        timestamp: new Date().toISOString(),
        ...details
    });
    
    // In production, this would integrate with your logging/monitoring system
    // Example: send to security monitoring service, database, etc.
}

const AuthenticationService = require('../services/authenticationService');
const AuthorizationService = require('../services/authorizationService');

/**
 * Authentication middleware for JWT tokens
 */
function authenticateToken(authService) {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

            if (!token) {
                return res.status(401).json({
                    error: 'Access token required',
                    code: 'TOKEN_REQUIRED'
                });
            }

            const decoded = await authService.verifyToken(token);
            if (!decoded) {
                return res.status(401).json({
                    error: 'Invalid or expired token',
                    code: 'INVALID_TOKEN'
                });
            }

            req.user = decoded;
            next();
        } catch (error) {
            res.status(500).json({
                error: 'Authentication error',
                code: 'AUTH_ERROR'
            });
        }
    };
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
function optionalAuth(authService) {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (token) {
                const decoded = await authService.verifyToken(token);
                if (decoded) {
                    req.user = decoded;
                }
            }

            next();
        } catch (error) {
            // Continue without authentication
            next();
        }
    };
}

/**
 * Role-based authorization middleware
 */
function requireRole(authzService, roles) {
    return authzService.createRoleMiddleware(roles);
}

/**
 * Permission-based authorization middleware
 */
function requirePermission(authzService, resource, action) {
    return authzService.createPermissionMiddleware(resource, action);
}

/**
 * Admin-only middleware
 */
function requireAdmin(authzService) {
    return authzService.createRoleMiddleware(['admin']);
}

/**
 * User must own resource or be admin
 */
function requireOwnershipOrAdmin(authzService) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Check if user is admin
            const isAdmin = await authzService.hasRole(req.user.userId, ['admin']);
            if (isAdmin) {
                return next();
            }

            // Check if user owns the resource
            const resourceUserId = req.params.userId || req.body.userId || req.query.userId;
            if (req.user.userId === resourceUserId) {
                return next();
            }

            return res.status(403).json({
                error: 'Access denied - insufficient permissions',
                code: 'ACCESS_DENIED'
            });

        } catch (error) {
            res.status(500).json({
                error: 'Authorization error',
                code: 'AUTHZ_ERROR'
            });
        }
    };
}

/**
 * Enhanced user-based rate limiting with tier-based limits
 */
function rateLimitByUser(windowMs = 15 * 60 * 1000, max = 100) {
    return (req, res, next) => {
        const userId = req.user?.userId;
        if (!userId) {
            return next();
        }

        const now = Date.now();
        const windowStart = now - windowMs;

        if (!userRequests.has(userId)) {
            userRequests.set(userId, []);
        }

        const requests = userRequests.get(userId);
        const recentRequests = requests.filter(time => time > windowStart);
        
        // Apply tier-based rate limiting
        const userRole = req.user?.role || 'user';
        const multiplier = getRateLimitMultiplier(userRole);
        const adjustedMax = max * multiplier;
        
        if (recentRequests.length >= adjustedMax) {
            logSecurityEvent('rate_limit_exceeded', {
                userId,
                role: userRole,
                requestCount: recentRequests.length,
                limit: adjustedMax
            });
            
            return res.status(429).json({
                error: 'Rate limit exceeded',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(windowMs / 1000),
                userTier: userRole
            });
        }

        recentRequests.push(now);
        userRequests.set(userId, recentRequests);

        // Clean up old entries periodically
        if (Math.random() < 0.01) {
            cleanupRateLimitData(windowMs);
        }

        next();
    };
}

/**
 * Get rate limit multiplier based on user role/subscription tier
 */
function getRateLimitMultiplier(role) {
    const multipliers = {
        'admin': 10,
        'enterprise': 5,
        'professional': 3,
        'developer': 2,
        'premium': 1.5,
        'user': 1
    };
    
    return multipliers[role] || 1;
}

/**
 * Clean up old rate limiting data
 */
function cleanupRateLimitData(windowMs) {
    const now = Date.now();
    const cutoff = now - windowMs;
    
    // Clean up user request data
    for (const [userId, times] of userRequests.entries()) {
        const recent = times.filter(time => time > cutoff);
        if (recent.length === 0) {
            userRequests.delete(userId);
        } else {
            userRequests.set(userId, recent);
        }
    }
    
    // Clean up login attempt data
    for (const [email, data] of loginAttempts.entries()) {
        if (!data.lockoutUntil && (now - data.firstAttempt) > windowMs) {
            loginAttempts.delete(email);
        }
    }
    
    // Clean up IP attempt data
    for (const [ip, data] of ipAttempts.entries()) {
        if (!data.lockoutUntil && (now - data.firstAttempt) > windowMs) {
            ipAttempts.delete(ip);
        }
    }
}

/**
 * Middleware to detect and flag suspicious activity
 */
function suspiciousActivityDetector(options = {}) {
    const {
        maxRequestsPerSecond = 10,
        maxUniqueEndpoints = 20,
        timeWindow = 60000 // 1 minute
    } = options;
    
    const userActivity = new Map(); // userId -> { requests: [], endpoints: Set }
    
    return (req, res, next) => {
        const userId = req.user?.userId;
        const ip = req.ip;
        const endpoint = req.path;
        const now = Date.now();
        
        if (userId) {
            if (!userActivity.has(userId)) {
                userActivity.set(userId, {
                    requests: [],
                    endpoints: new Set(),
                    suspiciousFlags: 0
                });
            }
            
            const activity = userActivity.get(userId);
            const windowStart = now - timeWindow;
            
            // Filter recent requests
            activity.requests = activity.requests.filter(time => time > windowStart);
            activity.requests.push(now);
            activity.endpoints.add(endpoint);
            
            // Check for suspicious patterns
            const requestRate = activity.requests.length / (timeWindow / 1000);
            const uniqueEndpoints = activity.endpoints.size;
            
            let suspiciousScore = 0;
            
            if (requestRate > maxRequestsPerSecond) {
                suspiciousScore += 30;
            }
            
            if (uniqueEndpoints > maxUniqueEndpoints) {
                suspiciousScore += 25;
            }
            
            // Pattern detection: rapid sequential requests
            if (activity.requests.length >= 5) {
                const recent5 = activity.requests.slice(-5);
                const timeDiff = recent5[4] - recent5[0];
                if (timeDiff < 5000) { // 5 requests in 5 seconds
                    suspiciousScore += 20;
                }
            }
            
            if (suspiciousScore >= 50) {
                activity.suspiciousFlags++;
                
                logSecurityEvent('suspicious_activity_detected', {
                    userId,
                    ip,
                    endpoint,
                    suspiciousScore,
                    requestRate,
                    uniqueEndpoints,
                    flagCount: activity.suspiciousFlags
                });
                
                // Add flag to request for downstream processing
                req.suspiciousActivity = {
                    score: suspiciousScore,
                    details: {
                        requestRate,
                        uniqueEndpoints,
                        flagCount: activity.suspiciousFlags
                    }
                };
            }
            
            // Clean up old endpoint data
            if (activity.requests.length === 0) {
                activity.endpoints.clear();
            }
        }
        
        next();
    };
}

module.exports = {
    authenticateToken,
    optionalAuth,
    requireRole,
    requirePermission,
    requireAdmin,
    requireOwnershipOrAdmin,
    rateLimitByUser,
    enhancedLoginRateLimit,
    recordFailedLogin,
    clearLoginAttempts,
    suspiciousActivityDetector,
    logSecurityEvent
};