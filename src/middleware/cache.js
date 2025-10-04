const cache = require('../services/cacheService');

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (ttl = 3600) => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}:${req.user?.userId || 'anonymous'}`;
    const cached = cache.get(key);

    if (cached) {
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, data, ttl);
      return originalJson(data);
    };

    next();
  };
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Cache key pattern
 */
const invalidateCache = (pattern) => {
  const stats = cache.getStats();
  stats.keys.forEach(key => {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  });
};

module.exports = {
  cacheMiddleware,
  invalidateCache
};
