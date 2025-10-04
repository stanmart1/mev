const redis = require('redis');

/**
 * Redis-based cache service
 */
class RedisCacheService {
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
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis connected');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Redis connection failed:', error.message);
      this.isConnected = false;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isConnected) return false;
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async delete(key) {
    if (!this.isConnected) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  async clear() {
    if (!this.isConnected) return false;
    try {
      await this.client.flushDb();
      return true;
    } catch (error) {
      console.error('Redis clear error:', error);
      return false;
    }
  }

  async has(key) {
    if (!this.isConnected) return false;
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Redis has error:', error);
      return false;
    }
  }

  async getOrSet(key, fetchFn, ttl = 3600) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    
    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }

  async getStats() {
    if (!this.isConnected) return { size: 0, keys: [] };
    try {
      const keys = await this.client.keys('*');
      return { size: keys.length, keys };
    } catch (error) {
      console.error('Redis stats error:', error);
      return { size: 0, keys: [] };
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

module.exports = new RedisCacheService();
