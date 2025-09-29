const logger = require('../config/logger');
const EventEmitter = require('events');

class BundleRiskAssessment extends EventEmitter {
  constructor() {
    super();
    
    // Risk assessment configuration
    this.config = {
      maxAcceptableRisk: 7.5,        // Maximum acceptable risk score (1-10)
      minConfidenceLevel: 0.6,       // Minimum confidence required
      maxSlippageThreshold: 0.05,    // 5% maximum slippage tolerance
      maxGasRiskRatio: 0.3,          // Gas cost shouldn't exceed 30% of profit
      marketVolatilityThreshold: 0.1, // 10% volatility threshold
      liquidityRiskThreshold: 0.02   // 2% liquidity risk threshold
    };
    
    // Risk categories and weights
    this.riskCategories = {
      EXECUTION_RISK: 'execution',           // Transaction execution failure
      MARKET_RISK: 'market',                 // Price movement risk
      LIQUIDITY_RISK: 'liquidity',           // Insufficient liquidity
      COMPETITION_RISK: 'competition',       // MEV competition
      TECHNICAL_RISK: 'technical',           // Technical/system failures
      SLIPPAGE_RISK: 'slippage',             // Price slippage
      GAS_RISK: 'gas',                       // Gas cost fluctuation
      TIMING_RISK: 'timing'                  // Timing-dependent execution
    };
    
    // Risk weights for bundle scoring
    this.riskWeights = {
      execution: 0.25,    // 25% weight
      market: 0.20,       // 20% weight
      liquidity: 0.15,    // 15% weight
      competition: 0.15,  // 15% weight
      technical: 0.10,    // 10% weight
      slippage: 0.10,     // 10% weight
      gas: 0.03,          // 3% weight
      timing: 0.02        // 2% weight
    };
    
    // Historical risk data for learning
    this.historicalRiskData = [];
    this.maxHistoryLength = 1000;
    
    // Risk assessment statistics
    this.stats = {
      totalAssessments: 0,
      correctPredictions: 0,
      falsePositives: 0,
      falseNegatives: 0,
      averageRiskScore: 0,
      highRiskBundles: 0,
      successfulBundles: 0
    };
    
    // Market data cache for risk calculations
    this.marketDataCache = new Map();
    this.lastMarketUpdate = 0;
    
    // Risk model parameters
    this.riskModels = {
      volatility: this.calculateVolatilityRisk.bind(this),
      liquidity: this.calculateLiquidityRisk.bind(this),
      competition: this.calculateCompetitionRisk.bind(this),
      execution: this.calculateExecutionRisk.bind(this),
      market: this.calculateMarketRisk.bind(this),
      slippage: this.calculateSlippageRisk.bind(this),
      gas: this.calculateGasRisk.bind(this),
      timing: this.calculateTimingRisk.bind(this),
      technical: this.calculateTechnicalRisk.bind(this)
    };
  }

  async assessBundleRisk(bundle, marketConditions = {}) {
    const startTime = Date.now();
    this.stats.totalAssessments++;
    
    try {
      logger.info(`🎯 Assessing risk for bundle: ${bundle.transactions.length} transactions`);
      
      // Initialize risk assessment
      const riskAssessment = {
        bundleId: bundle.id,
        totalTransactions: bundle.transactions.length,
        assessmentTimestamp: Date.now(),
        marketConditions,
        riskScores: {},
        overallRisk: 0,
        riskLevel: 'unknown',
        recommendations: [],
        confidenceLevel: 0,
        mitigationStrategies: []
      };
      
      // Assess each risk category
      for (const [category, weight] of Object.entries(this.riskWeights)) {
        const riskScore = await this.assessRiskCategory(category, bundle, marketConditions);
        riskAssessment.riskScores[category] = {
          score: riskScore,
          weight,
          weightedScore: riskScore * weight
        };
      }
      
      // Calculate overall risk score
      riskAssessment.overallRisk = this.calculateOverallRisk(riskAssessment.riskScores);
      riskAssessment.riskLevel = this.categorizeRiskLevel(riskAssessment.overallRisk);
      
      // Calculate confidence level
      riskAssessment.confidenceLevel = this.calculateConfidenceLevel(bundle, marketConditions);
      
      // Generate recommendations
      riskAssessment.recommendations = this.generateRecommendations(riskAssessment);
      
      // Generate mitigation strategies
      riskAssessment.mitigationStrategies = this.generateMitigationStrategies(riskAssessment);
      
      // Validate assessment
      const validation = this.validateRiskAssessment(riskAssessment);
      riskAssessment.isValid = validation.isValid;
      riskAssessment.validationIssues = validation.issues;
      
      // Store for learning
      this.storeRiskAssessment(riskAssessment);
      
      // Update statistics
      this.updateRiskStatistics(riskAssessment);
      
      const assessmentTime = Date.now() - startTime;
      logger.info(`✅ Risk assessment completed: ${riskAssessment.riskLevel} risk (${riskAssessment.overallRisk.toFixed(2)}/10) in ${assessmentTime}ms`);
      
      return riskAssessment;
      
    } catch (error) {
      logger.error('Error assessing bundle risk:', error);
      return this.getFallbackRiskAssessment(bundle);
    }
  }

  async assessRiskCategory(category, bundle, marketConditions) {
    try {
      const riskModel = this.riskModels[category];
      if (!riskModel) {
        logger.warn(`Unknown risk category: ${category}`);
        return 5.0; // Default moderate risk
      }
      
      const riskScore = await riskModel(bundle, marketConditions);
      return Math.max(0, Math.min(10, riskScore)); // Ensure 0-10 range
      
    } catch (error) {
      logger.error(`Error assessing ${category} risk:`, error);
      return 5.0; // Default to moderate risk on error
    }
  }

  async calculateExecutionRisk(bundle, marketConditions) {
    let riskScore = 0;
    
    // Transaction count risk - more transactions = higher risk
    const txCountRisk = Math.min(bundle.transactions.length * 0.5, 5);
    riskScore += txCountRisk;
    
    // Dependency complexity risk
    const dependencyRisk = this.calculateDependencyRisk(bundle.transactions);
    riskScore += dependencyRisk;
    
    // DEX reliability risk
    const dexRisk = this.calculateDEXReliabilityRisk(bundle.transactions);
    riskScore += dexRisk;
    
    // Gas estimation uncertainty
    const gasRisk = this.calculateGasEstimationRisk(bundle);
    riskScore += gasRisk;
    
    // Network congestion impact
    const networkRisk = this.calculateNetworkCongestionRisk(marketConditions);
    riskScore += networkRisk;
    
    return Math.min(riskScore, 10);
  }

  calculateDependencyRisk(transactions) {
    // Analyze transaction dependencies for execution risk
    let dependencyRisk = 0;
    const dexUsage = new Map();
    const tokenFlow = new Map();
    
    for (const tx of transactions) {
      // Track DEX usage
      dexUsage.set(tx.dex, (dexUsage.get(tx.dex) || 0) + 1);
      
      // Track token flow dependencies
      if (tx.tokens) {
        for (const token of tx.tokens) {
          const key = `${token.mint}_${token.direction}`;
          tokenFlow.set(key, (tokenFlow.get(key) || 0) + 1);
        }
      }
    }
    
    // Multiple transactions on same DEX increase risk
    for (const [dex, count] of dexUsage.entries()) {
      if (count > 2) {
        dependencyRisk += (count - 2) * 0.5;
      }
    }
    
    // Complex token flows increase risk
    const uniqueTokens = new Set([...tokenFlow.keys()].map(key => key.split('_')[0]));
    if (uniqueTokens.size > 5) {
      dependencyRisk += 1.0;
    }
    
    return Math.min(dependencyRisk, 3);
  }

  calculateDEXReliabilityRisk(transactions) {
    // DEX reliability scores (based on historical performance)
    const dexReliability = {
      raydium: 0.2,    // Very reliable
      orca: 0.3,       // Reliable
      jupiter: 0.4,    // Moderate (aggregator complexity)
      openbook: 0.5,   // Moderate
      mango: 0.6       // Higher risk due to complexity
    };
    
    let totalRisk = 0;
    const uniqueDEXs = new Set(transactions.map(tx => tx.dex));
    
    for (const dex of uniqueDEXs) {
      totalRisk += dexReliability[dex] || 0.7; // Default higher risk for unknown DEXs
    }
    
    return Math.min(totalRisk, 3);
  }

  calculateGasEstimationRisk(bundle) {
    // Risk from gas cost estimation uncertainty
    let gasRisk = 0;
    
    if (bundle.estimatedGasCost) {
      const gasToProfit = bundle.estimatedGasCost / bundle.estimatedProfit;
      
      if (gasToProfit > 0.5) {
        gasRisk += 2.0; // High gas to profit ratio
      } else if (gasToProfit > 0.3) {
        gasRisk += 1.0; // Moderate gas to profit ratio
      }
    }
    
    // Complex transactions have higher gas estimation uncertainty
    const complexTxCount = bundle.transactions.filter(tx => 
      tx.type === 'flashloan' || tx.type === 'liquidation'
    ).length;
    
    gasRisk += complexTxCount * 0.3;
    
    return Math.min(gasRisk, 2);
  }

  calculateNetworkCongestionRisk(marketConditions) {
    const congestionLevel = marketConditions.networkCongestion || 'normal';
    
    switch (congestionLevel) {
      case 'low': return 0.2;
      case 'normal': return 0.5;
      case 'high': return 1.5;
      case 'extreme': return 3.0;
      default: return 1.0;
    }
  }

  async calculateMarketRisk(bundle, marketConditions) {
    let marketRisk = 0;
    
    // Price volatility risk
    const volatilityRisk = await this.calculateVolatilityRisk(bundle, marketConditions);
    marketRisk += volatilityRisk;
    
    // Market timing risk
    const timingRisk = this.calculateMarketTimingRisk(bundle, marketConditions);
    marketRisk += timingRisk;
    
    // Correlation risk (multiple positions in correlated assets)
    const correlationRisk = this.calculateCorrelationRisk(bundle);
    marketRisk += correlationRisk;
    
    return Math.min(marketRisk, 10);
  }

  async calculateVolatilityRisk(bundle, marketConditions) {
    let volatilityRisk = 0;
    
    // Get unique tokens in bundle
    const tokens = new Set();
    bundle.transactions.forEach(tx => {
      if (tx.tokens) {
        tx.tokens.forEach(token => tokens.add(token.symbol));
      }
    });
    
    // Assess volatility for each token
    for (const tokenSymbol of tokens) {
      const volatility = await this.getTokenVolatility(tokenSymbol);
      
      if (volatility > 0.2) {        // >20% volatility
        volatilityRisk += 2.0;
      } else if (volatility > 0.1) {  // >10% volatility
        volatilityRisk += 1.0;
      } else if (volatility > 0.05) { // >5% volatility
        volatilityRisk += 0.5;
      }
    }
    
    return Math.min(volatilityRisk, 4);
  }

  calculateMarketTimingRisk(bundle, marketConditions) {
    let timingRisk = 0;
    
    // Time-sensitive strategies have higher timing risk
    const timeSensitiveTx = bundle.transactions.filter(tx => 
      tx.type === 'sandwich' || tx.type === 'arbitrage'
    ).length;
    
    timingRisk += timeSensitiveTx * 0.5;
    
    // Market hours risk (off-hours have lower liquidity)
    const currentHour = new Date().getUTCHours();
    if (currentHour < 6 || currentHour > 22) { // Off-peak hours
      timingRisk += 1.0;
    }
    
    return Math.min(timingRisk, 3);
  }

  calculateCorrelationRisk(bundle) {
    // Risk from highly correlated positions
    const tokenPairs = [];
    
    bundle.transactions.forEach(tx => {
      if (tx.tokens && tx.tokens.length >= 2) {
        for (let i = 0; i < tx.tokens.length; i++) {
          for (let j = i + 1; j < tx.tokens.length; j++) {
            tokenPairs.push([tx.tokens[i].symbol, tx.tokens[j].symbol]);
          }
        }
      }
    });
    
    // Check for highly correlated pairs
    let correlationRisk = 0;
    const highCorrelationPairs = [
      ['BTC', 'ETH'],
      ['USDC', 'USDT'],
      ['SOL', 'ETH']
    ];
    
    for (const [token1, token2] of tokenPairs) {
      const isHighCorrelation = highCorrelationPairs.some(([t1, t2]) => 
        (token1 === t1 && token2 === t2) || (token1 === t2 && token2 === t1)
      );
      
      if (isHighCorrelation) {
        correlationRisk += 0.5;
      }
    }
    
    return Math.min(correlationRisk, 2);
  }

  async calculateLiquidityRisk(bundle, marketConditions) {
    let liquidityRisk = 0;
    
    // Calculate total trade size impact
    const totalTradeSize = bundle.transactions.reduce((sum, tx) => 
      sum + (tx.valueUSD || 0), 0
    );
    
    // Large trade sizes have higher liquidity risk
    if (totalTradeSize > 1000000) {      // >$1M
      liquidityRisk += 3.0;
    } else if (totalTradeSize > 500000) { // >$500k
      liquidityRisk += 2.0;
    } else if (totalTradeSize > 100000) { // >$100k
      liquidityRisk += 1.0;
    }
    
    // DEX liquidity assessment
    const dexLiquidityRisk = await this.assessDEXLiquidity(bundle.transactions);
    liquidityRisk += dexLiquidityRisk;
    
    // Token pair liquidity
    const tokenLiquidityRisk = await this.assessTokenLiquidity(bundle);
    liquidityRisk += tokenLiquidityRisk;
    
    return Math.min(liquidityRisk, 10);
  }

  async assessDEXLiquidity(transactions) {
    // DEX liquidity reliability scores
    const dexLiquidity = {
      raydium: 0.2,    // Deep liquidity
      orca: 0.3,       // Good liquidity
      jupiter: 0.1,    // Aggregated liquidity (best)
      openbook: 0.4,   // Moderate liquidity
      mango: 0.5       // Lower liquidity
    };
    
    let liquidityRisk = 0;
    const dexUsage = new Map();
    
    transactions.forEach(tx => {
      dexUsage.set(tx.dex, (dexUsage.get(tx.dex) || 0) + (tx.valueUSD || 0));
    });
    
    for (const [dex, volume] of dexUsage.entries()) {
      const dexRisk = dexLiquidity[dex] || 0.6;
      const volumeMultiplier = volume > 100000 ? 1.5 : 1.0;
      liquidityRisk += dexRisk * volumeMultiplier;
    }
    
    return Math.min(liquidityRisk, 3);
  }

  async assessTokenLiquidity(bundle) {
    // Assess liquidity for tokens involved
    const tokens = new Set();
    bundle.transactions.forEach(tx => {
      if (tx.tokens) {
        tx.tokens.forEach(token => tokens.add(token.symbol));
      }
    });
    
    let tokenLiquidityRisk = 0;
    
    // Low liquidity tokens
    const lowLiquidityTokens = ['BONK', 'SAMO', 'FIDA'];
    
    for (const tokenSymbol of tokens) {
      if (lowLiquidityTokens.includes(tokenSymbol)) {
        tokenLiquidityRisk += 1.0;
      }
    }
    
    return Math.min(tokenLiquidityRisk, 2);
  }

  async calculateCompetitionRisk(bundle, marketConditions) {
    let competitionRisk = 0;
    
    // High-value bundles attract more competition
    if (bundle.estimatedProfit > 0.1) {      // >0.1 SOL
      competitionRisk += 2.0;
    } else if (bundle.estimatedProfit > 0.05) { // >0.05 SOL
      competitionRisk += 1.0;
    }
    
    // Popular token pairs have more competition
    const popularTokens = ['SOL', 'USDC', 'USDT', 'BTC', 'ETH'];
    let popularTokenCount = 0;
    
    bundle.transactions.forEach(tx => {
      if (tx.tokens) {
        tx.tokens.forEach(token => {
          if (popularTokens.includes(token.symbol)) {
            popularTokenCount++;
          }
        });
      }
    });
    
    competitionRisk += Math.min(popularTokenCount * 0.3, 2.0);
    
    // MEV strategy competition levels
    const strategyCompetition = {
      arbitrage: 2.0,    // High competition
      sandwich: 2.5,     // Very high competition
      liquidation: 1.5,  // Moderate competition
      flashloan: 1.0     // Lower competition
    };
    
    const strategies = new Set(bundle.transactions.map(tx => tx.type));
    for (const strategy of strategies) {
      competitionRisk += strategyCompetition[strategy] || 1.0;
    }
    
    return Math.min(competitionRisk, 10);
  }

  async calculateSlippageRisk(bundle, marketConditions) {
    let slippageRisk = 0;
    
    // Calculate expected slippage for each transaction
    for (const tx of bundle.transactions) {
      const expectedSlippage = tx.estimatedSlippage || 0.01; // Default 1%
      
      if (expectedSlippage > 0.05) {      // >5% slippage
        slippageRisk += 3.0;
      } else if (expectedSlippage > 0.03) { // >3% slippage
        slippageRisk += 2.0;
      } else if (expectedSlippage > 0.01) { // >1% slippage
        slippageRisk += 1.0;
      }
    }
    
    // Bundle size amplifies slippage risk
    if (bundle.transactions.length > 5) {
      slippageRisk *= 1.2;
    }
    
    return Math.min(slippageRisk, 10);
  }

  async calculateGasRisk(bundle, marketConditions) {
    let gasRisk = 0;
    
    // Gas to profit ratio risk
    if (bundle.estimatedGasCost && bundle.estimatedProfit) {
      const gasRatio = bundle.estimatedGasCost / bundle.estimatedProfit;
      
      if (gasRatio > 0.5) {
        gasRisk += 3.0;
      } else if (gasRatio > 0.3) {
        gasRisk += 2.0;
      } else if (gasRatio > 0.1) {
        gasRisk += 1.0;
      }
    }
    
    // Network congestion gas risk
    const congestionRisk = this.calculateNetworkCongestionRisk(marketConditions);
    gasRisk += congestionRisk * 0.5;
    
    return Math.min(gasRisk, 10);
  }

  async calculateTimingRisk(bundle, marketConditions) {
    let timingRisk = 0;
    
    // Time-sensitive transaction count
    const timeSensitive = bundle.transactions.filter(tx => 
      tx.type === 'sandwich' || tx.type === 'arbitrage'
    ).length;
    
    timingRisk += timeSensitive * 1.0;
    
    // Bundle size timing risk
    const executionTime = bundle.estimatedExecutionTime || 15000; // Default 15s
    if (executionTime > 30000) {      // >30 seconds
      timingRisk += 2.0;
    } else if (executionTime > 15000) { // >15 seconds
      timingRisk += 1.0;
    }
    
    return Math.min(timingRisk, 10);
  }

  async calculateTechnicalRisk(bundle, marketConditions) {
    let technicalRisk = 0;
    
    // RPC reliability risk
    technicalRisk += 0.5;
    
    // Transaction complexity technical risk
    const complexTx = bundle.transactions.filter(tx => 
      tx.type === 'flashloan' || tx.type === 'liquidation'
    ).length;
    
    technicalRisk += complexTx * 0.5;
    
    // Bundle size technical risk
    if (bundle.transactions.length > 8) {
      technicalRisk += 1.0;
    }
    
    return Math.min(technicalRisk, 10);
  }

  calculateOverallRisk(riskScores) {
    let overallRisk = 0;
    
    for (const [category, riskData] of Object.entries(riskScores)) {
      overallRisk += riskData.weightedScore;
    }
    
    return Math.min(overallRisk, 10);
  }

  categorizeRiskLevel(riskScore) {
    if (riskScore <= 2.5) return 'LOW';
    if (riskScore <= 5.0) return 'MODERATE';
    if (riskScore <= 7.5) return 'HIGH';
    return 'EXTREME';
  }

  calculateConfidenceLevel(bundle, marketConditions) {
    let confidence = 0.8; // Base confidence
    
    // Historical data availability
    const historicalCount = this.historicalRiskData.filter(
      data => data.bundleSize === bundle.transactions.length
    ).length;
    
    if (historicalCount > 50) {
      confidence += 0.1;
    } else if (historicalCount < 10) {
      confidence -= 0.2;
    }
    
    // Market data quality
    if (marketConditions.dataQuality === 'high') {
      confidence += 0.1;
    } else if (marketConditions.dataQuality === 'low') {
      confidence -= 0.2;
    }
    
    // Bundle complexity
    const complexTx = bundle.transactions.filter(tx => 
      tx.type === 'flashloan' || tx.type === 'liquidation'
    ).length;
    
    confidence -= complexTx * 0.05;
    
    return Math.max(0.3, Math.min(0.95, confidence));
  }

  generateRecommendations(riskAssessment) {
    const recommendations = [];
    
    // High overall risk
    if (riskAssessment.overallRisk > this.config.maxAcceptableRisk) {
      recommendations.push({
        type: 'WARNING',
        message: 'Bundle risk exceeds acceptable threshold',
        action: 'Consider reducing bundle size or removing high-risk transactions'
      });
    }
    
    // High execution risk
    if (riskAssessment.riskScores.execution?.score > 7) {
      recommendations.push({
        type: 'OPTIMIZATION',
        message: 'High execution risk detected',
        action: 'Simplify transaction dependencies or reduce bundle complexity'
      });
    }
    
    // High gas risk
    if (riskAssessment.riskScores.gas?.score > 6) {
      recommendations.push({
        type: 'COST',
        message: 'Gas costs may significantly impact profitability',
        action: 'Consider optimizing transaction order or using gas-efficient DEXs'
      });
    }
    
    // Low confidence
    if (riskAssessment.confidenceLevel < this.config.minConfidenceLevel) {
      recommendations.push({
        type: 'UNCERTAINTY',
        message: 'Low confidence in risk assessment',
        action: 'Gather more market data or reduce position sizes'
      });
    }
    
    return recommendations;
  }

  generateMitigationStrategies(riskAssessment) {
    const strategies = [];
    
    // Market risk mitigation
    if (riskAssessment.riskScores.market?.score > 6) {
      strategies.push({
        risk: 'market',
        strategy: 'Implement stop-loss mechanisms and reduce position sizes',
        effectiveness: 0.7
      });
    }
    
    // Liquidity risk mitigation
    if (riskAssessment.riskScores.liquidity?.score > 6) {
      strategies.push({
        risk: 'liquidity',
        strategy: 'Split large orders across multiple DEXs or time intervals',
        effectiveness: 0.6
      });
    }
    
    // Competition risk mitigation
    if (riskAssessment.riskScores.competition?.score > 7) {
      strategies.push({
        risk: 'competition',
        strategy: 'Increase priority fees and optimize transaction timing',
        effectiveness: 0.5
      });
    }
    
    return strategies;
  }

  validateRiskAssessment(riskAssessment) {
    const issues = [];
    let isValid = true;
    
    // Check for missing risk scores
    for (const category of Object.keys(this.riskWeights)) {
      if (!riskAssessment.riskScores[category]) {
        issues.push(`Missing risk score for category: ${category}`);
        isValid = false;
      }
    }
    
    // Check overall risk bounds
    if (riskAssessment.overallRisk < 0 || riskAssessment.overallRisk > 10) {
      issues.push('Overall risk score out of bounds (0-10)');
      isValid = false;
    }
    
    // Check confidence level bounds
    if (riskAssessment.confidenceLevel < 0 || riskAssessment.confidenceLevel > 1) {
      issues.push('Confidence level out of bounds (0-1)');
      isValid = false;
    }
    
    return { isValid, issues };
  }

  async getTokenVolatility(tokenSymbol) {
    try {
      // Get token volatility from cache or calculate
      const cacheKey = `volatility_${tokenSymbol}`;
      if (this.marketDataCache.has(cacheKey)) {
        return this.marketDataCache.get(cacheKey);
      }
      
      // Mock volatility calculation - in production, use real market data
      const mockVolatility = {
        'SOL': 0.08,
        'BTC': 0.06,
        'ETH': 0.07,
        'USDC': 0.001,
        'USDT': 0.001,
        'RAY': 0.12,
        'BONK': 0.25
      };
      
      const volatility = mockVolatility[tokenSymbol] || 0.15; // Default 15% for unknown tokens
      
      this.marketDataCache.set(cacheKey, volatility);
      return volatility;
      
    } catch (error) {
      logger.error(`Error getting volatility for ${tokenSymbol}:`, error);
      return 0.1; // Default 10% volatility
    }
  }

  storeRiskAssessment(riskAssessment) {
    this.historicalRiskData.push({
      timestamp: riskAssessment.assessmentTimestamp,
      bundleSize: riskAssessment.totalTransactions,
      overallRisk: riskAssessment.overallRisk,
      riskLevel: riskAssessment.riskLevel,
      confidenceLevel: riskAssessment.confidenceLevel
    });
    
    // Limit history size
    if (this.historicalRiskData.length > this.maxHistoryLength) {
      this.historicalRiskData = this.historicalRiskData.slice(-this.maxHistoryLength);
    }
  }

  updateRiskStatistics(riskAssessment) {
    const currentAvg = this.stats.averageRiskScore;
    this.stats.averageRiskScore = (
      (currentAvg * (this.stats.totalAssessments - 1) + riskAssessment.overallRisk) / 
      this.stats.totalAssessments
    );
    
    if (riskAssessment.riskLevel === 'HIGH' || riskAssessment.riskLevel === 'EXTREME') {
      this.stats.highRiskBundles++;
    }
  }

  getFallbackRiskAssessment(bundle) {
    return {
      bundleId: bundle.id,
      totalTransactions: bundle.transactions.length,
      assessmentTimestamp: Date.now(),
      riskScores: {
        execution: { score: 5.0, weight: 0.25, weightedScore: 1.25 },
        market: { score: 5.0, weight: 0.20, weightedScore: 1.0 },
        liquidity: { score: 5.0, weight: 0.15, weightedScore: 0.75 },
        competition: { score: 5.0, weight: 0.15, weightedScore: 0.75 },
        technical: { score: 5.0, weight: 0.10, weightedScore: 0.5 },
        slippage: { score: 5.0, weight: 0.10, weightedScore: 0.5 },
        gas: { score: 5.0, weight: 0.03, weightedScore: 0.15 },
        timing: { score: 5.0, weight: 0.02, weightedScore: 0.1 }
      },
      overallRisk: 5.0,
      riskLevel: 'MODERATE',
      recommendations: [{
        type: 'WARNING',
        message: 'Using fallback risk assessment due to calculation error',
        action: 'Review bundle manually before execution'
      }],
      confidenceLevel: 0.3,
      mitigationStrategies: [],
      isValid: true,
      validationIssues: []
    };
  }

  getRiskStats() {
    return {
      ...this.stats,
      accuracy: this.stats.totalAssessments > 0 ? 
        (this.stats.correctPredictions / this.stats.totalAssessments * 100).toFixed(2) + '%' : '0%',
      historicalDataPoints: this.historicalRiskData.length
    };
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Bundle risk assessment configuration updated');
    this.emit('configUpdated', this.config);
  }
}

module.exports = BundleRiskAssessment;