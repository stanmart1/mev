const { limiter } = require('../../src/middleware/rateLimiter');

describe('RateLimiter', () => {
  beforeEach(() => {
    limiter.requests.clear();
  });

  describe('check', () => {
    it('should allow requests within limit', () => {
      const result1 = limiter.check('user1', 5, 60);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);

      const result2 = limiter.check('user1', 5, 60);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it('should block requests exceeding limit', () => {
      for (let i = 0; i < 5; i++) {
        limiter.check('user2', 5, 60);
      }

      const result = limiter.check('user2', 5, 60);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should reset after window expires', (done) => {
      limiter.check('user3', 2, 1);
      limiter.check('user3', 2, 1);

      setTimeout(() => {
        const result = limiter.check('user3', 2, 1);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(1);
        done();
      }, 1100);
    });

    it('should track different users separately', () => {
      limiter.check('userA', 3, 60);
      limiter.check('userA', 3, 60);
      
      const resultA = limiter.check('userA', 3, 60);
      expect(resultA.remaining).toBe(0);

      const resultB = limiter.check('userB', 3, 60);
      expect(resultB.remaining).toBe(2);
    });
  });

  describe('reset', () => {
    it('should reset rate limit for user', () => {
      limiter.check('user4', 2, 60);
      limiter.check('user4', 2, 60);
      
      limiter.reset('user4');
      
      const result = limiter.check('user4', 2, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });
});
