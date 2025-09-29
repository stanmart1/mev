const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const config = require('./config/config');
const logger = require('./config/logger');
const HybridTransactionMonitor = require('./services/hybridTransactionMonitor');
const LiquidationScanner = require('./services/liquidationScanner');
const pool = require('./config/database');

// Import WebSocket server
const MEVWebSocketServer = require('./services/webSocketServer');

// Import user management services
const AuthenticationService = require('./services/authenticationService');
const AuthorizationService = require('./services/authorizationService');
const ApiKeyService = require('./services/apiKeyService');
const createAuthRoutes = require('./routes/auth');
const { authenticateToken, optionalAuth } = require('./middleware/auth');

// Import delegation analytics services
const DelegationAnalyticsEngine = require('./services/delegationAnalyticsEngine');
const ValidatorRecommendationEngine = require('./services/validatorRecommendationEngine');
const UserProfileService = require('./services/userProfileService');
const delegationAnalyticsRoutes = require('./routes/delegationAnalytics');

// Import comprehensive API routes
const createMevOpportunitiesRoutes = require('./routes/mevOpportunities');
const createValidatorRankingsRoutes = require('./routes/validatorRankings');
const createHistoricalPerformanceRoutes = require('./routes/historicalPerformance');
const createProfitSimulationsRoutes = require('./routes/profitSimulations');
const createSearcherAnalyticsRoutes = require('./routes/searcherAnalytics');
const createUserProfileRoutes = require('./routes/userProfile');

// Import error handling middleware
const {
    requestLogger,
    validateRequest,
    errorHandler,
    notFoundHandler,
    healthCheck,
    formatResponse,
    corsConfig
} = require('./middleware/errorHandler');

// Initialize user management services
const authenticationService = new AuthenticationService(pool, config);
const authorizationService = new AuthorizationService(pool, config);
const apiKeyService = new ApiKeyService(pool, config);

// Initialize delegation analytics services
const userProfileService = new UserProfileService(pool, config);
const delegationAnalyticsEngine = new DelegationAnalyticsEngine(pool, null, null);
const validatorRecommendationEngine = new ValidatorRecommendationEngine(
  delegationAnalyticsEngine,
  userProfileService,
  pool
);

// Create services object for route handlers
const services = {
  authenticationService,
  authorizationService,
  apiKeyService,
  userProfileService,
  delegationAnalyticsEngine,
  validatorRecommendationEngine,
  pool // Add database pool to services
};

// Initialize MEV Bundle services
const MEVBundleConstructor = require('./services/mevBundleConstructor');
const TransactionOrderOptimizer = require('./services/transactionOrderOptimizer');
const GasCostCalculator = require('./services/gasCostCalculator');
const BundleRiskAssessment = require('./services/bundleRiskAssessment');
const OptimalBundleComposer = require('./services/optimalBundleComposer');

// Initialize bundle services
const bundleConstructor = new MEVBundleConstructor();
const bundleComposer = new OptimalBundleComposer();
const gasCostCalculator = new GasCostCalculator();
const bundleRiskAssessment = new BundleRiskAssessment();

// Initialize Jito Integration System
const JitoIntegrationService = require('./services/jitoIntegrationService');
const jitoIntegrationService = new JitoIntegrationService(
  null, // solanaService will be initialized later
  pool,
  {
    enableRealTimeComparison: false,
    autoOptimization: true,
    performanceTracking: true,
    simulationMode: 'full'
  }
);

// Initialize Comprehensive Profit Calculation Engine
const ComprehensiveProfitCalculationEngine = require('./services/comprehensiveProfitCalculationEngine');
const profitCalculationEngine = new ComprehensiveProfitCalculationEngine(
  null, // solanaService will be initialized later
  pool,
  {
    confidenceLevel: 0.95,
    monteCarloSamples: 10000,
    volatilityLookbackDays: 7
  }
);

const app = express();
const server = http.createServer(app);
const PORT = config.server.port;

// Initialize hybrid transaction monitor (WebSocket + Polling)
const transactionMonitor = new HybridTransactionMonitor();

// Initialize liquidation scanner
const liquidationScanner = new LiquidationScanner();

// Initialize WebSocket server with all required services
const webSocketServer = new MEVWebSocketServer(server, {
    ...services,
    transactionMonitor,
    liquidationScanner,
    validatorTracker: null, // Will be initialized when needed
    marketAnalyzer: null // Will be initialized when needed
}, config);

// Real-time event listeners
transactionMonitor.on('swapDetected', (swapData) => {
  logger.info(`Swap detected: ${swapData.tokenSymbolA}/${swapData.tokenSymbolB} on ${swapData.dex}`);
});

transactionMonitor.on('opportunityDetected', (opportunity) => {
  logger.info(`MEV opportunity detected: ${opportunity.type} with ${opportunity.profitPercent?.toFixed(2) || 'N/A'}% profit`);
  
  // Broadcast to WebSocket clients
  webSocketServer.broadcastToChannel(webSocketServer.channels.MEV_OPPORTUNITIES, {
    type: 'mev_opportunity',
    data: opportunity,
    timestamp: new Date().toISOString()
  });
});

transactionMonitor.on('arbitrageDetected', (arbitrage) => {
  logger.info(`🎯 Advanced Arbitrage: ${arbitrage.pair} - ${arbitrage.buyDex} → ${arbitrage.sellDex} | Profit: ${arbitrage.calculation.netProfitSOL.toFixed(6)} SOL (${arbitrage.calculation.profitPercent.toFixed(2)}%)`);
  
  // Broadcast arbitrage opportunity to WebSocket clients
  webSocketServer.broadcastToChannel(webSocketServer.channels.MEV_OPPORTUNITIES, {
    type: 'arbitrage_opportunity',
    data: arbitrage,
    timestamp: new Date().toISOString()
  });
});

liquidationScanner.on('liquidationOpportunity', (liquidation) => {
  logger.info(`💰 Liquidation Opportunity: ${liquidation.protocol} - Health: ${liquidation.healthFactor.toFixed(3)} | Profit: ${liquidation.profitSOL.toFixed(6)} SOL`);
  
  // Broadcast liquidation opportunity to WebSocket clients
  webSocketServer.broadcastToChannel(webSocketServer.channels.MEV_OPPORTUNITIES, {
    type: 'liquidation_opportunity',
    data: liquidation,
    timestamp: new Date().toISOString()
  });
});

liquidationScanner.on('scannerStarted', () => {
  logger.info('🔍 Liquidation scanner started successfully');
});

liquidationScanner.on('scannerStopped', () => {
  logger.info('🛑 Liquidation scanner stopped');
});

// Security middleware
app.use(helmet());
app.use(cors(corsConfig()));

// Request processing middleware
app.use(healthCheck);
app.use(requestLogger);
app.use(validateRequest);
app.use(formatResponse);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'MEV Analytics Platform API',
    version: '1.0.0',
    description: 'Comprehensive REST API for MEV opportunities, validator analytics, and profit simulations',
    documentation: 'https://docs.mev-analytics.com',
    endpoints: {
      authentication: '/api/auth/*',
      mev_opportunities: '/api/mev/*',
      validators: '/api/validators/*',
      history: '/api/history/*',
      simulations: '/api/simulations/*',
      searchers: '/api/searchers/*'
    }
  });
});

// Comprehensive API routes
app.use('/api/auth', createAuthRoutes(pool, config));
app.use('/api/profile', createUserProfileRoutes(pool, config));
app.use('/api/mev/opportunities', createMevOpportunitiesRoutes(pool, config, services));
app.use('/api/validators', createValidatorRankingsRoutes(pool, config, services));
app.use('/api/history', createHistoricalPerformanceRoutes(pool, config, services));
app.use('/api/simulations', createProfitSimulationsRoutes(pool, config, services));
app.use('/api/searchers', createSearcherAnalyticsRoutes(pool, config, services));

// Delegation analytics routes
app.use('/api/delegation-analytics', 
  authenticateToken(authenticationService),
  (req, res, next) => {
    req.db = pool;
    req.validatorRecommendationEngine = validatorRecommendationEngine;
    req.delegationAnalyticsEngine = delegationAnalyticsEngine;
    next();
  },
  delegationAnalyticsRoutes
);

// Protected routes with authentication
app.get('/api/status', optionalAuth(authenticationService), (req, res) => {
  res.json({
    message: 'Solana MEV Analytics API',
    version: '1.0.0',
    network: config.solana.network,
    monitor: transactionMonitor.getStatus(),
    liquidationScanner: liquidationScanner.getStatus(),
    authenticated: !!req.user,
    user: req.user ? { role: req.user.role, userId: req.user.userId } : null
  });
});

// Enhanced MEV opportunities endpoint with filtering and authentication
app.get('/api/opportunities', 
  apiKeyService.createApiKeyMiddleware(['basic-analytics', 'mev-detection']),
  async (req, res) => {
  try {
    const { type, dex, limit = 50, minProfit } = req.query;
    
    let query = 'SELECT * FROM mev_opportunities WHERE 1=1';
    let values = [];
    let paramIndex = 1;
    
    if (type) {
      query += ` AND opportunity_type = $${paramIndex}`;
      values.push(type);
      paramIndex++;
    }
    
    if (dex) {
      query += ` AND primary_dex = $${paramIndex}`;
      values.push(dex);
      paramIndex++;
    }
    
    if (minProfit) {
      query += ` AND estimated_profit_sol >= $${paramIndex}`;
      values.push(parseFloat(minProfit));
      paramIndex++;
    }
    
    query += ` ORDER BY detection_timestamp DESC LIMIT $${paramIndex}`;
    values.push(parseInt(limit));
    
    const client = await pool.connect();
    const result = await client.query(query, values);
    client.release();
    
    res.json({
      success: true,
      count: result.rows.length,
      opportunities: result.rows
    });
  } catch (error) {
    logger.error('Error fetching opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// Real-time swap data endpoint
app.get('/api/swaps', async (req, res) => {
  try {
    const { dex, tokenA, tokenB, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM dex_prices WHERE 1=1';
    let values = [];
    let paramIndex = 1;
    
    if (dex) {
      query += ` AND dex_name = $${paramIndex}`;
      values.push(dex);
      paramIndex++;
    }
    
    if (tokenA) {
      query += ` AND token_mint_a = $${paramIndex}`;
      values.push(tokenA);
      paramIndex++;
    }
    
    if (tokenB) {
      query += ` AND token_mint_b = $${paramIndex}`;
      values.push(tokenB);
      paramIndex++;
    }
    
    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    values.push(parseInt(limit));
    
    const client = await pool.connect();
    const result = await client.query(query, values);
    client.release();
    
    res.json({
      success: true,
      count: result.rows.length,
      swaps: result.rows
    });
  } catch (error) {
    logger.error('Error fetching swaps:', error);
    res.status(500).json({ error: 'Failed to fetch swap data' });
  }
});

// WebSocket server management endpoints
app.get('/api/websocket/stats', (req, res) => {
  try {
    const stats = webSocketServer.getServerStats();
    res.json({
      success: true,
      webSocketStats: stats
    });
  } catch (error) {
    logger.error('Error getting WebSocket stats:', error);
    res.status(500).json({ error: 'Failed to get WebSocket statistics' });
  }
});

// WebSocket testing endpoint
app.post('/api/websocket/test', (req, res) => {
  try {
    const { channel, data } = req.body;
    
    if (!channel || !Object.values(webSocketServer.channels).includes(channel)) {
      return res.status(400).json({ error: 'Valid channel required' });
    }
    
    webSocketServer.triggerTestMessage(channel, data || { test: true });
    
    res.json({
      success: true,
      message: `Test message sent to channel: ${channel}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error sending test WebSocket message:', error);
    res.status(500).json({ error: 'Failed to send test message' });
  }
});

// Price analysis endpoint
app.get('/api/prices/analysis', async (req, res) => {
  try {
    const { tokenA, tokenB, timeframe = '1h' } = req.query;
    
    if (!tokenA || !tokenB) {
      return res.status(400).json({ error: 'tokenA and tokenB parameters are required' });
    }
    
    const timeInterval = timeframe === '1h' ? '1 hour' : 
                        timeframe === '24h' ? '24 hours' : 
                        timeframe === '7d' ? '7 days' : '1 hour';
    
    const query = `
      SELECT 
        dex_name,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        COUNT(*) as trade_count,
        SUM(volume_24h_usd) as total_volume
      FROM dex_prices 
      WHERE token_mint_a = $1 AND token_mint_b = $2
      AND timestamp > NOW() - INTERVAL '${timeInterval}'
      GROUP BY dex_name
      ORDER BY avg_price DESC
    `;
    
    const client = await pool.connect();
    const result = await client.query(query, [tokenA, tokenB]);
    client.release();
    
    res.json({
      success: true,
      timeframe,
      tokenPair: `${tokenA}/${tokenB}`,
      analysis: result.rows
    });
  } catch (error) {
    logger.error('Error analyzing prices:', error);
    res.status(500).json({ error: 'Failed to analyze prices' });
  }
});

// NEW: Advanced arbitrage analysis endpoint
app.get('/api/arbitrage/analysis', async (req, res) => {
  try {
    const ArbitrageEngine = require('./services/arbitrageDetectionEngine');
    const engine = new ArbitrageEngine();
    
    const stats = await engine.getArbitrageStatistics();
    
    res.json({
      success: true,
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting arbitrage analysis:', error);
    res.status(500).json({ error: 'Failed to get arbitrage analysis' });
  }
});

// NEW: Trigger manual arbitrage detection
app.post('/api/arbitrage/detect', async (req, res) => {
  try {
    const ArbitrageEngine = require('./services/arbitrageDetectionEngine');
    const engine = new ArbitrageEngine();
    
    const opportunities = await engine.detectArbitrageOpportunities();
    
    res.json({
      success: true,
      message: `Manual arbitrage detection completed`,
      opportunitiesFound: opportunities.length,
      opportunities: opportunities.slice(0, 5) // Return first 5
    });
  } catch (error) {
    logger.error('Error in manual arbitrage detection:', error);
    res.status(500).json({ error: 'Failed to run arbitrage detection' });
  }
});

// NEW: Get arbitrage opportunities with advanced filtering
app.get('/api/arbitrage/opportunities', async (req, res) => {
  try {
    const { minProfit, maxRisk, dex, limit = 20 } = req.query;
    
    let query = `
      SELECT * FROM mev_opportunities 
      WHERE opportunity_type IN ('arbitrage', 'simple_arbitrage')
    `;
    let values = [];
    let paramIndex = 1;
    
    if (minProfit) {
      query += ` AND estimated_profit_sol >= $${paramIndex}`;
      values.push(parseFloat(minProfit));
      paramIndex++;
    }
    
    if (maxRisk) {
      query += ` AND execution_risk_score <= $${paramIndex}`;
      values.push(parseInt(maxRisk));
      paramIndex++;
    }
    
    if (dex) {
      query += ` AND (primary_dex = $${paramIndex} OR secondary_dex = $${paramIndex})`;
      values.push(dex);
      paramIndex++;
    }
    
    query += ` ORDER BY estimated_profit_sol DESC, detection_timestamp DESC LIMIT $${paramIndex}`;
    values.push(parseInt(limit));
    
    const client = await pool.connect();
    const result = await client.query(query, values);
    client.release();
    
    res.json({
      success: true,
      count: result.rows.length,
      arbitrageOpportunities: result.rows
    });
  } catch (error) {
    logger.error('Error fetching arbitrage opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch arbitrage opportunities' });
  }
});

// Liquidation opportunities endpoint
app.get('/api/liquidations', async (req, res) => {
  try {
    const { protocol, minProfit, maxRisk, healthFactor, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM mev_opportunities WHERE opportunity_type = \'liquidation\'';
    let values = [];
    let paramIndex = 1;
    
    if (protocol) {
      query += ` AND primary_dex = $${paramIndex}`;
      values.push(protocol);
      paramIndex++;
    }
    
    if (minProfit) {
      query += ` AND estimated_profit_sol >= $${paramIndex}`;
      values.push(parseFloat(minProfit));
      paramIndex++;
    }
    
    if (maxRisk) {
      query += ` AND execution_risk_score <= $${paramIndex}`;
      values.push(parseInt(maxRisk));
      paramIndex++;
    }
    
    query += ` ORDER BY estimated_profit_sol DESC, detection_timestamp DESC LIMIT $${paramIndex}`;
    values.push(parseInt(limit));
    
    const client = await pool.connect();
    const result = await client.query(query, values);
    client.release();
    
    res.json({
      success: true,
      count: result.rows.length,
      liquidationOpportunities: result.rows
    });
  } catch (error) {
    logger.error('Error fetching liquidation opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch liquidation opportunities' });
  }
});

// Liquidation scanner status endpoint
app.get('/api/liquidations/status', (req, res) => {
  try {
    const status = liquidationScanner.getStatus();
    
    res.json({
      success: true,
      liquidationScanner: status
    });
  } catch (error) {
    logger.error('Error getting liquidation scanner status:', error);
    res.status(500).json({ error: 'Failed to get liquidation scanner status' });
  }
});

// Protocol-specific liquidation analysis
app.get('/api/liquidations/protocol/:protocol', async (req, res) => {
  try {
    const { protocol } = req.params;
    const { limit = 20 } = req.query;
    
    const query = `
      SELECT 
        COUNT(*) as total_opportunities,
        AVG(estimated_profit_sol) as avg_profit_sol,
        MAX(estimated_profit_sol) as max_profit_sol,
        AVG(execution_risk_score) as avg_risk_score,
        COUNT(CASE WHEN status = 'executed' THEN 1 END) as executed_count
      FROM mev_opportunities 
      WHERE opportunity_type = 'liquidation' AND primary_dex = $1
      AND detection_timestamp > NOW() - INTERVAL '24 hours'
    `;
    
    const recentQuery = `
      SELECT * FROM mev_opportunities
      WHERE opportunity_type = 'liquidation' AND primary_dex = $1
      ORDER BY detection_timestamp DESC
      LIMIT $2
    `;
    
    const client = await pool.connect();
    const [analyticsResult, recentResult] = await Promise.all([
      client.query(query, [protocol]),
      client.query(recentQuery, [protocol, limit])
    ]);
    client.release();
    
    res.json({
      success: true,
      protocol,
      analytics: analyticsResult.rows[0],
      recentOpportunities: recentResult.rows
    });
  } catch (error) {
    logger.error('Error fetching protocol liquidation data:', error);
    res.status(500).json({ error: 'Failed to fetch protocol liquidation data' });
  }
});

// Start/stop liquidation scanner endpoints
app.post('/api/liquidations/start', async (req, res) => {
  try {
    await liquidationScanner.start();
    res.json({ success: true, message: 'Liquidation scanner started' });
  } catch (error) {
    logger.error('Error starting liquidation scanner:', error);
    res.status(500).json({ error: 'Failed to start liquidation scanner' });
  }
});

app.post('/api/liquidations/stop', async (req, res) => {
  try {
    await liquidationScanner.stop();
    res.json({ success: true, message: 'Liquidation scanner stopped' });
  } catch (error) {
    logger.error('Error stopping liquidation scanner:', error);
    res.status(500).json({ error: 'Failed to stop liquidation scanner' });
  }
});

// Auto-execution configuration endpoints
app.post('/api/liquidations/auto-execution/enable', async (req, res) => {
  try {
    const config = req.body;
    liquidationScanner.enableAutoExecution(config);
    res.json({
      success: true,
      message: 'Auto-execution enabled',
      config: liquidationScanner.getAutoExecutionConfig()
    });
  } catch (error) {
    logger.error('Error enabling auto-execution:', error);
    res.status(500).json({ error: 'Failed to enable auto-execution' });
  }
});

app.post('/api/liquidations/auto-execution/disable', async (req, res) => {
  try {
    liquidationScanner.disableAutoExecution();
    res.json({ success: true, message: 'Auto-execution disabled' });
  } catch (error) {
    logger.error('Error disabling auto-execution:', error);
    res.status(500).json({ error: 'Failed to disable auto-execution' });
  }
});

app.get('/api/liquidations/auto-execution/config', (req, res) => {
  try {
    const config = liquidationScanner.getAutoExecutionConfig();
    res.json({ success: true, config });
  } catch (error) {
    logger.error('Error getting auto-execution config:', error);
    res.status(500).json({ error: 'Failed to get auto-execution config' });
  }
});

app.put('/api/liquidations/auto-execution/config', async (req, res) => {
  try {
    const newConfig = req.body;
    liquidationScanner.updateAutoExecutionConfig(newConfig);
    res.json({
      success: true,
      message: 'Auto-execution config updated',
      config: liquidationScanner.getAutoExecutionConfig()
    });
  } catch (error) {
    logger.error('Error updating auto-execution config:', error);
    res.status(500).json({ error: 'Failed to update auto-execution config' });
  }
});

// Execution statistics and performance
app.get('/api/liquidations/execution/stats', (req, res) => {
  try {
    const scanner = liquidationScanner;
    const stats = {
      scanner: scanner.getStats(),
      riskModel: scanner.advancedRiskModel.getModelPerformance(),
      executor: scanner.liquidationExecutor.getStats()
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Error getting execution stats:', error);
    res.status(500).json({ error: 'Failed to get execution stats' });
  }
});

// Risk model management
app.get('/api/liquidations/risk-model/weights', (req, res) => {
  try {
    const weights = liquidationScanner.advancedRiskModel.getRiskFactorWeights();
    res.json({ success: true, weights });
  } catch (error) {
    logger.error('Error getting risk model weights:', error);
    res.status(500).json({ error: 'Failed to get risk model weights' });
  }
});

app.put('/api/liquidations/risk-model/weights', (req, res) => {
  try {
    const newWeights = req.body;
    liquidationScanner.advancedRiskModel.updateRiskFactorWeights(newWeights);
    res.json({
      success: true,
      message: 'Risk factor weights updated',
      weights: liquidationScanner.advancedRiskModel.getRiskFactorWeights()
    });
  } catch (error) {
    logger.error('Error updating risk model weights:', error);
    res.status(500).json({ error: 'Failed to update risk model weights' });
  }
});

// Advanced liquidation analysis
app.get('/api/liquidations/analysis/risk-factors', async (req, res) => {
  try {
    const { opportunityId } = req.query;
    
    if (!opportunityId) {
      return res.status(400).json({ error: 'opportunityId parameter required' });
    }
    
    // Get opportunity from database
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM mev_opportunities WHERE id = $1 AND opportunity_type = \'liquidation\'',
      [opportunityId]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Liquidation opportunity not found' });
    }
    
    const opportunity = result.rows[0];
    
    // Perform risk analysis (mock data for demo)
    const riskAnalysis = {
      opportunity,
      riskFactors: {
        volatility: { score: 6, weight: 0.25, description: 'Medium volatility for collateral assets' },
        liquidity: { score: 4, weight: 0.20, description: 'Good liquidity in target markets' },
        healthFactor: { score: 3, weight: 0.20, description: 'Position is liquidatable' },
        competition: { score: 7, weight: 0.10, description: 'High competition expected' },
        timing: { score: 4, weight: 0.15, description: 'Moderate timing pressure' },
        protocol: { score: 3, weight: 0.10, description: 'Low protocol risk' }
      },
      overallRisk: opportunity.execution_risk_score,
      recommendation: opportunity.execution_risk_score <= 6 ? 
        'RECOMMENDED: Low to medium risk, good profit potential' : 
        'CAUTION: High risk, consider manual review'
    };
    
    res.json({ success: true, analysis: riskAnalysis });
  } catch (error) {
    logger.error('Error performing risk analysis:', error);
    res.status(500).json({ error: 'Failed to perform risk analysis' });
  }
});

// Sandwich attack detection endpoints
app.get('/api/sandwich-attacks', async (req, res) => {
  try {
    const { dex, minProfit, maxRisk, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM mev_opportunities WHERE opportunity_type = \'sandwich\'';
    let values = [];
    let paramIndex = 1;
    
    if (dex) {
      query += ` AND primary_dex = $${paramIndex}`;
      values.push(dex);
      paramIndex++;
    }
    
    if (minProfit) {
      query += ` AND profit_percentage >= $${paramIndex}`;
      values.push(parseFloat(minProfit));
      paramIndex++;
    }
    
    if (maxRisk) {
      query += ` AND execution_risk_score <= $${paramIndex}`;
      values.push(parseInt(maxRisk));
      paramIndex++;
    }
    
    query += ` ORDER BY estimated_profit_sol DESC, detection_timestamp DESC LIMIT $${paramIndex}`;
    values.push(parseInt(limit));
    
    const client = await pool.connect();
    const result = await client.query(query, values);
    client.release();
    
    res.json({
      success: true,
      count: result.rows.length,
      sandwichOpportunities: result.rows
    });
  } catch (error) {
    logger.error('Error fetching sandwich opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch sandwich opportunities' });
  }
});

// Sandwich detector status and configuration
app.get('/api/sandwich-attacks/status', (req, res) => {
  try {
    const detector = liquidationScanner.sandwichDetector;
    const status = {
      isRunning: detector.isDetecting,
      stats: detector.getStats(),
      config: detector.getConfig(),
      supportedDEXs: Object.keys(detector.dexPrograms)
    };
    
    res.json({ success: true, sandwichDetector: status });
  } catch (error) {
    logger.error('Error getting sandwich detector status:', error);
    res.status(500).json({ error: 'Failed to get sandwich detector status' });
  }
});

// Sandwich execution simulation
app.post('/api/sandwich-attacks/simulate', async (req, res) => {
  try {
    const { targetValue, tokenA, tokenB, dex, slippage } = req.body;
    
    if (!targetValue || !tokenA || !tokenB || !dex) {
      return res.status(400).json({ 
        error: 'Missing required parameters: targetValue, tokenA, tokenB, dex' 
      });
    }
    
    // Simulate sandwich parameters
    const mockTransaction = {
      valueUSD: targetValue,
      tokenA: { symbol: tokenA, mint: 'mock_mint_a' },
      tokenB: { symbol: tokenB, mint: 'mock_mint_b' },
      dex,
      slippage: slippage || 0.02,
      priorityFee: 0.001
    };
    
    const detector = liquidationScanner.sandwichDetector;
    const sandwichParams = await detector.calculateSandwichParameters(mockTransaction);
    
    if (!sandwichParams) {
      return res.status(400).json({ error: 'Unable to calculate sandwich parameters' });
    }
    
    res.json({
      success: true,
      simulation: {
        targetTransaction: mockTransaction,
        sandwichParameters: sandwichParams,
        profitability: {
          frontRunValueUSD: sandwichParams.frontRunValueUSD,
          grossProfitUSD: sandwichParams.grossProfitUSD,
          netProfitUSD: sandwichParams.netProfitUSD,
          profitPercent: sandwichParams.profitPercent,
          riskScore: sandwichParams.riskScore
        },
        execution: {
          frontRun: sandwichParams.frontRun,
          backRun: sandwichParams.backRun,
          totalGasCost: sandwichParams.totalGasCost,
          estimatedExecutionTime: sandwichParams.estimatedExecutionTime
        }
      }
    });
  } catch (error) {
    logger.error('Error simulating sandwich attack:', error);
    res.status(500).json({ error: 'Failed to simulate sandwich attack' });
  }
});

// MEV Bundle Construction endpoints
app.get('/api/bundles', async (req, res) => {
  try {
    const { status, strategy, minProfit, maxRisk, limit = 20 } = req.query;
    
    let query = 'SELECT * FROM mev_bundles WHERE 1=1';
    let values = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND bundle_status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }
    
    if (minProfit) {
      query += ` AND estimated_profit_sol >= $${paramIndex}`;
      values.push(parseFloat(minProfit));
      paramIndex++;
    }
    
    if (maxRisk) {
      query += ` AND average_risk_score <= $${paramIndex}`;
      values.push(parseFloat(maxRisk));
      paramIndex++;
    }
    
    query += ` ORDER BY construction_timestamp DESC LIMIT $${paramIndex}`;
    values.push(parseInt(limit));
    
    const client = await pool.connect();
    const result = await client.query(query, values);
    client.release();
    
    res.json({
      success: true,
      count: result.rows.length,
      bundles: result.rows
    });
  } catch (error) {
    logger.error('Error fetching bundles:', error);
    res.status(500).json({ error: 'Failed to fetch bundles' });
  }
});

// Bundle composition endpoint
app.post('/api/bundles/compose', async (req, res) => {
  try {
    const { opportunities, strategy = 'balanced', constraints = {} } = req.body;
    
    if (!opportunities || !Array.isArray(opportunities) || opportunities.length === 0) {
      return res.status(400).json({ error: 'Valid opportunities array is required' });
    }
    
    // Compose optimal bundle
    const optimalBundle = await bundleComposer.composeOptimalBundle(
      opportunities,
      constraints,
      strategy
    );
    
    if (!optimalBundle) {
      return res.status(400).json({ 
        error: 'No viable bundle could be composed from provided opportunities',
        reason: 'Insufficient profitable opportunities or constraints too restrictive'
      });
    }
    
    res.json({
      success: true,
      bundle: optimalBundle,
      composition: {
        strategy: optimalBundle.composition.strategy,
        transactionCount: optimalBundle.transactions.length,
        estimatedProfit: optimalBundle.metrics.netProfit,
        riskScore: optimalBundle.metrics.overallRisk,
        confidenceLevel: optimalBundle.metrics.confidenceLevel
      }
    });
  } catch (error) {
    logger.error('Error composing bundle:', error);
    res.status(500).json({ error: 'Failed to compose optimal bundle' });
  }
});

// Bundle optimization endpoint
app.post('/api/bundles/optimize', async (req, res) => {
  try {
    const { transactions, constraints = {} } = req.body;
    
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Valid transactions array is required' });
    }
    
    // Optimize transaction order
    const orderOptimizer = bundleComposer.orderOptimizer;
    const optimization = await orderOptimizer.optimizeTransactionOrder(transactions, constraints);
    
    res.json({
      success: true,
      optimization: {
        originalOrder: transactions,
        optimizedOrder: optimization.optimizedOrder,
        improvement: optimization.improvement,
        algorithm: optimization.algorithm,
        originalScore: optimization.originalScore,
        optimizedScore: optimization.optimizedScore,
        optimizationTime: optimization.optimizationTime
      }
    });
  } catch (error) {
    logger.error('Error optimizing bundle order:', error);
    res.status(500).json({ error: 'Failed to optimize transaction order' });
  }
});

// Bundle gas cost estimation
app.post('/api/bundles/gas-estimate', async (req, res) => {
  try {
    const { transactions, bundleOptions = {} } = req.body;
    
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Valid transactions array is required' });
    }
    
    // Calculate bundle gas cost
    const gasCostResult = await gasCostCalculator.calculateBundleGasCost(transactions, bundleOptions);
    
    res.json({
      success: true,
      gasEstimate: {
        totalBundleCost: gasCostResult.totalBundleCost,
        averageCostPerTx: gasCostResult.averageCostPerTx,
        totalComputeUnits: gasCostResult.totalComputeUnits,
        bundleOverhead: gasCostResult.bundleOverhead,
        optimizationSavings: gasCostResult.optimizationSavings,
        competitionAdjustment: gasCostResult.competitionAdjustment,
        estimates: gasCostResult.estimates,
        individualCosts: gasCostResult.individualCosts
      }
    });
  } catch (error) {
    logger.error('Error estimating bundle gas cost:', error);
    res.status(500).json({ error: 'Failed to estimate bundle gas cost' });
  }
});

// Bundle risk assessment
app.post('/api/bundles/risk-assessment', async (req, res) => {
  try {
    const { bundle, marketConditions = {} } = req.body;
    
    if (!bundle || !bundle.transactions || bundle.transactions.length === 0) {
      return res.status(400).json({ error: 'Valid bundle with transactions is required' });
    }
    
    // Assess bundle risk
    const riskAssessment = await bundleRiskAssessment.assessBundleRisk(bundle, marketConditions);
    
    res.json({
      success: true,
      riskAssessment: {
        overallRisk: riskAssessment.overallRisk,
        riskLevel: riskAssessment.riskLevel,
        confidenceLevel: riskAssessment.confidenceLevel,
        riskScores: riskAssessment.riskScores,
        recommendations: riskAssessment.recommendations,
        mitigationStrategies: riskAssessment.mitigationStrategies,
        isValid: riskAssessment.isValid,
        validationIssues: riskAssessment.validationIssues
      }
    });
  } catch (error) {
    logger.error('Error assessing bundle risk:', error);
    res.status(500).json({ error: 'Failed to assess bundle risk' });
  }
});

// Bundle simulation endpoint
app.post('/api/bundles/simulate', async (req, res) => {
  try {
    const { opportunities, strategy = 'balanced', constraints = {}, includeRisk = true } = req.body;
    
    if (!opportunities || !Array.isArray(opportunities) || opportunities.length === 0) {
      return res.status(400).json({ error: 'Valid opportunities array is required' });
    }
    
    // Simulate bundle composition without actual execution
    const simulation = await bundleComposer.composeOptimalBundle(
      opportunities,
      { ...constraints, simulate: true },
      strategy
    );
    
    if (!simulation) {
      return res.status(400).json({ 
        error: 'Bundle simulation failed',
        reason: 'No profitable bundle configuration found'
      });
    }
    
    // Include additional simulation data
    const simulationResult = {
      bundleComposition: {
        strategy,
        transactionCount: simulation.transactions.length,
        transactions: simulation.transactions.map(tx => ({
          type: tx.type,
          dex: tx.dex,
          profitSOL: tx.profitSOL,
          gasCost: tx.gasCost,
          riskScore: tx.riskScore
        }))
      },
      profitability: {
        grossProfit: simulation.metrics.grossProfit,
        netProfit: simulation.metrics.netProfit,
        totalGasCost: simulation.metrics.totalGasCost,
        gasEfficiency: simulation.metrics.gasEfficiency,
        profitMargin: ((simulation.metrics.netProfit / simulation.metrics.grossProfit) * 100).toFixed(2) + '%'
      },
      riskAnalysis: includeRisk ? {
        overallRisk: simulation.metrics.overallRisk,
        confidenceLevel: simulation.metrics.confidenceLevel,
        riskLevel: simulation.metrics.overallRisk <= 3 ? 'LOW' : 
                  simulation.metrics.overallRisk <= 6 ? 'MODERATE' : 
                  simulation.metrics.overallRisk <= 8 ? 'HIGH' : 'EXTREME'
      } : null,
      composition: simulation.composition
    };
    
    res.json({
      success: true,
      simulation: simulationResult
    });
  } catch (error) {
    logger.error('Error simulating bundle:', error);
    res.status(500).json({ error: 'Failed to simulate bundle' });
  }
});

// Bundle statistics endpoint
app.get('/api/bundles/stats', (req, res) => {
  try {
    const bundleStats = bundleComposer.getCompositionStats();
    const gasStats = gasCostCalculator.getGasStats();
    const riskStats = bundleRiskAssessment.getRiskStats();
    
    res.json({
      success: true,
      statistics: {
        bundleComposition: bundleStats,
        gasCostCalculation: gasStats,
        riskAssessment: riskStats,
        summary: {
          totalBundlesComposed: bundleStats.bundlesComposed,
          optimalRate: bundleStats.optimalRate,
          averageBundleSize: bundleStats.averageBundleSize,
          averageProfitPerBundle: bundleStats.averageProfitPerBundle,
          gasAccuracy: gasStats.accuracy
        }
      }
    });
  } catch (error) {
    logger.error('Error getting bundle statistics:', error);
    res.status(500).json({ error: 'Failed to get bundle statistics' });
  }
});

// Start/stop monitor endpoints
app.post('/api/monitor/start', async (req, res) => {
  try {
    await transactionMonitor.start();
    res.json({ success: true, message: 'Transaction monitor started' });
  } catch (error) {
    logger.error('Error starting monitor:', error);
    res.status(500).json({ error: 'Failed to start monitor' });
  }
});

app.post('/api/monitor/stop', async (req, res) => {
  try {
    await transactionMonitor.stop();
    res.json({ success: true, message: 'Transaction monitor stopped' });
  } catch (error) {
    logger.error('Error stopping monitor:', error);
    res.status(500).json({ error: 'Failed to stop monitor' });
  }
});

// ===================== JITO INTEGRATION ENDPOINTS =====================

// Jito bundle submission with optimization
app.post('/api/jito/bundles/submit', async (req, res) => {
  try {
    const { opportunities, constraints = {}, options = {} } = req.body;
    
    if (!opportunities || !Array.isArray(opportunities) || opportunities.length === 0) {
      return res.status(400).json({ error: 'Valid opportunities array is required' });
    }
    
    // Initialize Jito service if not already done
    await jitoIntegrationService.initialize();
    
    const result = await jitoIntegrationService.createAndSubmitOptimizedBundle(
      opportunities,
      constraints,
      options
    );
    
    res.json({
      success: result.success,
      bundleId: result.bundleId,
      submissionResult: result.submissionResult,
      successEstimation: result.successEstimation,
      optimization: result.optimization,
      expectedOutcome: result.expectedOutcome,
      error: result.error
    });
  } catch (error) {
    logger.error('Error submitting Jito bundle:', error);
    res.status(500).json({ error: 'Failed to submit Jito bundle' });
  }
});

// Jito batch bundle submission
app.post('/api/jito/bundles/batch', async (req, res) => {
  try {
    const { opportunityBatches, options = {} } = req.body;
    
    if (!opportunityBatches || !Array.isArray(opportunityBatches) || opportunityBatches.length === 0) {
      return res.status(400).json({ error: 'Valid opportunity batches array is required' });
    }
    
    await jitoIntegrationService.initialize();
    
    const batchResult = await jitoIntegrationService.submitOptimizedBatch(
      opportunityBatches,
      options
    );
    
    res.json({
      success: true,
      batchId: batchResult.batchId,
      totalBundles: batchResult.totalBundles,
      results: batchResult.results,
      batchMetrics: batchResult.batchMetrics
    });
  } catch (error) {
    logger.error('Error submitting Jito batch:', error);
    res.status(500).json({ error: 'Failed to submit Jito batch' });
  }
});

// Get Jito bundle status
app.get('/api/jito/bundles/:bundleId/status', async (req, res) => {
  try {
    const { bundleId } = req.params;
    
    await jitoIntegrationService.initialize();
    const status = await jitoIntegrationService.getBundleStatus(bundleId);
    
    res.json({
      success: true,
      bundleId,
      status
    });
  } catch (error) {
    logger.error('Error getting bundle status:', error);
    res.status(500).json({ error: 'Failed to get bundle status' });
  }
});

// Jito system status
app.get('/api/jito/status', async (req, res) => {
  try {
    await jitoIntegrationService.initialize();
    const systemStatus = jitoIntegrationService.getSystemStatus();
    
    res.json({
      success: true,
      system: systemStatus
    });
  } catch (error) {
    logger.error('Error getting Jito system status:', error);
    res.status(500).json({ error: 'Failed to get Jito system status' });
  }
});

// Jito performance report
app.get('/api/jito/performance', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    await jitoIntegrationService.initialize();
    const performanceReport = jitoIntegrationService.getPerformanceReport(timeframe);
    
    res.json({
      success: true,
      timeframe,
      performance: performanceReport
    });
  } catch (error) {
    logger.error('Error getting performance report:', error);
    res.status(500).json({ error: 'Failed to get performance report' });
  }
});

// Jito success rate estimation
app.post('/api/jito/estimate-success-rate', async (req, res) => {
  try {
    const { bundle, networkContext = {} } = req.body;
    
    if (!bundle) {
      return res.status(400).json({ error: 'Bundle data is required' });
    }
    
    await jitoIntegrationService.initialize();
    
    // Access the success rate estimator through the integration service
    const estimation = await jitoIntegrationService._successRateEstimator.estimateSuccessRate(
      bundle,
      networkContext
    );
    
    res.json({
      success: true,
      estimation
    });
  } catch (error) {
    logger.error('Error estimating success rate:', error);
    res.status(500).json({ error: 'Failed to estimate success rate' });
  }
});

// Jito simulation metrics
app.get('/api/jito/simulation/metrics', async (req, res) => {
  try {
    await jitoIntegrationService.initialize();
    
    const simulatorMetrics = jitoIntegrationService._jitoSimulator.getSimulationMetrics();
    
    res.json({
      success: true,
      metrics: simulatorMetrics
    });
  } catch (error) {
    logger.error('Error getting simulation metrics:', error);
    res.status(500).json({ error: 'Failed to get simulation metrics' });
  }
});

// Jito tip recommendation
app.post('/api/jito/tip-recommendation', async (req, res) => {
  try {
    const { bundleSize = 1, priority = 'normal' } = req.body;
    
    await jitoIntegrationService.initialize();
    
    const recommendedTip = jitoIntegrationService._jitoSimulator.getOptimalTipRecommendation(
      bundleSize,
      priority
    );
    
    res.json({
      success: true,
      recommendedTip,
      bundleSize,
      priority
    });
  } catch (error) {
    logger.error('Error getting tip recommendation:', error);
    res.status(500).json({ error: 'Failed to get tip recommendation' });
  }
});

// Jito model performance
app.get('/api/jito/model/performance', async (req, res) => {
  try {
    await jitoIntegrationService.initialize();
    
    const modelPerformance = jitoIntegrationService._successRateEstimator.getModelPerformance();
    
    res.json({
      success: true,
      modelPerformance
    });
  } catch (error) {
    logger.error('Error getting model performance:', error);
    res.status(500).json({ error: 'Failed to get model performance' });
  }
});

// Update model with actual results (for learning)
app.post('/api/jito/model/update', async (req, res) => {
  try {
    const { bundleId, actualSuccess, actualLatency } = req.body;
    
    if (!bundleId || actualSuccess === undefined) {
      return res.status(400).json({ error: 'bundleId and actualSuccess are required' });
    }
    
    await jitoIntegrationService.initialize();
    
    jitoIntegrationService._successRateEstimator.updateModelWithResults(
      bundleId,
      actualSuccess,
      actualLatency
    );
    
    res.json({
      success: true,
      message: 'Model updated with actual results'
    });
  } catch (error) {
    logger.error('Error updating model:', error);
    res.status(500).json({ error: 'Failed to update model' });
  }
});

// Export performance data
app.get('/api/jito/export/:format', async (req, res) => {
  try {
    const { format } = req.params;
    
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Format must be json or csv' });
    }
    
    await jitoIntegrationService.initialize();
    
    const exportData = jitoIntegrationService._performanceTracker.exportData(format);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=jito-performance.csv');
      res.send(exportData);
    } else {
      res.json({
        success: true,
        data: exportData
      });
    }
  } catch (error) {
    logger.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// ===================== END JITO ENDPOINTS =====================

// ===================== PROFIT CALCULATION ENGINE ENDPOINTS =====================

// Comprehensive profit calculation
app.post('/api/profit/calculate', async (req, res) => {
  try {
    const { opportunity, options = {} } = req.body;
    
    if (!opportunity) {
      return res.status(400).json({ error: 'Opportunity data is required' });
    }
    
    const profitAnalysis = await profitCalculationEngine.calculateComprehensiveProfit(
      opportunity,
      options
    );
    
    res.json({
      success: true,
      analysis: profitAnalysis
    });
  } catch (error) {
    logger.error('Error calculating profit:', error);
    res.status(500).json({ error: 'Failed to calculate profit' });
  }
});

// Batch profit calculation
app.post('/api/profit/calculate-batch', async (req, res) => {
  try {
    const { opportunities, options = {} } = req.body;
    
    if (!opportunities || !Array.isArray(opportunities)) {
      return res.status(400).json({ error: 'Opportunities array is required' });
    }
    
    const results = [];
    
    for (const opportunity of opportunities) {
      try {
        const analysis = await profitCalculationEngine.calculateComprehensiveProfit(
          opportunity,
          options
        );
        results.push({ ...analysis, success: true });
      } catch (error) {
        results.push({ 
          error: error.message, 
          success: false,
          opportunityId: opportunity.id 
        });
      }
    }
    
    res.json({
      success: true,
      totalOpportunities: opportunities.length,
      successfulCalculations: results.filter(r => r.success).length,
      results
    });
  } catch (error) {
    logger.error('Error calculating batch profits:', error);
    res.status(500).json({ error: 'Failed to calculate batch profits' });
  }
});

// Quick profit estimate (simplified calculation)
app.post('/api/profit/quick-estimate', async (req, res) => {
  try {
    const { buyPrice, sellPrice, volume, primaryDex, secondaryDex } = req.body;
    
    if (!buyPrice || !sellPrice || !volume) {
      return res.status(400).json({ 
        error: 'buyPrice, sellPrice, and volume are required' 
      });
    }
    
    // Quick calculation without full Monte Carlo simulation
    const opportunity = {
      buyPrice: parseFloat(buyPrice),
      sellPrice: parseFloat(sellPrice),
      volume: parseFloat(volume),
      primaryDex: primaryDex || 'raydium',
      secondaryDex: secondaryDex || 'orca',
      strategy: 'arbitrage'
    };
    
    const quickAnalysis = await profitCalculationEngine.calculateComprehensiveProfit(
      opportunity,
      { samples: 1000 } // Reduced samples for quick estimate
    );
    
    res.json({
      success: true,
      quickEstimate: {
        grossProfit: quickAnalysis.baseProfit.gross,
        estimatedCosts: quickAnalysis.costs.totalCosts,
        netProfit: quickAnalysis.netProfit.expected,
        riskAdjustedProfit: quickAnalysis.netProfit.riskAdjusted,
        profitabilityProbability: quickAnalysis.probabilities.profitability,
        riskLevel: quickAnalysis.risks.combinedRiskScore <= 3 ? 'LOW' : 
                  quickAnalysis.risks.combinedRiskScore <= 6 ? 'MEDIUM' : 'HIGH'
      },
      fullAnalysis: quickAnalysis
    });
  } catch (error) {
    logger.error('Error calculating quick estimate:', error);
    res.status(500).json({ error: 'Failed to calculate quick estimate' });
  }
});

// Get profit calculation history
app.get('/api/profit/history', async (req, res) => {
  try {
    const { limit = 50, minProfit, riskLevel } = req.query;
    
    let query = 'SELECT * FROM profit_calculations WHERE 1=1';
    let values = [];
    let paramIndex = 1;
    
    if (minProfit) {
      query += ` AND expected_profit >= $${paramIndex}`;
      values.push(parseFloat(minProfit));
      paramIndex++;
    }
    
    if (riskLevel) {
      const riskThresholds = { 'LOW': 3, 'MEDIUM': 6, 'HIGH': 10 };
      const maxRisk = riskThresholds[riskLevel.toUpperCase()];
      if (maxRisk) {
        query += ` AND risk_score <= $${paramIndex}`;
        values.push(maxRisk);
        paramIndex++;
      }
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    values.push(parseInt(limit));
    
    const client = await pool.connect();
    const result = await client.query(query, values);
    client.release();
    
    res.json({
      success: true,
      count: result.rows.length,
      calculations: result.rows
    });
  } catch (error) {
    logger.error('Error fetching profit history:', error);
    res.status(500).json({ error: 'Failed to fetch profit history' });
  }
});

// Profit calculation statistics
app.get('/api/profit/statistics', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    const timeInterval = timeframe === '1h' ? '1 hour' : 
                        timeframe === '24h' ? '24 hours' : 
                        timeframe === '7d' ? '7 days' : '24 hours';
    
    const query = `
      SELECT 
        COUNT(*) as total_calculations,
        AVG(expected_profit) as avg_expected_profit,
        AVG(risk_score) as avg_risk_score,
        AVG(confidence_upper - confidence_lower) as avg_confidence_interval,
        COUNT(CASE WHEN expected_profit > 0 THEN 1 END) as profitable_count,
        COUNT(CASE WHEN risk_score <= 3 THEN 1 END) as low_risk_count,
        COUNT(CASE WHEN risk_score > 6 THEN 1 END) as high_risk_count,
        MAX(expected_profit) as max_profit,
        MIN(expected_profit) as min_profit
      FROM profit_calculations 
      WHERE created_at > NOW() - INTERVAL '${timeInterval}'
    `;
    
    const client = await pool.connect();
    const result = await client.query(query);
    client.release();
    
    const stats = result.rows[0];
    
    res.json({
      success: true,
      timeframe,
      statistics: {
        totalCalculations: parseInt(stats.total_calculations),
        averageExpectedProfit: parseFloat(stats.avg_expected_profit) || 0,
        averageRiskScore: parseFloat(stats.avg_risk_score) || 0,
        averageConfidenceInterval: parseFloat(stats.avg_confidence_interval) || 0,
        profitablePercentage: stats.total_calculations > 0 ? 
          (parseInt(stats.profitable_count) / parseInt(stats.total_calculations)) * 100 : 0,
        lowRiskPercentage: stats.total_calculations > 0 ? 
          (parseInt(stats.low_risk_count) / parseInt(stats.total_calculations)) * 100 : 0,
        highRiskPercentage: stats.total_calculations > 0 ? 
          (parseInt(stats.high_risk_count) / parseInt(stats.total_calculations)) * 100 : 0,
        maxProfit: parseFloat(stats.max_profit) || 0,
        minProfit: parseFloat(stats.min_profit) || 0
      }
    });
  } catch (error) {
    logger.error('Error fetching profit statistics:', error);
    res.status(500).json({ error: 'Failed to fetch profit statistics' });
  }
});

// Risk assessment for opportunity
app.post('/api/profit/risk-assessment', async (req, res) => {
  try {
    const { opportunity } = req.body;
    
    if (!opportunity) {
      return res.status(400).json({ error: 'Opportunity data is required' });
    }
    
    // Use individual risk calculator for detailed assessment
    const riskCalculator = profitCalculationEngine.riskCalculator;
    const riskAssessment = await riskCalculator.calculate(opportunity);
    
    res.json({
      success: true,
      riskAssessment: {
        overallScore: riskAssessment.score,
        riskLevel: riskAssessment.level,
        factors: riskAssessment.factors,
        recommendations: this.generateRiskRecommendations(riskAssessment)
      }
    });
  } catch (error) {
    logger.error('Error assessing risk:', error);
    res.status(500).json({ error: 'Failed to assess risk' });
  }
});

// Market volatility analysis
app.get('/api/profit/volatility/:tokenMint', async (req, res) => {
  try {
    const { tokenMint } = req.params;
    const { days = 7 } = req.query;
    
    if (!tokenMint) {
      return res.status(400).json({ error: 'Token mint is required' });
    }
    
    const volatilityAnalyzer = profitCalculationEngine.volatilityAnalyzer;
    const mockOpportunity = { tokenMintA: tokenMint };
    
    const volatilityAnalysis = await volatilityAnalyzer.analyze(mockOpportunity);
    
    res.json({
      success: true,
      tokenMint,
      lookbackDays: parseInt(days),
      volatilityAnalysis
    });
  } catch (error) {
    logger.error('Error analyzing volatility:', error);
    res.status(500).json({ error: 'Failed to analyze volatility' });
  }
});

// Competition analysis
app.post('/api/profit/competition-analysis', async (req, res) => {
  try {
    const { opportunity } = req.body;
    
    if (!opportunity) {
      return res.status(400).json({ error: 'Opportunity data is required' });
    }
    
    const competitionAnalyzer = profitCalculationEngine.competitionAnalyzer;
    const competitionAnalysis = await competitionAnalyzer.analyze(opportunity);
    
    res.json({
      success: true,
      competitionAnalysis: {
        probability: competitionAnalysis.probability,
        factors: competitionAnalysis.factors,
        recommendation: competitionAnalysis.probability > 0.7 ? 
          'High competition expected - consider increasing speed or reducing exposure' :
          competitionAnalysis.probability > 0.4 ? 
          'Moderate competition - monitor closely' :
          'Low competition expected - good opportunity timing'
      }
    });
  } catch (error) {
    logger.error('Error analyzing competition:', error);
    res.status(500).json({ error: 'Failed to analyze competition' });
  }
});

// ===================== END PROFIT CALCULATION ENDPOINTS =====================

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Validator Performance API Routes

// Validator tracking routes
app.get('/api/validators', async (req, res) => {
    try {
        const { limit = 50, offset = 0, jito_only, epoch } = req.query;
        
        let query = `
            SELECT vp.*, 
                   RANK() OVER (ORDER BY vp.epoch_rewards DESC) as performance_rank
            FROM enhanced_validator_performance vp
            WHERE 1=1
        `;
        const params = [];
        
        if (jito_only !== undefined) {
            query += ` AND vp.is_jito_enabled = $${params.length + 1}`;
            params.push(jito_only === 'true');
        }
        
        if (epoch) {
            query += ` AND vp.epoch = $${params.length + 1}`;
            params.push(parseInt(epoch));
        }
        
        query += ` ORDER BY vp.epoch_rewards DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const client = await pool.connect();
        const result = await client.query(query, params);
        client.release();
        
        res.json({
            validators: result.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.rows.length
            }
        });
    } catch (error) {
        logger.error('Error fetching validators:', error);
        res.status(500).json({ error: 'Failed to fetch validators' });
    }
});

// Get specific validator performance
app.get('/api/validators/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { epochs = 10 } = req.query;
        
        const query = `
            SELECT * FROM enhanced_validator_performance 
            WHERE validator_address = $1 
            ORDER BY epoch DESC 
            LIMIT $2
        `;
        
        const client = await pool.connect();
        const result = await client.query(query, [address, parseInt(epochs)]);
        client.release();
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Validator not found' });
        }
        
        res.json({
            validator_address: address,
            performance_history: result.rows,
            summary: {
                latest_epoch: result.rows[0]?.epoch || 0,
                avg_rewards: result.rows.reduce((sum, row) => sum + parseFloat(row.epoch_rewards || 0), 0) / result.rows.length,
                avg_stake: result.rows.reduce((sum, row) => sum + parseFloat(row.stake_amount || 0), 0) / result.rows.length,
                is_jito_enabled: result.rows[0]?.is_jito_enabled || false
            }
        });
    } catch (error) {
        logger.error('Error fetching validator:', error);
        res.status(500).json({ error: 'Failed to fetch validator data' });
    }
});

// Get validator MEV efficiency metrics
app.get('/api/validators/:address/mev-efficiency', async (req, res) => {
    try {
        const { address } = req.params;
        const { epochs = 5 } = req.query;
        
        const query = `
            SELECT * FROM mev_efficiency_metrics 
            WHERE validator_address = $1 
            ORDER BY epoch DESC 
            LIMIT $2
        `;
        
        const client = await pool.connect();
        const result = await client.query(query, [address, parseInt(epochs)]);
        client.release();
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'MEV efficiency data not found' });
        }
        
        res.json({
            validator_address: address,
            mev_efficiency_history: result.rows,
            latest_metrics: result.rows[0]
        });
    } catch (error) {
        logger.error('Error fetching MEV efficiency:', error);
        res.status(500).json({ error: 'Failed to fetch MEV efficiency data' });
    }
});

// Get validator rankings
app.get('/api/validators/rankings/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 50, jito_only } = req.query;
        
        let query = `
            SELECT vr.*, vp.epoch_rewards, vp.stake_amount
            FROM validator_rankings vr
            LEFT JOIN enhanced_validator_performance vp ON vr.validator_address = vp.validator_address
            WHERE vr.category = $1
        `;
        const params = [category];
        
        if (jito_only !== undefined) {
            query += ` AND vr.is_jito_enabled = $${params.length + 1}`;
            params.push(jito_only === 'true');
        }
        
        query += ` ORDER BY vr.rank ASC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit));
        
        const client = await pool.connect();
        const result = await client.query(query, params);
        client.release();
        
        res.json({
            category,
            rankings: result.rows,
            filters: {
                jito_only: jito_only || null,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        logger.error('Error fetching rankings:', error);
        res.status(500).json({ error: 'Failed to fetch validator rankings' });
    }
});

// Get validator comparisons (Jito vs Regular)
app.get('/api/validators/comparisons', async (req, res) => {
    try {
        const { comparison_type = 'jito_vs_regular', epochs = 7 } = req.query;
        
        const query = `
            SELECT * FROM validator_comparisons 
            WHERE comparison_type = $1 
            ORDER BY timestamp DESC 
            LIMIT $2
        `;
        
        const client = await pool.connect();
        const result = await client.query(query, [comparison_type, parseInt(epochs)]);
        client.release();
        
        res.json({
            comparison_type,
            comparisons: result.rows,
            latest: result.rows[0] || null
        });
    } catch (error) {
        logger.error('Error fetching comparisons:', error);
        res.status(500).json({ error: 'Failed to fetch validator comparisons' });
    }
});

// Get top performing validators by MEV efficiency
app.get('/api/validators/top-mev', async (req, res) => {
    try {
        const { limit = 20, min_score = 50 } = req.query;
        
        const query = `
            SELECT 
                mem.*,
                vp.stake_amount,
                vp.commission_rate,
                RANK() OVER (ORDER BY mem.overall_efficiency_score DESC) as mev_rank
            FROM mev_efficiency_metrics mem
            JOIN enhanced_validator_performance vp ON mem.validator_address = vp.validator_address
            WHERE mem.overall_efficiency_score >= $1
            AND mem.is_jito_enabled = true
            ORDER BY mem.overall_efficiency_score DESC
            LIMIT $2
        `;
        
        const client = await pool.connect();
        const result = await client.query(query, [parseInt(min_score), parseInt(limit)]);
        client.release();
        
        res.json({
            top_mev_validators: result.rows,
            criteria: {
                minimum_score: parseInt(min_score),
                jito_enabled_only: true
            }
        });
    } catch (error) {
        logger.error('Error fetching top MEV validators:', error);
        res.status(500).json({ error: 'Failed to fetch top MEV validators' });
    }
});

// Get validator performance statistics
app.get('/api/validators/statistics', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT validator_address) as total_validators,
                COUNT(DISTINCT CASE WHEN is_jito_enabled THEN validator_address END) as jito_validators,
                COUNT(DISTINCT CASE WHEN NOT is_jito_enabled THEN validator_address END) as regular_validators,
                AVG(epoch_rewards) as avg_rewards,
                AVG(stake_amount) as avg_stake,
                AVG(commission_rate) as avg_commission,
                SUM(epoch_rewards) as total_rewards,
                SUM(stake_amount) as total_stake
            FROM enhanced_validator_performance 
            WHERE timestamp > NOW() - INTERVAL '${parseInt(days)} days'
        `;
        
        const client = await pool.connect();
        const result = await client.query(statsQuery);
        const stats = result.rows[0];
        
        // Get MEV efficiency stats
        const mevStatsQuery = `
            SELECT 
                AVG(overall_efficiency_score) as avg_efficiency_score,
                AVG(mev_capture_rate) as avg_capture_rate,
                AVG(bundle_success_rate) as avg_bundle_success_rate
            FROM mev_efficiency_metrics 
            WHERE timestamp > NOW() - INTERVAL '${parseInt(days)} days'
            AND is_jito_enabled = true
        `;
        
        const mevResult = await client.query(mevStatsQuery);
        client.release();
        const mevStats = mevResult.rows[0];
        
        res.json({
            period_days: parseInt(days),
            validator_statistics: {
                total_validators: parseInt(stats.total_validators || 0),
                jito_validators: parseInt(stats.jito_validators || 0),
                regular_validators: parseInt(stats.regular_validators || 0),
                jito_percentage: stats.total_validators > 0 ? 
                    Math.round((stats.jito_validators / stats.total_validators) * 100) : 0
            },
            performance_statistics: {
                average_rewards: parseFloat(stats.avg_rewards || 0),
                average_stake: parseFloat(stats.avg_stake || 0),
                average_commission: parseFloat(stats.avg_commission || 0),
                total_rewards: parseFloat(stats.total_rewards || 0),
                total_stake: parseFloat(stats.total_stake || 0)
            },
            mev_statistics: {
                average_efficiency_score: parseFloat(mevStats.avg_efficiency_score || 0),
                average_capture_rate: parseFloat(mevStats.avg_capture_rate || 0),
                average_bundle_success_rate: parseFloat(mevStats.avg_bundle_success_rate || 0)
            }
        });
    } catch (error) {
        logger.error('Error fetching validator statistics:', error);
        res.status(500).json({ error: 'Failed to fetch validator statistics' });
    }
});

// Search validators
app.get('/api/validators/search', async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        
        if (!q || q.length < 3) {
            return res.status(400).json({ error: 'Search query must be at least 3 characters' });
        }
        
        const query = `
            SELECT DISTINCT 
                vp.validator_address,
                vp.epoch_rewards,
                vp.stake_amount,
                vp.commission_rate,
                vp.is_jito_enabled,
                vp.epoch,
                COALESCE(mem.overall_efficiency_score, 0) as efficiency_score
            FROM enhanced_validator_performance vp
            LEFT JOIN mev_efficiency_metrics mem ON vp.validator_address = mem.validator_address
            WHERE vp.validator_address ILIKE $1
            ORDER BY vp.epoch_rewards DESC
            LIMIT $2
        `;
        
        const client = await pool.connect();
        const result = await client.query(query, [`%${q}%`, parseInt(limit)]);
        client.release();
        
        res.json({
            search_query: q,
            results: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        logger.error('Error searching validators:', error);
        res.status(500).json({ error: 'Failed to search validators' });
    }
});

// MEV Reward Attribution API Routes

// Get MEV attribution for a specific validator
app.get('/api/mev/attribution/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { epoch_start, epoch_end, limit = 100 } = req.query;
        
        let query = `
            SELECT 
                mra.*,
                pbr.block_time,
                pbr.transaction_count,
                pbr.dex_interaction_count
            FROM mev_reward_attributions mra
            LEFT JOIN parsed_block_rewards pbr ON mra.block_slot = pbr.slot
            WHERE mra.validator_address = $1
        `;
        const params = [address];
        
        if (epoch_start && epoch_end) {
            query += ` AND mra.epoch BETWEEN $${params.length + 1} AND $${params.length + 2}`;
            params.push(parseInt(epoch_start), parseInt(epoch_end));
        }
        
        query += ` ORDER BY mra.block_slot DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit));
        
        const client = await pool.connect();
        const result = await client.query(query, params);
        client.release();
        
        // Calculate summary statistics
        const totalMEV = result.rows.reduce((sum, row) => sum + parseFloat(row.mev_rewards || 0), 0);
        const totalBlocks = result.rows.length;
        const mevBlocks = result.rows.filter(row => parseFloat(row.mev_rewards) > 0).length;
        const avgConfidence = result.rows.reduce((sum, row) => sum + parseFloat(row.attribution_confidence || 0), 0) / totalBlocks;
        
        res.json({
            validator_address: address,
            attribution_data: result.rows,
            summary: {
                total_blocks: totalBlocks,
                mev_blocks: mevBlocks,
                total_mev_rewards: totalMEV,
                mev_block_percentage: totalBlocks > 0 ? (mevBlocks / totalBlocks) * 100 : 0,
                avg_confidence: avgConfidence
            }
        });
    } catch (error) {
        logger.error('Error fetching MEV attribution:', error);
        res.status(500).json({ error: 'Failed to fetch MEV attribution data' });
    }
});

// Get MEV earnings for a validator
app.get('/api/mev/earnings/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { epoch_start, epoch_end } = req.query;
        
        const query = `
            SELECT * FROM validator_mev_earnings
            WHERE validator_address = $1
            AND epoch_start >= $2 AND epoch_end <= $3
            ORDER BY epoch_start DESC
        `;
        
        const client = await pool.connect();
        const result = await client.query(query, [
            address,
            parseInt(epoch_start || 0),
            parseInt(epoch_end || 999999)
        ]);
        client.release();
        
        res.json({
            validator_address: address,
            earnings_data: result.rows,
            total_earnings: result.rows.reduce((sum, row) => sum + parseFloat(row.total_mev_earnings || 0), 0)
        });
    } catch (error) {
        logger.error('Error fetching MEV earnings:', error);
        res.status(500).json({ error: 'Failed to fetch MEV earnings data' });
    }
});

// Get historical MEV performance for a validator
app.get('/api/mev/history/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { epochs = 30 } = req.query;
        
        const query = `
            SELECT * FROM historical_mev_performance
            WHERE validator_address = $1
            ORDER BY epoch DESC
            LIMIT $2
        `;
        
        const client = await pool.connect();
        const result = await client.query(query, [address, parseInt(epochs)]);
        client.release();
        
        // Calculate trends and summary
        const data = result.rows.reverse(); // Chronological order
        const revenues = data.map(d => parseFloat(d.mev_revenue || 0));
        const summary = {
            total_epochs: data.length,
            total_revenue: revenues.reduce((sum, r) => sum + r, 0),
            avg_revenue: revenues.length > 0 ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length : 0,
            max_revenue: revenues.length > 0 ? Math.max(...revenues) : 0,
            growth_trend: data.length > 1 ? (revenues[revenues.length - 1] - revenues[0]) / Math.max(revenues[0], 1) : 0
        };
        
        res.json({
            validator_address: address,
            historical_performance: data,
            summary
        });
    } catch (error) {
        logger.error('Error fetching MEV history:', error);
        res.status(500).json({ error: 'Failed to fetch MEV history' });
    }
});

// Get validator MEV profile
app.get('/api/mev/profile/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const query = `SELECT * FROM validator_mev_profiles WHERE validator_address = $1`;
        
        const client = await pool.connect();
        const result = await client.query(query, [address]);
        client.release();
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'MEV profile not found for this validator' });
        }
        
        const profile = result.rows[0];
        
        // Parse JSON fields
        profile.seasonal_patterns = JSON.parse(profile.seasonal_patterns || '{}');
        profile.confidence_intervals = JSON.parse(profile.confidence_intervals || '{}');
        profile.model_performance = JSON.parse(profile.model_performance || '{}');
        profile.peer_comparison = JSON.parse(profile.peer_comparison || '{}');
        
        res.json(profile);
    } catch (error) {
        logger.error('Error fetching MEV profile:', error);
        res.status(500).json({ error: 'Failed to fetch MEV profile' });
    }
});

// Get top MEV performers
app.get('/api/mev/leaderboard', async (req, res) => {
    try {
        const { period = '30', metric = 'revenue', limit = 50 } = req.query;
        
        let query;
        let params = [parseInt(limit)];
        
        if (metric === 'revenue') {
            query = `
                SELECT 
                    hmp.validator_address,
                    SUM(hmp.mev_revenue) as total_revenue,
                    AVG(hmp.mev_revenue) as avg_revenue,
                    COUNT(*) as epochs,
                    MAX(hmp.network_rank) as best_rank,
                    evp.is_jito_enabled
                FROM historical_mev_performance hmp
                JOIN enhanced_validator_performance evp ON hmp.validator_address = evp.validator_address
                WHERE hmp.created_at > NOW() - INTERVAL '${parseInt(period)} days'
                GROUP BY hmp.validator_address, evp.is_jito_enabled
                ORDER BY total_revenue DESC
                LIMIT $1
            `;
        } else if (metric === 'consistency') {
            query = `
                SELECT 
                    validator_address,
                    consistency_score,
                    avg_mev_per_block,
                    mev_capability_score
                FROM validator_mev_profiles
                WHERE last_updated > NOW() - INTERVAL '7 days'
                ORDER BY consistency_score DESC
                LIMIT $1
            `;
        }
        
        const client = await pool.connect();
        const result = await client.query(query, params);
        client.release();
        
        res.json({
            leaderboard_type: metric,
            period_days: parseInt(period),
            leaders: result.rows
        });
    } catch (error) {
        logger.error('Error fetching MEV leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch MEV leaderboard' });
    }
});

// Get network MEV statistics
app.get('/api/mev/network-stats', async (req, res) => {
    try {
        const { period = '7' } = req.query;
        
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT validator_address) as active_validators,
                SUM(mev_revenue) as total_network_mev,
                AVG(mev_revenue) as avg_validator_mev,
                SUM(mev_blocks) as total_mev_blocks,
                SUM(total_blocks) as total_blocks
            FROM historical_mev_performance
            WHERE created_at > NOW() - INTERVAL '${parseInt(period)} days'
        `;
        
        const jitoStatsQuery = `
            SELECT 
                COUNT(DISTINCT hmp.validator_address) as jito_validators,
                SUM(hmp.mev_revenue) as jito_total_mev,
                AVG(hmp.mev_revenue) as jito_avg_mev
            FROM historical_mev_performance hmp
            JOIN enhanced_validator_performance evp ON hmp.validator_address = evp.validator_address
            WHERE evp.is_jito_enabled = true
            AND hmp.created_at > NOW() - INTERVAL '${parseInt(period)} days'
        `;
        
        const client = await pool.connect();
        const [networkStats, jitoStats] = await Promise.all([
            client.query(statsQuery),
            client.query(jitoStatsQuery)
        ]);
        client.release();
        
        const network = networkStats.rows[0];
        const jito = jitoStats.rows[0];
        
        res.json({
            period_days: parseInt(period),
            network_statistics: {
                total_validators: parseInt(network.active_validators || 0),
                jito_validators: parseInt(jito.jito_validators || 0),
                regular_validators: parseInt(network.active_validators || 0) - parseInt(jito.jito_validators || 0),
                total_mev_revenue: parseFloat(network.total_network_mev || 0),
                jito_mev_share: parseFloat(jito.jito_total_mev || 0) / Math.max(parseFloat(network.total_network_mev || 1), 1),
                mev_block_percentage: parseInt(network.total_blocks || 0) > 0 ? 
                    (parseInt(network.total_mev_blocks || 0) / parseInt(network.total_blocks || 0)) * 100 : 0
            }
        });
    } catch (error) {
        logger.error('Error fetching network MEV stats:', error);
        res.status(500).json({ error: 'Failed to fetch network MEV statistics' });
    }
});

// Get parsed block data
app.get('/api/mev/blocks', async (req, res) => {
    try {
        const { limit = 100, validator_address, min_mev = 0 } = req.query;
        
        let query = `
            SELECT 
                pbr.*,
                mra.mev_rewards,
                mra.attribution_confidence,
                mra.attribution_method
            FROM parsed_block_rewards pbr
            LEFT JOIN mev_reward_attributions mra ON pbr.slot = mra.block_slot
            WHERE 1=1
        `;
        const params = [];
        
        if (validator_address) {
            query += ` AND pbr.validator_address = $${params.length + 1}`;
            params.push(validator_address);
        }
        
        if (parseFloat(min_mev) > 0) {
            query += ` AND mra.mev_rewards >= $${params.length + 1}`;
            params.push(parseFloat(min_mev));
        }
        
        query += ` ORDER BY pbr.slot DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit));
        
        const client = await pool.connect();
        const result = await client.query(query, params);
        client.release();
        
        res.json({
            blocks: result.rows,
            filters: {
                validator_address: validator_address || null,
                min_mev: parseFloat(min_mev),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        logger.error('Error fetching block data:', error);
        res.status(500).json({ error: 'Failed to fetch block data' });
    }
});

// WebSocket server management endpoints
app.get('/api/websocket/stats', (req, res) => {
  try {
    const stats = webSocketServer.getServerStats();
    res.json({
      success: true,
      webSocketStats: stats
    });
  } catch (error) {
    logger.error('Error getting WebSocket stats:', error);
    res.status(500).json({ error: 'Failed to get WebSocket statistics' });
  }
});

// WebSocket testing endpoint
app.post('/api/websocket/test', (req, res) => {
  try {
    const { channel, data } = req.body;
    
    if (!channel || !Object.values(webSocketServer.channels).includes(channel)) {
      return res.status(400).json({ error: 'Valid channel required' });
    }
    
    webSocketServer.triggerTestMessage(channel, data || { test: true });
    
    res.json({
      success: true,
      message: `Test message sent to channel: ${channel}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error sending test WebSocket message:', error);
    res.status(500).json({ error: 'Failed to send test message' });
  }
});

// WebSocket client information endpoint
app.get('/api/websocket/clients', (req, res) => {
  try {
    const clientStats = [];
    
    for (const [clientId, client] of webSocketServer.clients.entries()) {
      clientStats.push({
        id: clientId,
        authenticated: client.authenticated,
        connectedAt: client.connectedAt,
        messageCount: client.messageCount,
        subscriptions: Array.from(client.subscriptions),
        ip: client.ip?.replace(/^::ffff:/, '') || 'unknown' // Clean IPv6-mapped IPv4
      });
    }
    
    res.json({
      success: true,
      totalClients: clientStats.length,
      clients: clientStats
    });
  } catch (error) {
    logger.error('Error getting WebSocket client info:', error);
    res.status(500).json({ error: 'Failed to get WebSocket client information' });
  }
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await Promise.all([
    transactionMonitor.stop(),
    liquidationScanner.stop(),
    webSocketServer.shutdown()
  ]);
  
  // Stop delegation analytics engine
  try {
    delegationAnalyticsEngine.stopAnalytics();
  } catch (error) {
    logger.warn('Error stopping delegation analytics:', error.message);
  }
  
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await Promise.all([
    transactionMonitor.stop(),
    liquidationScanner.stop(),
    webSocketServer.shutdown()
  ]);
  
  // Stop delegation analytics engine
  try {
    delegationAnalyticsEngine.stopAnalytics();
  } catch (error) {
    logger.warn('Error stopping delegation analytics:', error.message);
  }
  
  await pool.end();
  process.exit(0);
});

if (require.main === module) {
  server.listen(PORT, async () => {
    logger.info(`MEV Analytics API server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Solana Network: ${config.solana.network}`);
    logger.info(`WebSocket server initialized at ws://localhost:${PORT}/ws`);
    
    // Start services
    try {
      await transactionMonitor.start();
      await liquidationScanner.start();
      
      // Start delegation analytics engine
      try {
        await delegationAnalyticsEngine.startAnalytics();
        logger.info('✅ Delegation Analytics Engine started');
      } catch (error) {
        logger.warn('⚠️ Delegation Analytics Engine failed to start:', error.message);
      }
      
      logger.info('✅ All services started successfully');
      
      // Send initial network stats to WebSocket clients
      setTimeout(() => {
        webSocketServer.emit('networkStatsUpdate', {
          servicesOnline: ['transactionMonitor', 'liquidationScanner', 'webSocketServer'],
          startupTime: new Date().toISOString(),
          network: config.solana.network
        });
      }, 5000);
    } catch (error) {
      logger.error('❌ Error starting services:', error);
    }
  });
}

module.exports = app;