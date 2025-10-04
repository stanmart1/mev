/**
 * Simple in-memory cache service
 * For production, replace with Redis
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
    this.startCleanupInterval();
  }

  /**
   * Set cache value with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  set(key, value, ttl = 3600) {
    this.cache.set(key, value);
    this.ttls.set(key, Date.now() + (ttl * 1000));
  }

  /**
   * Get cache value
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null
   */
  get(key) {
    if (!this.cache.has(key)) return null;
    
    const expiry = this.ttls.get(key);
    if (expiry && Date.now() > expiry) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.ttls.clear();
  }

  /**
   * Check if key exists and is valid
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Get or set pattern
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>}
   */
  async getOrSet(key, fetchFn, ttl = 3600) {
    const cached = this.get(key);
    if (cached !== null) return cached;
    
    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.ttls.entries()) {
      if (now > expiry) {
        this.delete(key);
      }
    }
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Get cache stats
   * @returns {Object}
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = new CacheService();
