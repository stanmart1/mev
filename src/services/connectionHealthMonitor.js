const logger = require('../config/logger');

class ConnectionHealthMonitor {
  constructor() {
    this.health = {
      rpcStatus: 'unknown',
      lastSuccessfulRequest: null,
      consecutiveFailures: 0,
      totalRequests: 0,
      successfulRequests: 0,
      rateLimitedRequests: 0,
      averageResponseTime: 0,
      isHealthy: true
    };
    
    this.maxConsecutiveFailures = 5;
    this.healthCheckInterval = 60000; // 1 minute
    this.startHealthCheck();
  }

  recordRequest(success, responseTime = 0, isRateLimit = false) {
    this.health.totalRequests++;
    
    if (success) {
      this.health.successfulRequests++;
      this.health.consecutiveFailures = 0;
      this.health.lastSuccessfulRequest = new Date();
      this.health.rpcStatus = 'healthy';
      
      // Update average response time
      if (responseTime > 0) {
        this.health.averageResponseTime = 
          (this.health.averageResponseTime * (this.health.successfulRequests - 1) + responseTime) / 
          this.health.successfulRequests;
      }
    } else {
      this.health.consecutiveFailures++;
      
      if (isRateLimit) {
        this.health.rateLimitedRequests++;
        this.health.rpcStatus = 'rate_limited';
      } else {
        this.health.rpcStatus = 'error';
      }
    }
    
    // Update health status
    this.health.isHealthy = this.health.consecutiveFailures < this.maxConsecutiveFailures;
    
    // Log health warnings
    if (this.health.consecutiveFailures >= 3) {
      logger.warn(`RPC Health Warning: ${this.health.consecutiveFailures} consecutive failures`);
    }
    
    if (this.health.rateLimitedRequests > 10) {
      logger.warn(`RPC Rate Limiting: ${this.health.rateLimitedRequests} rate limited requests`);
    }
  }

  startHealthCheck() {
    setInterval(() => {
      this.logHealthStatus();
      this.resetCountersIfNeeded();
    }, this.healthCheckInterval);
  }

  logHealthStatus() {
    const successRate = this.health.totalRequests > 0 ? 
      (this.health.successfulRequests / this.health.totalRequests * 100).toFixed(1) : 0;
    
    logger.info('RPC Health Status:', {
      status: this.health.rpcStatus,
      isHealthy: this.health.isHealthy,
      successRate: `${successRate}%`,
      consecutiveFailures: this.health.consecutiveFailures,
      rateLimitedRequests: this.health.rateLimitedRequests,
      avgResponseTime: `${this.health.averageResponseTime.toFixed(0)}ms`,
      lastSuccess: this.health.lastSuccessfulRequest
    });
  }

  resetCountersIfNeeded() {
    // Reset counters every hour to prevent overflow
    if (this.health.totalRequests > 1000) {
      const successRate = this.health.successfulRequests / this.health.totalRequests;
      
      this.health.totalRequests = 100;
      this.health.successfulRequests = Math.floor(100 * successRate);
      this.health.rateLimitedRequests = Math.floor(this.health.rateLimitedRequests * 0.5);
    }
  }

  getHealth() {
    return { ...this.health };
  }

  isRpcHealthy() {
    return this.health.isHealthy && this.health.rpcStatus !== 'rate_limited';
  }

  shouldReduceActivity() {
    return this.health.consecutiveFailures >= 2 || 
           this.health.rateLimitedRequests > 5 ||
           this.health.rpcStatus === 'rate_limited';
  }

  getRecommendedDelay() {
    if (this.health.rpcStatus === 'rate_limited') {
      return Math.min(30000, 5000 * this.health.rateLimitedRequests); // Up to 30s
    }
    
    if (this.health.consecutiveFailures > 0) {
      return Math.min(15000, 2000 * this.health.consecutiveFailures); // Up to 15s
    }
    
    return 0;
  }
}

module.exports = ConnectionHealthMonitor;