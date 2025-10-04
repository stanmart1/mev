/**
 * Performance monitoring utility
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }

  /**
   * Start timing an operation
   * @param {string} name - Operation name
   * @returns {Function} End function
   */
  start(name) {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.record(name, duration);
      return duration;
    };
  }

  /**
   * Record a metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   */
  record(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
        avg: 0
      });
    }

    const metric = this.metrics.get(name);
    metric.count++;
    metric.total += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.avg = metric.total / metric.count;
  }

  /**
   * Get metrics for an operation
   * @param {string} name - Operation name
   * @returns {Object|null}
   */
  getMetrics(name) {
    return this.metrics.get(name) || null;
  }

  /**
   * Get all metrics
   * @returns {Object}
   */
  getAllMetrics() {
    const result = {};
    for (const [name, metrics] of this.metrics.entries()) {
      result[name] = { ...metrics };
    }
    return result;
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics.clear();
  }

  /**
   * Express middleware for request timing
   * @returns {Function}
   */
  middleware() {
    return (req, res, next) => {
      const end = this.start(`${req.method} ${req.path}`);
      
      res.on('finish', () => {
        const duration = end();
        res.setHeader('X-Response-Time', `${duration}ms`);
      });
      
      next();
    };
  }
}

module.exports = new PerformanceMonitor();
