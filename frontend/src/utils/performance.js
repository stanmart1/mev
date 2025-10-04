/**
 * Enterprise performance monitoring for frontend
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: 0,
      apiCalls: 0,
      errors: 0,
      renderTimes: []
    };
    
    this.observers = new Map();
    this.initializeObservers();
  }

  initializeObservers() {
    // Performance Observer for navigation timing
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordPageLoad(entry);
          }
        }
      });
      
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navObserver);
    }

    // Long Task Observer
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordLongTask(entry);
        }
      });
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        // Long task observer not supported
      }
    }
  }

  recordPageLoad(entry) {
    this.metrics.pageLoads++;
    
    const timing = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      request: entry.responseStart - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      dom: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      load: entry.loadEventEnd - entry.loadEventStart,
      total: entry.loadEventEnd - entry.fetchStart
    };
    
    console.log('Page Load Performance:', timing);
    
    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.sendMetrics('page_load', timing);
    }
  }

  recordLongTask(entry) {
    console.warn('Long Task Detected:', {
      duration: entry.duration,
      startTime: entry.startTime,
      name: entry.name
    });
    
    if (process.env.NODE_ENV === 'production') {
      this.sendMetrics('long_task', {
        duration: entry.duration,
        startTime: entry.startTime
      });
    }
  }

  recordAPICall(endpoint, duration, success) {
    this.metrics.apiCalls++;
    
    if (!success) {
      this.metrics.errors++;
    }
    
    const metric = {
      endpoint,
      duration,
      success,
      timestamp: Date.now()
    };
    
    if (process.env.NODE_ENV === 'production') {
      this.sendMetrics('api_call', metric);
    }
  }

  recordRenderTime(componentName, duration) {
    this.metrics.renderTimes.push({
      component: componentName,
      duration,
      timestamp: Date.now()
    });
    
    // Keep only last 100 render times
    if (this.metrics.renderTimes.length > 100) {
      this.metrics.renderTimes = this.metrics.renderTimes.slice(-100);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      webVitals: this.getWebVitals(),
      timestamp: Date.now()
    };
  }

  getWebVitals() {
    const vitals = {};
    
    // Get Core Web Vitals if available
    if ('PerformanceObserver' in window) {
      const entries = performance.getEntriesByType('navigation');
      if (entries.length > 0) {
        const nav = entries[0];
        vitals.fcp = nav.responseEnd - nav.fetchStart; // Simplified FCP
        vitals.lcp = nav.loadEventEnd - nav.fetchStart; // Simplified LCP
      }
    }
    
    return vitals;
  }

  sendMetrics(type, data) {
    // In production, send to monitoring service
    // fetch('/api/metrics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ type, data, timestamp: Date.now() })
    // }).catch(console.error);
  }

  cleanup() {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// React Performance Hook
export const usePerformanceMonitor = (componentName) => {
  const startTime = performance.now();
  
  return {
    recordRender: () => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordRenderTime(componentName, duration);
    }
  };
};