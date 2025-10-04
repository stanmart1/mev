/**
 * Enterprise monitoring and health check middleware
 */

const os = require('os');
const { performance } = require('perf_hooks');

class HealthMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
    
    this.startTime = Date.now();
    this.healthChecks = new Map();
    
    // Register default health checks
    this.registerHealthCheck('database', this.checkDatabase.bind(this));
    this.registerHealthCheck('memory', this.checkMemory.bind(this));
    this.registerHealthCheck('disk', this.checkDisk.bind(this));
  }

  registerHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, checkFunction);
  }

  async checkDatabase() {
    try {
      const pool = require('../config/database');
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      return { status: 'healthy', latency: 0 };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  checkMemory() {
    const usage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedPercent = ((totalMem - freeMem) / totalMem) * 100;
    
    return {
      status: usedPercent > 90 ? 'unhealthy' : 'healthy',
      usage: {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
        systemUsedPercent: Math.round(usedPercent)
      }
    };
  }

  checkDisk() {
    // Simplified disk check - in production use proper disk monitoring
    return { status: 'healthy', usage: 'N/A' };
  }

  async getHealthStatus() {
    const checks = {};
    let overallStatus = 'healthy';
    
    for (const [name, checkFn] of this.healthChecks) {
      try {
        checks[name] = await checkFn();
        if (checks[name].status === 'unhealthy') {
          overallStatus = 'unhealthy';
        }
      } catch (error) {
        checks[name] = { status: 'error', error: error.message };
        overallStatus = 'unhealthy';
      }
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    };
  }

  recordRequest(req, res, responseTime) {
    this.metrics.requests++;
    this.metrics.responseTime.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
    }
    
    if (res.statusCode >= 400) {
      this.metrics.errors++;
    }
  }

  getMetrics() {
    const responseTime = this.metrics.responseTime;
    const avgResponseTime = responseTime.length > 0 
      ? responseTime.reduce((a, b) => a + b, 0) / responseTime.length 
      : 0;
    
    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(this.metrics.cpu),
      timestamp: new Date().toISOString()
    };
  }
}

const healthMonitor = new HealthMonitor();

const requestMetrics = (req, res, next) => {
  const startTime = performance.now();
  
  res.on('finish', () => {
    const responseTime = performance.now() - startTime;
    healthMonitor.recordRequest(req, res, responseTime);
  });
  
  next();
};

const healthCheck = async (req, res, next) => {
  if (req.path === '/health') {
    const health = await healthMonitor.getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    return res.status(statusCode).json(health);
  }
  
  if (req.path === '/metrics') {
    return res.json(healthMonitor.getMetrics());
  }
  
  next();
};

module.exports = {
  HealthMonitor,
  healthMonitor,
  requestMetrics,
  healthCheck
};