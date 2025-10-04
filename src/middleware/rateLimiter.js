/**
 * Simple in-memory rate limiter
 * For production, use Redis-backed rate limiter
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.startCleanupInterval();
  }

  /**
   * Check if request is allowed
   * @param {string} key - Identifier (user ID, IP, etc)
   * @param {number} limit - Max requests
   * @param {number} window - Time window in seconds
   * @returns {Object} { allowed, remaining, resetTime }
   */
  check(key, limit, window) {
    const now = Date.now();
    const windowMs = window * 1000;
    const resetTime = now + windowMs;

    if (!this.requests.has(key)) {
      this.requests.set(key, {
        count: 1,
        resetTime
      });
      return { allowed: true, remaining: limit - 1, resetTime };
    }

    const record = this.requests.get(key);

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = resetTime;
      return { allowed: true, remaining: limit - 1, resetTime: record.resetTime };
    }

    if (record.count >= limit) {
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      };
    }

    record.count++;
    return { 
      allowed: true, 
      remaining: limit - record.count, 
      resetTime: record.resetTime 
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Reset rate limit for key
   * @param {string} key
   */
  reset(key) {
    this.requests.delete(key);
  }
}

const limiter = new RateLimiter();

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limit options
 * @returns {Function} Express middleware
 */
const rateLimitMiddleware = (options = {}) => {
  const {
    limit = 100,
    window = 60,
    keyGenerator = (req) => req.user?.userId || req.ip,
    message = 'Too many requests, please try again later'
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const result = limiter.check(key, limit, window);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);
      return res.status(429).json({
        success: false,
        message,
        retryAfter: result.retryAfter
      });
    }

    next();
  };
};

module.exports = {
  rateLimitMiddleware,
  limiter
};
