const { Connection, PublicKey } = require('@solana/web3.js');
const logger = require('../config/logger');

class RateLimitedSolanaService {
  constructor(rpcUrl, options = {}) {
    this.connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: options.wsEndpoint,
      httpHeaders: options.httpHeaders,
      fetch: this.createRateLimitedFetch()
    });
    
    // Rate limiting configuration
    this.requestQueue = [];
    this.activeRequests = 0;
    this.maxConcurrentRequests = 3; // Reduced from default
    this.requestsPerSecond = 5; // Conservative rate limit
    this.requestInterval = 1000 / this.requestsPerSecond;
    this.lastRequestTime = 0;
    
    // Exponential backoff for 429 errors
    this.backoffMultiplier = 2;
    this.maxBackoffDelay = 30000; // 30 seconds max
    this.currentBackoffDelay = 1000; // Start with 1 second
    
    // Request statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      rateLimitedRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now()
    };
    
    this.startRequestProcessor();
  }

  createRateLimitedFetch() {
    return async (url, options) => {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({
          url,
          options,
          resolve,
          reject,
          timestamp: Date.now()
        });
      });
    };
  }

  startRequestProcessor() {
    setInterval(() => {
      this.processRequestQueue();
    }, this.requestInterval);
  }

  async processRequestQueue() {
    if (this.requestQueue.length === 0 || 
        this.activeRequests >= this.maxConcurrentRequests) {
      return;
    }

    const now = Date.now();
    if (now - this.lastRequestTime < this.requestInterval) {
      return;
    }

    const request = this.requestQueue.shift();
    if (!request) return;

    this.activeRequests++;
    this.lastRequestTime = now;
    this.stats.totalRequests++;

    try {
      const startTime = Date.now();
      const response = await this.executeRequest(request.url, request.options);
      const responseTime = Date.now() - startTime;
      
      // Update average response time
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * this.stats.successfulRequests + responseTime) / 
        (this.stats.successfulRequests + 1);
      
      this.stats.successfulRequests++;
      this.currentBackoffDelay = 1000; // Reset backoff on success
      
      request.resolve(response);
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        this.handleRateLimit(request);
      } else {
        this.stats.failedRequests++;
        request.reject(error);
      }
    } finally {
      this.activeRequests--;
    }
  }

  async executeRequest(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      if (response.status === 429) {
        throw new Error(`429 Too Many Requests: ${await response.text()}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  handleRateLimit(request) {
    this.stats.rateLimitedRequests++;
    
    logger.warn(`Rate limited. Retrying after ${this.currentBackoffDelay}ms delay...`);
    
    // Exponential backoff
    setTimeout(() => {
      this.requestQueue.unshift(request); // Put back at front of queue
    }, this.currentBackoffDelay);
    
    this.currentBackoffDelay = Math.min(
      this.currentBackoffDelay * this.backoffMultiplier,
      this.maxBackoffDelay
    );
  }

  // Wrapper methods for common Solana operations
  async getSignaturesForAddress(address, options = {}) {
    // Limit the number of signatures requested
    const limitedOptions = {
      ...options,
      limit: Math.min(options.limit || 5, 5) // Max 5 signatures per request
    };
    
    return this.connection.getSignaturesForAddress(address, limitedOptions);
  }

  async getTransaction(signature, options = {}) {
    return this.connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
      ...options
    });
  }

  async getAccountInfo(address, options = {}) {
    return this.connection.getAccountInfo(address, {
      commitment: 'confirmed',
      ...options
    });
  }

  async getProgramAccounts(programId, options = {}) {
    // Limit the number of accounts returned
    const limitedOptions = {
      ...options,
      dataSlice: options.dataSlice || { offset: 0, length: 0 } // Minimal data
    };
    
    return this.connection.getProgramAccounts(programId, limitedOptions);
  }

  getStats() {
    const now = Date.now();
    const timeSinceReset = now - this.stats.lastResetTime;
    
    return {
      ...this.stats,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      requestsPerSecond: this.stats.totalRequests / (timeSinceReset / 1000),
      successRate: this.stats.totalRequests > 0 ? 
        (this.stats.successfulRequests / this.stats.totalRequests) * 100 : 0,
      currentBackoffDelay: this.currentBackoffDelay
    };
  }

  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      rateLimitedRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now()
    };
  }
}

module.exports = RateLimitedSolanaService;