const logger = require('../config/logger');
const TransactionOrderOptimizer = require('./transactionOrderOptimizer');
const GasCostCalculator = require('./gasCostCalculator');
const BundleRiskAssessment = require('./bundleRiskAssessment');
const EventEmitter = require('events');

class OptimalBundleComposer extends EventEmitter {
  constructor() {
    super();
    
    this.orderOptimizer = new TransactionOrderOptimizer();
    this.gasCostCalculator = new GasCostCalculator();
    this.riskAssessment = new BundleRiskAssessment();
    
    this.config = {
      maxBundleSize: 8,
      minProfitThreshold: 0.02,
      maxRiskScore: 7.0,
      minConfidenceLevel: 0.7,
      maxGasToProfit: 0.3
    };
    
    this.compositionStrategies = {
      GREEDY: 'greedy',
      BALANCED: 'balanced',
      RISK_AVERSE: 'risk_averse',
      DIVERSIFIED: 'diversified',
      SYNERGISTIC: 'synergistic'
    };
    
    this.stats = {
      bundlesComposed: 0,
      optimalBundlesFound: 0,
      rejectedBundles: 0,
      averageBundleSize: 0,
      averageProfitPerBundle: 0
    };
    
    this.scoringWeights = {
      profit: 0.35,
      riskAdjustedReturn: 0.25,
      gasEfficiency: 0.2,
      synergy: 0.15,
      diversification: 0.05
    };
  }

  async composeOptimalBundle(opportunities, constraints = {}, strategy = 'balanced') {
    const startTime = Date.now();
    this.stats.bundlesComposed++;
    
    try {
      logger.info(`🎼 Composing optimal bundle from ${opportunities.length} opportunities using ${strategy} strategy`);
      
      if (!opportunities || opportunities.length === 0) {
        throw new Error('No opportunities provided for bundle composition');
      }
      
      // Validate and filter opportunities
      const validOpportunities = this.validateOpportunities(opportunities);
      const filteredOpportunities = this.applyConstraintFiltering(validOpportunities, constraints);
      
      // Execute composition strategy
      const compositionResult = await this.executeCompositionStrategy(
        strategy, 
        filteredOpportunities, 
        constraints
      );
      
      if (!compositionResult.bundle) {
        this.stats.rejectedBundles++;
        return null;
      }
      
      // Optimize transaction order
      const orderOptimization = await this.orderOptimizer.optimizeTransactionOrder(
        compositionResult.bundle.transactions,
        constraints
      );
      
      compositionResult.bundle.transactions = orderOptimization.optimizedOrder;
      
      // Final validation
      const finalValidation = await this.performFinalValidation(compositionResult.bundle);
      if (!finalValidation.isValid) {
        this.stats.rejectedBundles++;
        return null;
      }
      
      // Calculate metrics
      const bundleMetrics = await this.calculateComprehensiveMetrics(compositionResult.bundle);
      
      const optimalBundle = {
        ...compositionResult.bundle,
        metrics: bundleMetrics,
        composition: {
          strategy,
          compositionTime: Date.now() - startTime,
          opportunitiesConsidered: opportunities.length,
          constraintsApplied: constraints
        },
        validation: finalValidation,
        orderOptimization
      };
      
      this.updateCompositionStats(optimalBundle);
      this.emit('bundleComposed', optimalBundle);
      
      logger.info(`✅ Optimal bundle composed: ${optimalBundle.transactions.length} txs, ${optimalBundle.metrics.netProfit.toFixed(6)} SOL profit`);
      
      return optimalBundle;
      
    } catch (error) {
      logger.error('Error composing optimal bundle:', error);
      this.stats.rejectedBundles++;
      return null;
    }
  }

  validateOpportunities(opportunities) {
    return opportunities.filter(opp => {
      return opp.type && opp.profitSOL > 0 && opp.gasCost > 0 && opp.gasCost < opp.profitSOL;
    });
  }

  applyConstraintFiltering(opportunities, constraints) {
    let filtered = [...opportunities];
    
    if (constraints.minProfit || this.config.minProfitThreshold) {
      const threshold = constraints.minProfit || this.config.minProfitThreshold;
      filtered = filtered.filter(opp => opp.profitSOL >= threshold);
    }
    
    if (constraints.maxRisk || this.config.maxRiskScore) {
      const maxRisk = constraints.maxRisk || this.config.maxRiskScore;
      filtered = filtered.filter(opp => (opp.riskScore || 5) <= maxRisk);
    }
    
    if (constraints.allowedDEXs) {
      filtered = filtered.filter(opp => constraints.allowedDEXs.includes(opp.dex));
    }
    
    return filtered;
  }

  async executeCompositionStrategy(strategy, opportunities, constraints) {
    switch (strategy) {
      case this.compositionStrategies.GREEDY:
        return this.greedyComposition(opportunities, constraints);
      case this.compositionStrategies.BALANCED:
        return this.balancedComposition(opportunities, constraints);
      case this.compositionStrategies.RISK_AVERSE:
        return this.riskAverseComposition(opportunities, constraints);
      case this.compositionStrategies.DIVERSIFIED:
        return this.diversifiedComposition(opportunities, constraints);
      case this.compositionStrategies.SYNERGISTIC:
        return this.synergisticComposition(opportunities, constraints);
      default:
        return this.balancedComposition(opportunities, constraints);
    }
  }

  async greedyComposition(opportunities, constraints) {
    const sortedOpportunities = opportunities.sort((a, b) => b.profitSOL - a.profitSOL);
    const bundle = { transactions: [], estimatedProfit: 0, estimatedGasCost: 0 };
    
    for (const opportunity of sortedOpportunities) {
      if (bundle.transactions.length >= this.config.maxBundleSize) break;
      
      const testBundle = {
        ...bundle,
        transactions: [...bundle.transactions, opportunity],
        estimatedProfit: bundle.estimatedProfit + opportunity.profitSOL,
        estimatedGasCost: bundle.estimatedGasCost + opportunity.gasCost
      };
      
      if (await this.validateBundleAddition(testBundle, opportunity, constraints)) {
        bundle.transactions.push(opportunity);
        bundle.estimatedProfit += opportunity.profitSOL;
        bundle.estimatedGasCost += opportunity.gasCost;
      }
    }
    
    return { bundle: bundle.transactions.length > 0 ? bundle : null, iterations: bundle.transactions.length };
  }

  async balancedComposition(opportunities, constraints) {
    const scoredOpportunities = opportunities.map(opp => ({
      ...opp,
      compositeScore: this.calculateBalancedScore(opp)
    }));
    
    scoredOpportunities.sort((a, b) => b.compositeScore - a.compositeScore);
    
    const bundle = { transactions: [], estimatedProfit: 0, estimatedGasCost: 0 };
    
    for (const opportunity of scoredOpportunities) {
      if (bundle.transactions.length >= this.config.maxBundleSize) break;
      
      const testBundle = {
        ...bundle,
        transactions: [...bundle.transactions, opportunity],
        estimatedProfit: bundle.estimatedProfit + opportunity.profitSOL,
        estimatedGasCost: bundle.estimatedGasCost + opportunity.gasCost
      };
      
      if (await this.validateBundleAddition(testBundle, opportunity, constraints)) {
        bundle.transactions.push(opportunity);
        bundle.estimatedProfit += opportunity.profitSOL;
        bundle.estimatedGasCost += opportunity.gasCost;
      }
    }
    
    return { bundle: bundle.transactions.length > 0 ? bundle : null, iterations: bundle.transactions.length };
  }

  calculateBalancedScore(opportunity) {
    let score = 0;
    
    // Profit component
    score += this.scoringWeights.profit * opportunity.profitSOL * 100;
    
    // Risk-adjusted return
    const riskScore = opportunity.riskScore || 5;
    const riskAdjustedReturn = opportunity.profitSOL * (10 - riskScore) / 10;
    score += this.scoringWeights.riskAdjustedReturn * riskAdjustedReturn * 100;
    
    // Gas efficiency
    const gasEfficiency = opportunity.profitSOL / opportunity.gasCost;
    score += this.scoringWeights.gasEfficiency * Math.min(gasEfficiency, 10);
    
    return score;
  }

  async riskAverseComposition(opportunities, constraints) {
    const lowRiskOpportunities = opportunities.filter(opp => (opp.riskScore || 5) <= 5);
    lowRiskOpportunities.sort((a, b) => {
      const riskDiff = (a.riskScore || 5) - (b.riskScore || 5);
      return riskDiff !== 0 ? riskDiff : b.profitSOL - a.profitSOL;
    });
    
    return this.greedyComposition(lowRiskOpportunities, constraints);
  }

  async diversifiedComposition(opportunities, constraints) {
    const bundle = { transactions: [], estimatedProfit: 0, estimatedGasCost: 0 };
    const usedTypes = new Set();
    const usedDEXs = new Set();
    
    const sortedOpportunities = opportunities.sort((a, b) => {
      const aDiversity = this.calculateDiversityScore(a, usedTypes, usedDEXs);
      const bDiversity = this.calculateDiversityScore(b, usedTypes, usedDEXs);
      
      if (Math.abs(aDiversity - bDiversity) > 0.1) {
        return bDiversity - aDiversity;
      }
      
      return b.profitSOL - a.profitSOL;
    });
    
    for (const opportunity of sortedOpportunities) {
      if (bundle.transactions.length >= this.config.maxBundleSize) break;
      
      const testBundle = {
        ...bundle,
        transactions: [...bundle.transactions, opportunity],
        estimatedProfit: bundle.estimatedProfit + opportunity.profitSOL,
        estimatedGasCost: bundle.estimatedGasCost + opportunity.gasCost
      };
      
      if (await this.validateBundleAddition(testBundle, opportunity, constraints)) {
        bundle.transactions.push(opportunity);
        bundle.estimatedProfit += opportunity.profitSOL;
        bundle.estimatedGasCost += opportunity.gasCost;
        usedTypes.add(opportunity.type);
        usedDEXs.add(opportunity.dex);
      }
    }
    
    return { bundle: bundle.transactions.length > 0 ? bundle : null, iterations: bundle.transactions.length };
  }

  calculateDiversityScore(opportunity, usedTypes, usedDEXs) {
    let score = 0;
    if (!usedTypes.has(opportunity.type)) score += 1.0;
    if (!usedDEXs.has(opportunity.dex)) score += 0.5;
    return score;
  }

  async synergisticComposition(opportunities, constraints) {
    const bundle = { transactions: [], estimatedProfit: 0, estimatedGasCost: 0 };
    const sortedOpportunities = opportunities.sort((a, b) => b.profitSOL - a.profitSOL);
    
    if (sortedOpportunities.length > 0) {
      const firstOpp = sortedOpportunities[0];
      bundle.transactions.push(firstOpp);
      bundle.estimatedProfit += firstOpp.profitSOL;
      bundle.estimatedGasCost += firstOpp.gasCost;
      
      for (let i = 1; i < sortedOpportunities.length; i++) {
        if (bundle.transactions.length >= this.config.maxBundleSize) break;
        
        const candidate = sortedOpportunities[i];
        const synergyScore = this.calculateSynergyScore(candidate, bundle.transactions);
        
        if (synergyScore > 0) {
          const testBundle = {
            ...bundle,
            transactions: [...bundle.transactions, candidate],
            estimatedProfit: bundle.estimatedProfit + candidate.profitSOL,
            estimatedGasCost: bundle.estimatedGasCost + candidate.gasCost
          };
          
          if (await this.validateBundleAddition(testBundle, candidate, constraints)) {
            bundle.transactions.push(candidate);
            bundle.estimatedProfit += candidate.profitSOL;
            bundle.estimatedGasCost += candidate.gasCost;
          }
        }
      }
    }
    
    return { bundle: bundle.transactions.length > 0 ? bundle : null, iterations: bundle.transactions.length };
  }

  calculateSynergyScore(opportunity, existingTransactions) {
    let synergyScore = 0;
    
    for (const existingTx of existingTransactions) {
      if (opportunity.dex === existingTx.dex) synergyScore += 0.5;
      if (this.shareTokens(opportunity.tokens, existingTx.tokens)) synergyScore += 1.0;
      if (this.areComplementaryStrategies(opportunity.type, existingTx.type)) synergyScore += 1.5;
    }
    
    return Math.min(synergyScore, 3.0);
  }

  shareTokens(tokens1, tokens2) {
    if (!tokens1 || !tokens2) return false;
    
    for (const token1 of tokens1) {
      for (const token2 of tokens2) {
        if (token1.mint === token2.mint) return true;
      }
    }
    return false;
  }

  areComplementaryStrategies(type1, type2) {
    const complementaryPairs = [
      ['arbitrage', 'liquidation'],
      ['sandwich', 'arbitrage'],
      ['flashloan', 'liquidation']
    ];
    
    return complementaryPairs.some(([t1, t2]) => 
      (type1 === t1 && type2 === t2) || (type1 === t2 && type2 === t1)
    );
  }

  async validateBundleAddition(testBundle, newOpportunity, constraints) {
    if (testBundle.transactions.length > this.config.maxBundleSize) return false;
    
    const netProfit = testBundle.estimatedProfit - testBundle.estimatedGasCost;
    if (netProfit < this.config.minProfitThreshold) return false;
    
    const gasRatio = testBundle.estimatedGasCost / testBundle.estimatedProfit;
    if (gasRatio > this.config.maxGasToProfit) return false;
    
    const avgRisk = testBundle.transactions.reduce((sum, tx) => 
      sum + (tx.riskScore || 5), 0) / testBundle.transactions.length;
    
    if (avgRisk > this.config.maxRiskScore) return false;
    
    return true;
  }

  async performFinalValidation(bundle) {
    const issues = [];
    let isValid = true;
    
    try {
      const riskAssessment = await this.riskAssessment.assessBundleRisk(bundle);
      
      if (riskAssessment.overallRisk > this.config.maxRiskScore) {
        issues.push(`Risk score ${riskAssessment.overallRisk.toFixed(2)} exceeds maximum`);
        isValid = false;
      }
      
      if (riskAssessment.confidenceLevel < this.config.minConfidenceLevel) {
        issues.push(`Confidence level too low`);
        isValid = false;
      }
      
      const gasCostResult = await this.gasCostCalculator.calculateBundleGasCost(bundle.transactions);
      
      if (gasCostResult.totalBundleCost > bundle.estimatedProfit * this.config.maxGasToProfit) {
        issues.push('Gas costs exceed acceptable ratio');
        isValid = false;
      }
      
    } catch (error) {
      issues.push(`Validation error: ${error.message}`);
      isValid = false;
    }
    
    return { isValid, issues };
  }

  async calculateComprehensiveMetrics(bundle) {
    try {
      const gasCostResult = await this.gasCostCalculator.calculateBundleGasCost(bundle.transactions);
      const riskAssessment = await this.riskAssessment.assessBundleRisk(bundle);
      
      const totalProfit = bundle.transactions.reduce((sum, tx) => sum + tx.profitSOL, 0);
      const netProfit = totalProfit - gasCostResult.totalBundleCost;
      
      return {
        grossProfit: totalProfit,
        netProfit,
        totalGasCost: gasCostResult.totalBundleCost,
        gasEfficiency: netProfit / gasCostResult.totalBundleCost,
        overallRisk: riskAssessment.overallRisk,
        confidenceLevel: riskAssessment.confidenceLevel,
        transactionCount: bundle.transactions.length
      };
      
    } catch (error) {
      logger.error('Error calculating metrics:', error);
      return {
        grossProfit: bundle.estimatedProfit || 0,
        netProfit: (bundle.estimatedProfit || 0) - (bundle.estimatedGasCost || 0),
        totalGasCost: bundle.estimatedGasCost || 0,
        gasEfficiency: 1.0,
        overallRisk: 5.0,
        confidenceLevel: 0.5,
        transactionCount: bundle.transactions.length
      };
    }
  }

  updateCompositionStats(bundle) {
    const profit = bundle.metrics.netProfit;
    
    // Update averages
    const currentAvgSize = this.stats.averageBundleSize;
    this.stats.averageBundleSize = (
      (currentAvgSize * (this.stats.bundlesComposed - 1) + bundle.transactions.length) / 
      this.stats.bundlesComposed
    );
    
    const currentAvgProfit = this.stats.averageProfitPerBundle;
    this.stats.averageProfitPerBundle = (
      (currentAvgProfit * (this.stats.bundlesComposed - 1) + profit) / 
      this.stats.bundlesComposed
    );
    
    // Count optimal bundles
    if (profit > this.config.minProfitThreshold && 
        bundle.metrics.overallRisk <= this.config.maxRiskScore) {
      this.stats.optimalBundlesFound++;
    }
  }

  getCompositionStats() {
    return {
      ...this.stats,
      optimalRate: this.stats.bundlesComposed > 0 ? 
        (this.stats.optimalBundlesFound / this.stats.bundlesComposed * 100).toFixed(2) + '%' : '0%'
    };
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Optimal bundle composer configuration updated');
    this.emit('configUpdated', this.config);
  }
}

module.exports = OptimalBundleComposer;