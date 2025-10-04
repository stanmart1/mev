const redis = require('redis');

/**
 * Redis-based rate limiter
 */
class RedisRateLimiter {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connect();
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL
      });

      this.client.on('error', (err) => {
        console.error('Redis Rate Limiter Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Rate Limiter connected');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Redis Rate Limiter connection failed:', error.message);
      this.isConnected = false;
    }
  }

  async check(key, limit, window) {
    if (!this.isConnected) {
      return { allowed: true, remaining: limit, resetTime: Date.now() + (window * 1000) };
    }

    try {
      const redisKey = `ratelimit:${key}`;
      const now = Date.now();
      const windowMs = window * 1000;
      const resetTime = now + windowMs;

      const count = await this.client.incr(redisKey);
      
      if (count === 1) {
        await this.client.expire(redisKey, window);
      }

      const ttl = await this.client.ttl(redisKey);
      const actualResetTime = now + (ttl * 1000);

      if (count > limit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: actualResetTime,
          retryAfter: ttl
        };
      }

      return {
        allowed: true,
        remaining: limit - count,
        resetTime: actualResetTime
      };
    } catch (error) {
      console.error('Redis rate limit check error:', error);
      return { allowed: true, remaining: limit, resetTime: Date.now() + (window * 1000) };
    }
  }

  async reset(key) {
    if (!this.isConnected) return false;
    try {
      await this.client.del(`ratelimit:${key}`);
      return true;
    } catch (error) {
      console.error('Redis rate limit reset error:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

const limiter = new RedisRateLimiter();

const rateLimitMiddleware = (options = {}) => {
  const {
    limit = 100,
    window = 60,
    keyGenerator = (req) => req.user?.userId || req.ip,
    message = 'Too many requests, please try again later'
  } = options;

  return async (req, res, next) => {
    const key = keyGenerator(req);
    const result = await limiter.check(key, limit, window);

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
