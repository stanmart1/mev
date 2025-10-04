const cache = require('../../src/services/cacheService');

describe('CacheService', () => {
  beforeEach(() => {
    cache.clear();
  });

  describe('set and get', () => {
    it('should store and retrieve value', () => {
      cache.set('test-key', { data: 'test' }, 60);
      const value = cache.get('test-key');
      expect(value).toEqual({ data: 'test' });
    });

    it('should return null for non-existent key', () => {
      const value = cache.get('non-existent');
      expect(value).toBeNull();
    });

    it('should expire after TTL', (done) => {
      cache.set('expire-key', 'value', 1);
      setTimeout(() => {
        const value = cache.get('expire-key');
        expect(value).toBeNull();
        done();
      }, 1100);
    });
  });

  describe('delete', () => {
    it('should delete cached value', () => {
      cache.set('delete-key', 'value', 60);
      cache.delete('delete-key');
      const value = cache.get('delete-key');
      expect(value).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      cache.set('has-key', 'value', 60);
      expect(cache.has('has-key')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('no-key')).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('should fetch and cache on miss', async () => {
      const fetchFn = jest.fn().mockResolvedValue('fetched-value');
      const value = await cache.getOrSet('fetch-key', fetchFn, 60);
      
      expect(value).toBe('fetched-value');
      expect(fetchFn).toHaveBeenCalledTimes(1);
      
      const cachedValue = cache.get('fetch-key');
      expect(cachedValue).toBe('fetched-value');
    });

    it('should return cached value on hit', async () => {
      cache.set('cached-key', 'cached-value', 60);
      const fetchFn = jest.fn();
      
      const value = await cache.getOrSet('cached-key', fetchFn, 60);
      
      expect(value).toBe('cached-value');
      expect(fetchFn).not.toHaveBeenCalled();
    });
  });
});
