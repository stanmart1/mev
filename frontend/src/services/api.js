import axios from 'axios';
import config from '../config';
import { mockMevOpportunities, mockMevStats } from '../utils/mockData';
import { handleAPIError, logError } from '../utils/errorHandler';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: config.api.baseURL,
      timeout: config.api.timeout,
    });

    this.isRefreshing = false;
    this.failedQueue = [];
    this.cancelTokens = new Map();
    
    this.setupInterceptors();
  }

  processQueue(error, token = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  async refreshTokenInternal() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');
      
      const response = await axios.post(`${config.api.baseURL}/auth/refresh`, {
        refreshToken
      });
      
      const { accessToken } = response.data.data || response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('token', accessToken); // Keep for backwards compatibility
      return accessToken;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      throw error;
    }
  }

  createCancelToken(key) {
    if (this.cancelTokens.has(key)) {
      this.cancelTokens.get(key).cancel('Request cancelled');
    }
    
    const cancelToken = axios.CancelToken.source();
    this.cancelTokens.set(key, cancelToken);
    return cancelToken.token;
  }

  cancelRequest(key) {
    if (this.cancelTokens.has(key)) {
      this.cancelTokens.get(key).cancel('Request cancelled by user');
      this.cancelTokens.delete(key);
    }
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        // Always read token fresh from localStorage on each request
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (token && token !== 'demo-token') {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        // Return response data directly
        return response.data;
      },
      async (error) => {
        const apiError = handleAPIError(error);
        logError(apiError, { endpoint: error.config?.url, method: error.config?.method });
        
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshTokenInternal();
            this.processQueue(null, newToken);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }
        
        return Promise.reject(apiError);
      }
    );
  }

  // MEV Opportunities
  async getMevOpportunities(params = {}) {
    if (config.app.enableMockData) {
      return {
        success: true,
        data: {
          opportunities: mockMevOpportunities,
          pagination: {
            total: mockMevOpportunities.length,
            limit: params.limit || 50,
            offset: params.offset || 0,
            hasNext: false
          }
        }
      };
    }
    const response = await this.client.get('/opportunities', { params });
    return response;
  }

  async getMevOpportunity(id) {
    if (config.app.enableMockData) {
      const opportunity = mockMevOpportunities.find(opp => opp.id === id);
      return { success: true, data: opportunity };
    }
    const { data } = await this.client.get(`/mev/opportunities/${id}`);
    return data;
  }

  async getMevStats(timeframe = '24h') {
    if (config.app.enableMockData) {
      return {
        ...mockMevStats,
        data: {
          ...mockMevStats.data,
          summary: {
            totalCalculations: 1247,
            averageExpectedProfit: 0.0456,
            profitablePercentage: 73.2,
            maxProfit: 2.34
          }
        }
      };
    }
    const response = await this.client.get('/profit/statistics', {
      params: { timeframe }
    });
    return response;
  }

  // Validators
  async getValidators(params = {}) {
    if (config.app.enableMockData) {
      return {
        success: true,
        data: { validators: [], pagination: { total: 0, limit: 50, offset: 0 } }
      };
    }
    const cancelToken = this.createCancelToken('validators');
    const { data } = await this.client.get('/validators', { params, cancelToken });
    return data;
  }

  async getValidator(address) {
    if (config.app.enableMockData) {
      return { success: true, data: null };
    }
    const { data } = await this.client.get(`/validators/${address}`);
    return data;
  }

  async getValidatorRankings(category, params = {}) {
    if (config.app.enableMockData) {
      return { success: true, data: { rankings: [] } };
    }
    const { data } = await this.client.get(`/validators/rankings/${category}`, { params });
    return data;
  }

  // Authentication
  async login(credentials) {
    const response = await this.client.post('/auth/login', credentials);
    return response;
  }

  async register(userData) {
    const response = await this.client.post('/auth/register', userData);
    return response;
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await this.client.post('/auth/refresh', { refreshToken });
    return response;
  }

  async verifyToken() {
    const response = await this.client.get('/auth/verify');
    return response;
  }

  async forgotPassword(email) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response;
  }

  async resetPassword(token, password) {
    const response = await this.client.post('/auth/reset-password', { token, password });
    return response;
  }

  async walletLogin(walletData) {
    const response = await this.client.post('/auth/wallet-login', walletData);
    return response;
  }

  // Profile Management
  async getProfile() {
    const response = await this.client.get('/profile');
    return response;
  }

  async updateProfile(data) {
    const response = await this.client.put('/profile', data);
    return response;
  }

  async updateUserPreferences(preferences) {
    const response = await this.client.put('/profile/preferences', preferences);
    return response;
  }

  async generateApiKey(name, permissions) {
    const response = await this.client.post('/profile/api-keys', { name, permissions });
    return response;
  }

  async revokeApiKey(keyId) {
    const response = await this.client.delete(`/profile/api-keys/${keyId}`);
    return response;
  }

  // Bundles
  async simulateBundle(opportunities) {
    if (config.app.enableMockData) {
      return {
        success: true,
        data: {
          bundleId: 'mock-bundle-' + Date.now(),
          estimatedProfit: 0.125,
          gasEstimate: 0.005,
          riskScore: 4,
          transactions: opportunities.length
        }
      };
    }
    const { data } = await this.client.post('/bundles/simulate', { opportunities });
    return data;
  }

  async executeBundle(bundleData) {
    if (config.app.enableMockData) {
      return {
        success: true,
        data: {
          bundleId: 'exec-bundle-' + Date.now(),
          status: 'submitted',
          estimatedConfirmation: Date.now() + 30000
        }
      };
    }
    const { data } = await this.client.post('/bundles/execute', bundleData);
    return data;
  }

  async getBundleStatus(bundleId) {
    if (config.app.enableMockData) {
      const statuses = ['pending', 'confirmed', 'failed'];
      return {
        success: true,
        data: {
          bundleId,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          confirmedAt: new Date(),
          txHash: '0x' + Math.random().toString(16).substr(2, 64)
        }
      };
    }
    const { data } = await this.client.get(`/bundles/${bundleId}/status`);
    return data;
  }

  async getBundles(params = {}) {
    if (config.app.enableMockData) {
      return { success: true, data: { bundles: [] } };
    }
    const { data } = await this.client.get('/bundles', { params });
    return data;
  }

  // Profit Calculations
  async calculateProfit(opportunity) {
    if (config.app.enableMockData) {
      return {
        success: true,
        data: {
          expectedProfit: opportunity.estimated_profit_sol || 0.05,
          riskScore: opportunity.execution_risk_score || 5,
          confidence: 0.85
        }
      };
    }
    const { data } = await this.client.post('/profit/calculate', { opportunity });
    return data;
  }

  async getProfitHistory(params = {}) {
    if (config.app.enableMockData) {
      return { success: true, data: { calculations: [] } };
    }
    const { data } = await this.client.get('/profit/history', { params });
    return data;
  }

  // Searcher Performance
  async getSearcherPerformance(userId, params = {}) {
    if (config.app.enableMockData) {
      return {
        success: true,
        data: {
          bundlesSubmitted: 156,
          bundlesExecuted: 124,
          successRate: 79.5,
          totalProfit: 12.45,
          totalProfitUSD: 1867.50,
          bestOpportunity: { profit: 2.34, type: 'arbitrage' },
          networkAverage: { successRate: 65.2, avgProfit: 0.08 },
          comparison: [
            { metric: 'Success Rate', you: 79.5, network: 65.2 },
            { metric: 'Avg Profit', you: 0.08, network: 0.06 }
          ],
          opportunityTypes: [
            { name: 'Arbitrage', value: 67 },
            { name: 'Liquidation', value: 23 },
            { name: 'Sandwich', value: 10 }
          ],
          transactions: [],
          profitTrend: [],
          goals: [
            { name: 'Monthly Profit Target', current: 12.45, target: 10 },
            { name: 'Success Rate Goal', current: 79.5, target: 80 },
            { name: 'Bundles Executed', current: 124, target: 100 }
          ]
        }
      };
    }
    const response = await this.client.get(`/searcher-performance/${userId}`, { params });
    return response;
  }

  // Analytics
  async getAnalytics(params = {}) {
    if (config.app.enableMockData) {
      return {
        success: true,
        data: {
          profitOverTime: [
            { time: '00:00', opportunities: 12, profit: 0.45 },
            { time: '04:00', opportunities: 8, profit: 0.32 },
            { time: '08:00', opportunities: 15, profit: 0.67 },
            { time: '12:00', opportunities: 22, profit: 0.89 },
            { time: '16:00', opportunities: 18, profit: 0.73 },
            { time: '20:00', opportunities: 14, profit: 0.56 }
          ],
          profitDistribution: [
            { range: '0-0.01', count: 45, profit: 0.23 },
            { range: '0.01-0.05', count: 32, profit: 0.89 },
            { range: '0.05-0.1', count: 18, profit: 1.34 },
            { range: '0.1+', count: 12, profit: 2.67 }
          ],
          opportunityTypes: [
            { name: 'Arbitrage', value: 45, count: 67 },
            { name: 'Liquidation', value: 30, count: 23 },
            { name: 'Sandwich', value: 25, count: 18 }
          ]
        }
      };
    }
    const response = await this.client.get('/analytics', { params });
    return response;
  }

  // Network Status
  async getNetworkStatus() {
    if (config.app.enableMockData) {
      return {
        success: true,
        data: {
          solana: { status: 'healthy', tps: 2847, slot: 245678901 },
          mevDetection: { status: 'active', opportunitiesDetected: 1247 },
          jitoIntegration: { status: 'connected', bundlesSubmitted: 89 }
        }
      };
    }
    const { data } = await this.client.get('/network/status');
    return data;
  }

  // Jito Integration
  async submitJitoBundle(bundle) {
    if (config.app.enableMockData) {
      return {
        success: true,
        data: { bundleId: 'jito-' + Date.now(), status: 'submitted' }
      };
    }
    const { data } = await this.client.post('/jito/bundles/submit', bundle);
    return data;
  }

  async getJitoPerformance(timeframe = '24h') {
    if (config.app.enableMockData) {
      return {
        success: true,
        data: { successRate: 0.87, avgLatency: 245, totalBundles: 1247 }
      };
    }
    const { data } = await this.client.get('/jito/performance', { params: { timeframe } });
    return data;
  }

  // Market Intelligence
  async getMarketIntelligence(params = {}) {
    if (config.app.enableMockData) {
      return {
        success: true,
        data: {
          metrics: {
            totalVolume: 1247.56,
            volumeChange: 12.3,
            efficiency: 78.5,
            avgSpread: 1.2,
            competitionIndex: 67,
            activeSearchers: 234
          },
          tokenPairs: [],
          dexActivity: [],
          competitionLevels: [],
          volumeTrend: [],
          efficiencyTrend: [],
          correlations: { solPrice: [], tradingVolume: [], solPriceCorr: '0.72', tradingVolumeCorr: '0.85' },
          sentiment: { overall: 72, trend: 'Bullish', indicators: [] },
          opportunityDistribution: [],
          trends: []
        }
      };
    }
    const response = await this.client.get('/market-intelligence', { params });
    return response;
  }

  // Generic HTTP methods for education and other endpoints
  async get(url, config = {}) {
    return await this.client.get(url, config);
  }

  async post(url, data = {}, config = {}) {
    return await this.client.post(url, data, config);
  }

  async put(url, data = {}, config = {}) {
    return await this.client.put(url, data, config);
  }

  async delete(url, config = {}) {
    return await this.client.delete(url, config);
  }
}

export default new ApiService();