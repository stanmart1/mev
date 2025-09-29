const config = require('../config/config');
const logger = require('../config/logger');
const pool = require('../config/database');
const EventEmitter = require('events');

class AdvancedRiskModel extends EventEmitter {
  constructor() {
    super();
    
    // Risk model parameters
    this.riskFactors = {
      // Market risk factors
      volatility: {
        weight: 0.25,
        thresholds: { low: 0.05, medium: 0.15, high: 0.30 }
      },
      liquidity: {
        weight: 0.20,
        thresholds: { low: 1000, medium: 10000, high: 100000 } // USD volume
      },
      marketTrend: {
        weight: 0.15,
        thresholds: { bullish: 0.05, neutral: 0.02, bearish: -0.05 }
      },
      
      // Position-specific risk factors
      healthFactor: {
        weight: 0.20,
        thresholds: { critical: 0.95, danger: 1.0, warning: 1.05 }
      },
      positionSize: {
        weight: 0.10,
        thresholds: { small: 100, medium: 1000, large: 10000 } // USD
      },
      
      // Execution risk factors
      competition: {
        weight: 0.10,
        thresholds: { low: 2, medium: 5, high: 10 } // competing bots
      }
    };
    
    // Historical data for model training
    this.historicalData = {
      priceHistory: new Map(), // token -> price history
      volatilityHistory: new Map(), // token -> volatility history
      liquidationHistory: [], // past liquidation results
      competitionMetrics: new Map() // protocol -> competition data
    };
    
    // Model performance tracking
    this.modelPerformance = {
      predictions: [],
      accuracy: 0,
      falsePositives: 0,
      falseNegatives: 0,
      lastUpdate: null
    };
    
    // Risk prediction cache
    this.riskCache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  async calculateAdvancedRiskScore(opportunity) {
    try {
      const cacheKey = `${opportunity.protocol}_${opportunity.obligationPubkey}`;
      
      // Check cache first
      const cached = this.riskCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.riskScore;
      }
      
      // Gather risk factors
      const riskFactors = await this.gatherRiskFactors(opportunity);
      
      // Calculate weighted risk score
      const riskScore = await this.calculateWeightedRiskScore(riskFactors);
      
      // Apply machine learning adjustments
      const adjustedScore = await this.applyMLAdjustments(riskScore, riskFactors, opportunity);
      
      // Cache result
      this.riskCache.set(cacheKey, {
        riskScore: adjustedScore,
        timestamp: Date.now(),
        factors: riskFactors
      });
      
      // Log detailed risk analysis
      this.logRiskAnalysis(opportunity, adjustedScore, riskFactors);
      
      return adjustedScore;
      
    } catch (error) {
      logger.error('Error calculating advanced risk score:', error);
      return opportunity.riskScore || 5; // Fallback to basic risk score
    }
  }

  async gatherRiskFactors(opportunity) {
    const factors = {};
    
    // Market volatility analysis
    factors.volatility = await this.calculateVolatility(opportunity);
    
    // Liquidity analysis
    factors.liquidity = await this.analyzeLiquidity(opportunity);
    
    // Market trend analysis
    factors.marketTrend = await this.analyzeMarketTrend(opportunity);
    
    // Health factor analysis
    factors.healthFactor = this.analyzeHealthFactor(opportunity);
    
    // Position size analysis
    factors.positionSize = this.analyzePositionSize(opportunity);
    
    // Competition analysis
    factors.competition = await this.analyzeCompetition(opportunity);
    
    // Time-based factors
    factors.timingRisk = await this.analyzeTimingRisk(opportunity);
    
    // Protocol-specific risks
    factors.protocolRisk = await this.analyzeProtocolRisk(opportunity);
    
    return factors;
  }

  async calculateVolatility(opportunity) {
    try {
      const collateralTokens = opportunity.collaterals.map(c => c.symbol);
      let totalVolatility = 0;
      let count = 0;
      
      for (const token of collateralTokens) {
        const volatility = await this.getTokenVolatility(token);
        totalVolatility += volatility;
        count++;
      }
      
      const avgVolatility = count > 0 ? totalVolatility / count : 0.1;
      
      return {
        value: avgVolatility,
        score: this.volatilityToRiskScore(avgVolatility),
        weight: this.riskFactors.volatility.weight
      };
    } catch (error) {
      logger.debug('Error calculating volatility:', error.message);
      return { value: 0.1, score: 5, weight: this.riskFactors.volatility.weight };
    }
  }

  async getTokenVolatility(token) {
    // Get price history from cache or calculate
    const priceHistory = this.historicalData.priceHistory.get(token) || [];
    
    if (priceHistory.length < 10) {
      // Not enough data, use default values
      const defaultVolatility = {
        'SOL': 0.15, 'USDC': 0.02, 'USDT': 0.02,
        'ETH': 0.18, 'BTC': 0.20, 'RAY': 0.25, 'SRM': 0.30
      };
      return defaultVolatility[token] || 0.20;
    }
    
    // Calculate standard deviation of price changes
    const returns = [];
    for (let i = 1; i < priceHistory.length; i++) {
      const return_ = (priceHistory[i].price - priceHistory[i-1].price) / priceHistory[i-1].price;
      returns.push(return_);
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  volatilityToRiskScore(volatility) {
    const thresholds = this.riskFactors.volatility.thresholds;
    if (volatility < thresholds.low) return 2;
    if (volatility < thresholds.medium) return 5;
    if (volatility < thresholds.high) return 8;
    return 10;
  }

  async analyzeLiquidity(opportunity) {
    try {
      // Analyze liquidity for each collateral token
      let minLiquidity = Infinity;
      
      for (const collateral of opportunity.collaterals) {
        const liquidity = await this.getTokenLiquidity(collateral.symbol);
        minLiquidity = Math.min(minLiquidity, liquidity);
      }
      
      return {
        value: minLiquidity,
        score: this.liquidityToRiskScore(minLiquidity),
        weight: this.riskFactors.liquidity.weight
      };
    } catch (error) {
      logger.debug('Error analyzing liquidity:', error.message);
      return { value: 10000, score: 5, weight: this.riskFactors.liquidity.weight };
    }
  }

  async getTokenLiquidity(token) {
    // Mock liquidity data - in production, fetch from DEX APIs
    const mockLiquidity = {
      'SOL': 50000, 'USDC': 100000, 'USDT': 80000,
      'ETH': 30000, 'BTC': 25000, 'RAY': 15000, 'SRM': 8000
    };
    
    return mockLiquidity[token] || 5000;
  }

  liquidityToRiskScore(liquidity) {
    const thresholds = this.riskFactors.liquidity.thresholds;
    if (liquidity > thresholds.high) return 2;
    if (liquidity > thresholds.medium) return 5;
    if (liquidity > thresholds.low) return 8;
    return 10;
  }

  async analyzeMarketTrend(opportunity) {
    try {
      // Analyze 24h trend for collateral tokens
      let totalTrend = 0;
      let count = 0;
      
      for (const collateral of opportunity.collaterals) {
        const trend = await this.getTokenTrend(collateral.symbol);
        totalTrend += trend;
        count++;
      }
      
      const avgTrend = count > 0 ? totalTrend / count : 0;
      
      return {
        value: avgTrend,
        score: this.trendToRiskScore(avgTrend),
        weight: this.riskFactors.marketTrend.weight
      };
    } catch (error) {
      logger.debug('Error analyzing market trend:', error.message);
      return { value: 0, score: 5, weight: this.riskFactors.marketTrend.weight };
    }
  }

  async getTokenTrend(token) {
    // Mock 24h price change - in production, fetch from price APIs
    const mockTrends = {
      'SOL': 0.02, 'USDC': 0.001, 'USDT': 0.0005,
      'ETH': 0.015, 'BTC': 0.01, 'RAY': -0.03, 'SRM': -0.05
    };
    
    return mockTrends[token] || (Math.random() - 0.5) * 0.1;
  }

  trendToRiskScore(trend) {
    const thresholds = this.riskFactors.marketTrend.thresholds;
    if (trend > thresholds.bullish) return 3; // Bullish market, lower risk
    if (trend > thresholds.neutral) return 5; // Neutral market
    if (trend > thresholds.bearish) return 7; // Slight downtrend
    return 9; // Strong downtrend, higher risk
  }

  analyzeHealthFactor(opportunity) {
    const healthFactor = opportunity.healthFactor;
    const thresholds = this.riskFactors.healthFactor.thresholds;
    
    let score;
    if (healthFactor < thresholds.critical) score = 3; // Very liquidatable
    else if (healthFactor < thresholds.danger) score = 5; // Liquidatable
    else if (healthFactor < thresholds.warning) score = 7; // Close to liquidation
    else score = 9; // Timing risk

    return {
      value: healthFactor,
      score,
      weight: this.riskFactors.healthFactor.weight
    };
  }

  analyzePositionSize(opportunity) {
    const positionSize = opportunity.totalCollateralUSD;
    const thresholds = this.riskFactors.positionSize.thresholds;
    
    let score;
    if (positionSize < thresholds.small) score = 3; // Small position, low competition
    else if (positionSize < thresholds.medium) score = 5; // Medium position
    else if (positionSize < thresholds.large) score = 7; // Large position, more competition
    else score = 9; // Very large position, high competition

    return {
      value: positionSize,
      score,
      weight: this.riskFactors.positionSize.weight
    };
  }

  async analyzeCompetition(opportunity) {
    try {
      const protocolCompetition = await this.getProtocolCompetition(opportunity.protocol);
      const timeOfDay = this.getTimeOfDayFactor();
      
      // Adjust competition based on time of day (more bots active during US hours)
      const adjustedCompetition = protocolCompetition * timeOfDay;
      
      return {
        value: adjustedCompetition,
        score: this.competitionToRiskScore(adjustedCompetition),
        weight: this.riskFactors.competition.weight
      };
    } catch (error) {
      logger.debug('Error analyzing competition:', error.message);
      return { value: 5, score: 5, weight: this.riskFactors.competition.weight };
    }
  }

  async getProtocolCompetition(protocol) {
    // Mock competition data - in production, analyze mempool and recent liquidations
    const protocolCompetition = {
      'solend': 8, // High competition
      'portFinance': 5, // Medium competition
      'francium': 3 // Lower competition
    };
    
    return protocolCompetition[protocol] || 5;
  }

  getTimeOfDayFactor() {
    const hour = new Date().getUTCHours();
    
    // US trading hours (EST): 9 AM - 4 PM = 14:00 - 21:00 UTC
    if (hour >= 14 && hour <= 21) return 1.5; // High competition
    
    // Asian trading hours: 0:00 - 8:00 UTC
    if (hour >= 0 && hour <= 8) return 1.2; // Medium competition
    
    // Off hours
    return 0.8; // Lower competition
  }

  competitionToRiskScore(competition) {
    const thresholds = this.riskFactors.competition.thresholds;
    if (competition < thresholds.low) return 2;
    if (competition < thresholds.medium) return 5;
    if (competition < thresholds.high) return 8;
    return 10;
  }

  async analyzeTimingRisk(opportunity) {
    // Analyze how quickly the position is deteriorating
    const healthFactor = opportunity.healthFactor;
    const timeRemaining = this.estimateTimeToLiquidation(healthFactor);
    
    let score;
    if (timeRemaining < 300) score = 2; // < 5 minutes, very urgent
    else if (timeRemaining < 900) score = 4; // < 15 minutes, urgent
    else if (timeRemaining < 1800) score = 6; // < 30 minutes, moderate urgency
    else score = 8; // > 30 minutes, timing risk

    return {
      value: timeRemaining,
      score,
      weight: 0.15 // Timing risk weight
    };
  }

  estimateTimeToLiquidation(healthFactor) {
    // Estimate based on health factor and market volatility
    if (healthFactor < 0.95) return 120; // 2 minutes
    if (healthFactor < 1.0) return 600; // 10 minutes
    if (healthFactor < 1.05) return 1800; // 30 minutes
    return 3600; // 1 hour
  }

  async analyzeProtocolRisk(opportunity) {
    // Protocol-specific risk factors
    const protocolRisks = {
      'solend': {
        score: 3, // Well-established, lower risk
        factors: ['high_liquidity', 'proven_track_record']
      },
      'portFinance': {
        score: 5, // Moderate risk
        factors: ['medium_liquidity', 'established']
      },
      'francium': {
        score: 7, // Higher risk
        factors: ['lower_liquidity', 'newer_protocol']
      }
    };
    
    const risk = protocolRisks[opportunity.protocol] || { score: 5, factors: [] };
    
    return {
      value: risk.factors,
      score: risk.score,
      weight: 0.10 // Protocol risk weight
    };
  }

  async calculateWeightedRiskScore(factors) {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [factorName, factor] of Object.entries(factors)) {
      if (factor.score !== undefined && factor.weight !== undefined) {
        totalScore += factor.score * factor.weight;
        totalWeight += factor.weight;
      }
    }
    
    // Normalize to 1-10 scale
    const weightedScore = totalWeight > 0 ? totalScore / totalWeight : 5;
    return Math.max(1, Math.min(10, Math.round(weightedScore * 100) / 100));
  }

  async applyMLAdjustments(baseScore, factors, opportunity) {
    try {
      // Simple machine learning adjustments based on historical performance
      const historicalAdjustment = await this.getHistoricalAdjustment(opportunity);
      const seasonalAdjustment = this.getSeasonalAdjustment();
      
      // Apply adjustments (max ±2 points)
      let adjustedScore = baseScore + historicalAdjustment + seasonalAdjustment;
      
      // Ensure score stays within bounds
      return Math.max(1, Math.min(10, adjustedScore));
      
    } catch (error) {
      logger.debug('Error applying ML adjustments:', error.message);
      return baseScore;
    }
  }

  async getHistoricalAdjustment(opportunity) {
    // Analyze historical liquidation success rates for similar opportunities
    const similarOpportunities = this.historicalData.liquidationHistory.filter(
      h => h.protocol === opportunity.protocol && 
           Math.abs(h.healthFactor - opportunity.healthFactor) < 0.1
    );
    
    if (similarOpportunities.length === 0) return 0;
    
    const successRate = similarOpportunities.filter(h => h.success).length / similarOpportunities.length;
    
    // Adjust based on success rate
    if (successRate > 0.8) return -1; // Lower risk if historically successful
    if (successRate < 0.4) return 1;  // Higher risk if historically unsuccessful
    return 0;
  }

  getSeasonalAdjustment() {
    const hour = new Date().getUTCHours();
    const dayOfWeek = new Date().getDay();
    
    // Weekend adjustment (less competition)
    if (dayOfWeek === 0 || dayOfWeek === 6) return -0.5;
    
    // Late night adjustment (less competition)
    if (hour >= 2 && hour <= 6) return -0.3;
    
    return 0;
  }

  logRiskAnalysis(opportunity, finalScore, factors) {
    const riskLevel = finalScore <= 3 ? 'LOW' : finalScore <= 6 ? 'MEDIUM' : 'HIGH';
    
    logger.info(`🎯 Risk Analysis: ${opportunity.protocol} | Score: ${finalScore}/10 (${riskLevel})`);
    logger.debug('Risk factors breakdown:', {
      volatility: `${factors.volatility?.score}/10 (${factors.volatility?.value.toFixed(3)})`,
      liquidity: `${factors.liquidity?.score}/10 ($${factors.liquidity?.value.toLocaleString()})`,
      healthFactor: `${factors.healthFactor?.score}/10 (${factors.healthFactor?.value.toFixed(3)})`,
      competition: `${factors.competition?.score}/10 (${factors.competition?.value.toFixed(1)} bots)`,
      timing: `${factors.timingRisk?.score}/10 (${Math.floor(factors.timingRisk?.value/60)}min)`
    });
  }

  async updateHistoricalData(liquidationResult) {
    // Update historical data for model improvement
    this.historicalData.liquidationHistory.push({
      timestamp: Date.now(),
      protocol: liquidationResult.protocol,
      healthFactor: liquidationResult.healthFactor,
      success: liquidationResult.success,
      actualProfit: liquidationResult.actualProfit,
      predictedRisk: liquidationResult.predictedRisk
    });
    
    // Keep only last 1000 records
    if (this.historicalData.liquidationHistory.length > 1000) {
      this.historicalData.liquidationHistory.shift();
    }
    
    // Update model performance metrics
    await this.updateModelPerformance(liquidationResult);
  }

  async updateModelPerformance(result) {
    this.modelPerformance.predictions.push(result);
    
    // Calculate accuracy based on last 100 predictions
    const recentPredictions = this.modelPerformance.predictions.slice(-100);
    
    let correct = 0;
    for (const prediction of recentPredictions) {
      const wasHighRisk = prediction.predictedRisk > 7;
      const actuallyFailed = !prediction.success;
      
      if ((wasHighRisk && actuallyFailed) || (!wasHighRisk && !actuallyFailed)) {
        correct++;
      }
    }
    
    this.modelPerformance.accuracy = (correct / recentPredictions.length) * 100;
    this.modelPerformance.lastUpdate = Date.now();
    
    logger.info(`🧠 Risk Model Performance: ${this.modelPerformance.accuracy.toFixed(1)}% accuracy`);
  }

  getModelPerformance() {
    return {
      ...this.modelPerformance,
      totalPredictions: this.modelPerformance.predictions.length
    };
  }

  getRiskFactorWeights() {
    return { ...this.riskFactors };
  }

  updateRiskFactorWeights(newWeights) {
    this.riskFactors = { ...this.riskFactors, ...newWeights };
    logger.info('Risk factor weights updated');
    this.emit('weightsUpdated', this.riskFactors);
  }
}

module.exports = AdvancedRiskModel;