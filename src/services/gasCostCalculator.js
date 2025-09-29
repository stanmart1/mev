const { Connection, ComputeBudgetProgram } = require('@solana/web3.js');
const config = require('../config/config');
const logger = require('../config/logger');
const EventEmitter = require('events');

class GasCostCalculator extends EventEmitter {
  constructor() {
    super();
    this.connection = new Connection(config.solana.rpcUrl, config.solana.commitment);
    
    // Gas cost configuration
    this.config = {
      baseFeeMultiplier: 1.0,        // Base fee adjustment
      priorityFeeMinimum: 0.000001,  // Minimum priority fee (1 microSOL)
      priorityFeeMaximum: 0.01,      // Maximum priority fee (0.01 SOL)
      computeUnitPrice: 1,           // Base compute unit price in microlamports
      averageComputeUnits: 200000,   // Average compute units per transaction
      maxComputeUnits: 1400000,      // Maximum compute units per transaction
      networkCongestionMultiplier: 2.0, // Multiplier during high congestion
      bundleDiscountRate: 0.9        // 10% discount for bundled transactions
    };
    
    // DEX-specific gas costs (in compute units)
    this.dexComputeCosts = {
      raydium: {
        swap: 180000,
        addLiquidity: 250000,
        removeLiquidity: 220000,
        arbitrage: 200000
      },
      orca: {
        swap: 150000,
        whirlpoolSwap: 170000,
        addLiquidity: 230000,
        removeLiquidity: 200000,
        arbitrage: 190000
      },
      jupiter: {
        swap: 300000,          // Jupiter aggregates multiple routes
        routedSwap: 400000,    // Complex routing
        arbitrage: 350000
      },
      openbook: {
        placeOrder: 100000,
        cancelOrder: 80000,
        settleOrder: 120000,
        arbitrage: 250000
      },
      mango: {
        swap: 200000,
        perpTrade: 180000,
        liquidation: 300000
      }
    };
    
    // Transaction type multipliers
    this.transactionTypeMultipliers = {
      arbitrage: 1.2,    // Complex logic
      liquidation: 1.5,  // Higher complexity
      sandwich: 1.1,     // Moderate complexity
      flashloan: 1.8,    // High complexity with multiple steps
      token_swap: 1.0    // Base complexity
    };
    
    // Historical gas data for trend analysis
    this.historicalGasData = [];
    this.maxHistoryLength = 1000;
    
    // Real-time gas tracking
    this.currentNetworkConditions = {
      congestionLevel: 'normal',     // low, normal, high, extreme
      avgPriorityFee: 0.001,         // Current average priority fee
      computeUnitPrice: 1,           // Current compute unit price
      lastUpdated: Date.now()
    };
    
    // Gas cost statistics
    this.stats = {
      totalCalculations: 0,
      accuratePredictions: 0,
      averageGasCost: 0,
      maxGasCostSeen: 0,
      bundlesSaved: 0,
      totalSavings: 0
    };
    
    // Start real-time monitoring
    this.startGasMonitoring();
  }

  async calculateTransactionGasCost(transaction, options = {}) {
    try {
      this.stats.totalCalculations++;
      
      // Base compute units calculation
      const baseComputeUnits = this.calculateBaseComputeUnits(transaction);
      
      // Apply complexity multipliers
      const adjustedComputeUnits = this.applyComplexityMultipliers(
        baseComputeUnits, 
        transaction
      );
      
      // Calculate priority fee
      const priorityFee = this.calculateOptimalPriorityFee(transaction, options);
      
      // Calculate base gas cost
      const baseGasCost = this.calculateBaseGasCost(adjustedComputeUnits);
      
      // Apply network conditions
      const networkAdjustedCost = this.applyNetworkConditions(baseGasCost, priorityFee);
      
      // Apply bundle discount if applicable
      const finalCost = options.isBundle ? 
        networkAdjustedCost * this.config.bundleDiscountRate : 
        networkAdjustedCost;
      
      // Store calculation for analysis
      const gasCalculation = {
        transactionType: transaction.type,
        dex: transaction.dex,
        baseComputeUnits,
        adjustedComputeUnits,
        priorityFee,
        baseGasCost,
        networkAdjustedCost,
        finalCost,
        networkConditions: { ...this.currentNetworkConditions },
        timestamp: Date.now()
      };
      
      this.updateGasStatistics(gasCalculation);
      
      logger.debug(`Gas cost calculated: ${finalCost.toFixed(6)} SOL for ${transaction.type} on ${transaction.dex}`);
      
      return {
        totalGasCost: finalCost,
        breakdown: {
          computeUnits: adjustedComputeUnits,
          priorityFee,
          baseGasCost,
          networkMultiplier: this.getNetworkMultiplier(),
          bundleDiscount: options.isBundle ? 0.1 : 0
        },
        estimates: {
          minCost: finalCost * 0.8,    // 20% below estimate
          maxCost: finalCost * 1.5,    // 50% above estimate
          confidence: this.calculateConfidence(transaction)
        }
      };
      
    } catch (error) {
      logger.error('Error calculating gas cost:', error);
      return this.getFallbackGasCost(transaction);
    }
  }

  calculateBaseComputeUnits(transaction) {
    const dexCosts = this.dexComputeCosts[transaction.dex];
    
    if (!dexCosts) {
      logger.warn(`Unknown DEX: ${transaction.dex}, using average compute units`);
      return this.config.averageComputeUnits;
    }
    
    // Get base cost for transaction type
    let baseUnits = dexCosts.swap; // Default to swap
    
    switch (transaction.type) {
      case 'arbitrage':
        baseUnits = dexCosts.arbitrage || dexCosts.swap * 1.2;
        break;
      case 'liquidation':
        baseUnits = dexCosts.liquidation || dexCosts.swap * 1.5;
        break;
      case 'sandwich':
        baseUnits = dexCosts.swap; // Sandwiches are essentially swaps
        break;
      case 'flashloan':
        baseUnits = dexCosts.swap * 2; // Multiple operations
        break;
      case 'token_swap':
        baseUnits = dexCosts.swap;
        break;
      default:
        baseUnits = dexCosts.swap;
    }
    
    return Math.min(baseUnits, this.config.maxComputeUnits);
  }

  applyComplexityMultipliers(baseComputeUnits, transaction) {
    let adjustedUnits = baseComputeUnits;
    
    // Transaction type multiplier
    const typeMultiplier = this.transactionTypeMultipliers[transaction.type] || 1.0;
    adjustedUnits *= typeMultiplier;
    
    // Token count multiplier (more tokens = more complexity)
    if (transaction.tokens && transaction.tokens.length > 2) {
      const tokenMultiplier = 1 + (transaction.tokens.length - 2) * 0.1;
      adjustedUnits *= tokenMultiplier;
    }
    
    // Size-based multiplier (larger trades may need more compute)
    if (transaction.valueUSD) {
      if (transaction.valueUSD > 100000) {
        adjustedUnits *= 1.3; // Large trades
      } else if (transaction.valueUSD > 10000) {
        adjustedUnits *= 1.1; // Medium trades
      }
    }
    
    // Slippage tolerance multiplier (tighter tolerance = more complex)
    if (transaction.slippage && transaction.slippage < 0.005) {
      adjustedUnits *= 1.2; // Tight slippage requires more precise calculations
    }
    
    // Cross-DEX complexity (for arbitrage)
    if (transaction.type === 'arbitrage' && transaction.secondaryDex) {
      adjustedUnits *= 1.4; // Cross-DEX arbitrage is more complex
    }
    
    return Math.floor(Math.min(adjustedUnits, this.config.maxComputeUnits));
  }

  calculateOptimalPriorityFee(transaction, options = {}) {
    // Start with base priority fee
    let priorityFee = this.currentNetworkConditions.avgPriorityFee;
    
    // Apply urgency multiplier
    const urgencyMultiplier = this.getUrgencyMultiplier(transaction, options);
    priorityFee *= urgencyMultiplier;
    
    // Apply profit-based adjustment
    if (transaction.profitSOL) {
      const profitBasedFee = transaction.profitSOL * 0.1; // 10% of profit
      priorityFee = Math.max(priorityFee, profitBasedFee);
    }
    
    // Apply congestion adjustment
    const congestionMultiplier = this.getCongestionMultiplier();
    priorityFee *= congestionMultiplier;
    
    // Apply MEV competition adjustment
    if (this.isHighCompetitionTransaction(transaction)) {
      priorityFee *= 2.0; // Double fee for high competition
    }
    
    // Ensure within bounds
    priorityFee = Math.max(this.config.priorityFeeMinimum, priorityFee);
    priorityFee = Math.min(this.config.priorityFeeMaximum, priorityFee);
    
    return priorityFee;
  }

  getUrgencyMultiplier(transaction, options) {
    // Time-sensitive transactions need higher priority
    if (options.urgent || transaction.type === 'liquidation') {
      return 3.0;
    }
    
    if (transaction.type === 'sandwich') {
      return 2.5; // Sandwiches are time-critical
    }
    
    if (transaction.type === 'arbitrage') {
      return 2.0; // Arbitrage opportunities disappear quickly
    }
    
    return 1.0; // Normal priority
  }

  getCongestionMultiplier() {
    switch (this.currentNetworkConditions.congestionLevel) {
      case 'low': return 0.8;
      case 'normal': return 1.0;
      case 'high': return 1.5;
      case 'extreme': return 2.5;
      default: return 1.0;
    }
  }

  isHighCompetitionTransaction(transaction) {
    // Popular token pairs have more MEV competition
    const popularTokens = ['SOL', 'USDC', 'USDT', 'BTC', 'ETH'];
    
    if (transaction.tokens) {
      for (const token of transaction.tokens) {
        if (popularTokens.includes(token.symbol)) {
          return true;
        }
      }
    }
    
    // Large value transactions attract more competition
    if (transaction.valueUSD && transaction.valueUSD > 50000) {
      return true;
    }
    
    return false;
  }

  calculateBaseGasCost(computeUnits) {
    // Solana gas calculation: compute units * compute unit price
    const computeUnitPriceInLamports = this.currentNetworkConditions.computeUnitPrice;
    const gasCostInLamports = computeUnits * computeUnitPriceInLamports;
    
    // Convert lamports to SOL
    return gasCostInLamports / 1_000_000_000;
  }

  applyNetworkConditions(baseGasCost, priorityFee) {
    const networkMultiplier = this.getNetworkMultiplier();
    const adjustedBaseCost = baseGasCost * networkMultiplier;
    
    return adjustedBaseCost + priorityFee;
  }

  getNetworkMultiplier() {
    // Network congestion affects base gas costs
    switch (this.currentNetworkConditions.congestionLevel) {
      case 'low': return 0.9;
      case 'normal': return 1.0;
      case 'high': return 1.3;
      case 'extreme': return 1.8;
      default: return 1.0;
    }
  }

  async calculateBundleGasCost(transactions, bundleOptions = {}) {
    logger.info(`Calculating gas cost for bundle of ${transactions.length} transactions`);
    
    try {
      let totalGasCost = 0;
      let totalComputeUnits = 0;
      const transactionCosts = [];
      
      // Calculate individual transaction costs with bundle discount
      for (const transaction of transactions) {
        const gasCalc = await this.calculateTransactionGasCost(transaction, {
          isBundle: true,
          ...bundleOptions
        });
        
        totalGasCost += gasCalc.totalGasCost;
        totalComputeUnits += gasCalc.breakdown.computeUnits;
        transactionCosts.push(gasCalc);
      }
      
      // Additional bundle-specific costs
      const bundleOverhead = this.calculateBundleOverhead(transactions);
      totalGasCost += bundleOverhead;
      
      // Bundle optimization savings
      const optimizationSavings = this.calculateOptimizationSavings(transactions);
      totalGasCost -= optimizationSavings;
      
      // MEV competition adjustment for bundles
      const competitionAdjustment = this.calculateBundleCompetitionAdjustment(transactions);
      totalGasCost += competitionAdjustment;
      
      this.stats.bundlesSaved++;
      this.stats.totalSavings += optimizationSavings;
      
      logger.debug(`Bundle gas cost: ${totalGasCost.toFixed(6)} SOL (${optimizationSavings.toFixed(6)} SOL saved)`);
      
      return {
        totalBundleCost: totalGasCost,
        totalComputeUnits,
        individualCosts: transactionCosts,
        bundleOverhead,
        optimizationSavings,
        competitionAdjustment,
        averageCostPerTx: totalGasCost / transactions.length,
        estimates: {
          minCost: totalGasCost * 0.85,    // 15% below estimate
          maxCost: totalGasCost * 1.4,     // 40% above estimate
          confidence: this.calculateBundleConfidence(transactions)
        }
      };
      
    } catch (error) {
      logger.error('Error calculating bundle gas cost:', error);
      return this.getFallbackBundleGasCost(transactions);
    }
  }

  calculateBundleOverhead(transactions) {
    // Bundle submission and management overhead
    const baseOverhead = 0.0001; // 0.0001 SOL base overhead
    const perTransactionOverhead = 0.00001 * transactions.length;
    
    return baseOverhead + perTransactionOverhead;
  }

  calculateOptimizationSavings(transactions) {
    // Savings from bundling transactions together
    let savings = 0;
    
    // Shared setup costs savings
    const uniqueDEXs = new Set(transactions.map(tx => tx.dex));
    if (uniqueDEXs.size < transactions.length) {
      savings += 0.0001 * (transactions.length - uniqueDEXs.size);
    }
    
    // Token account reuse savings
    const uniqueTokens = new Set();
    transactions.forEach(tx => {
      if (tx.tokens) {
        tx.tokens.forEach(token => uniqueTokens.add(token.mint));
      }
    });
    
    if (uniqueTokens.size < transactions.length * 2) {
      savings += 0.00005 * (transactions.length * 2 - uniqueTokens.size);
    }
    
    // Bundle discount
    const totalIndividualCost = transactions.length * 0.001; // Estimated individual costs
    savings += totalIndividualCost * 0.1; // 10% bundle discount
    
    return savings;
  }

  calculateBundleCompetitionAdjustment(transactions) {
    // Higher priority fee needed for profitable bundles in competition
    const totalProfit = transactions.reduce((sum, tx) => sum + (tx.profitSOL || 0), 0);
    
    if (totalProfit > 0.1) { // High profit bundles
      return totalProfit * 0.05; // 5% of profit for competition
    }
    
    return 0;
  }

  async estimateGasForInstruction(instruction, accountMetas = []) {
    try {
      // Estimate compute units for specific instruction
      const baseComputeUnits = 10000; // Base instruction cost
      
      // Account for account access costs
      const accountCost = accountMetas.length * 1000;
      
      // Account for data size
      const dataCost = instruction.data ? instruction.data.length * 10 : 0;
      
      const totalComputeUnits = baseComputeUnits + accountCost + dataCost;
      
      return {
        computeUnits: totalComputeUnits,
        estimatedCost: this.calculateBaseGasCost(totalComputeUnits)
      };
      
    } catch (error) {
      logger.error('Error estimating gas for instruction:', error);
      return {
        computeUnits: this.config.averageComputeUnits,
        estimatedCost: this.calculateBaseGasCost(this.config.averageComputeUnits)
      };
    }
  }

  startGasMonitoring() {
    // Monitor network conditions every 30 seconds
    setInterval(async () => {
      await this.updateNetworkConditions();
    }, 30000);
    
    // Clean up historical data every hour
    setInterval(() => {
      this.cleanupHistoricalData();
    }, 3600000);
  }

  async updateNetworkConditions() {
    try {
      // Get recent gas prices and network conditions
      // This would integrate with real Solana RPC calls
      
      // Simulate network condition updates
      const recentTransactions = await this.getRecentTransactionGasData();
      
      if (recentTransactions.length > 0) {
        const avgPriorityFee = recentTransactions.reduce((sum, tx) => 
          sum + tx.priorityFee, 0) / recentTransactions.length;
        
        this.currentNetworkConditions.avgPriorityFee = avgPriorityFee;
        
        // Determine congestion level
        this.currentNetworkConditions.congestionLevel = this.determineCongestionLevel(
          avgPriorityFee, 
          recentTransactions
        );
        
        this.currentNetworkConditions.lastUpdated = Date.now();
        
        logger.debug(`Network conditions updated: ${this.currentNetworkConditions.congestionLevel} congestion`);
      }
      
    } catch (error) {
      logger.error('Error updating network conditions:', error);
    }
  }

  async getRecentTransactionGasData() {
    // This would query recent transaction data from RPC
    // For now, return mock data
    return [
      { priorityFee: 0.001, computeUnits: 200000 },
      { priorityFee: 0.0015, computeUnits: 250000 },
      { priorityFee: 0.0008, computeUnits: 180000 }
    ];
  }

  determineCongestionLevel(avgPriorityFee, recentTransactions) {
    if (avgPriorityFee > 0.005) return 'extreme';
    if (avgPriorityFee > 0.002) return 'high';
    if (avgPriorityFee > 0.0005) return 'normal';
    return 'low';
  }

  calculateConfidence(transaction) {
    // Calculate confidence level for gas estimation
    let confidence = 0.8; // Base confidence
    
    // Higher confidence for known DEXs
    if (this.dexComputeCosts[transaction.dex]) {
      confidence += 0.1;
    }
    
    // Lower confidence for complex transactions
    if (transaction.type === 'flashloan') {
      confidence -= 0.2;
    }
    
    // Confidence based on historical data availability
    const historicalCount = this.historicalGasData.filter(
      data => data.dex === transaction.dex && data.type === transaction.type
    ).length;
    
    if (historicalCount > 10) {
      confidence += 0.1;
    }
    
    return Math.min(Math.max(confidence, 0.5), 0.95);
  }

  calculateBundleConfidence(transactions) {
    const individualConfidences = transactions.map(tx => this.calculateConfidence(tx));
    const avgConfidence = individualConfidences.reduce((sum, conf) => sum + conf, 0) / transactions.length;
    
    // Bundle confidence is slightly lower due to interaction complexity
    return Math.max(avgConfidence - 0.1, 0.5);
  }

  getFallbackGasCost(transaction) {
    // Fallback gas cost calculation when main calculation fails
    const fallbackCost = 0.005; // 0.005 SOL fallback
    
    return {
      totalGasCost: fallbackCost,
      breakdown: {
        computeUnits: this.config.averageComputeUnits,
        priorityFee: 0.001,
        baseGasCost: 0.004,
        networkMultiplier: 1.0,
        bundleDiscount: 0
      },
      estimates: {
        minCost: fallbackCost * 0.8,
        maxCost: fallbackCost * 2.0,
        confidence: 0.5
      }
    };
  }

  getFallbackBundleGasCost(transactions) {
    const fallbackCostPerTx = 0.005;
    const totalCost = fallbackCostPerTx * transactions.length;
    
    return {
      totalBundleCost: totalCost,
      totalComputeUnits: this.config.averageComputeUnits * transactions.length,
      individualCosts: transactions.map(() => this.getFallbackGasCost({})),
      bundleOverhead: 0.0001,
      optimizationSavings: 0,
      competitionAdjustment: 0,
      averageCostPerTx: fallbackCostPerTx,
      estimates: {
        minCost: totalCost * 0.8,
        maxCost: totalCost * 2.0,
        confidence: 0.5
      }
    };
  }

  updateGasStatistics(gasCalculation) {
    this.historicalGasData.push(gasCalculation);
    
    // Update running statistics
    const currentAvg = this.stats.averageGasCost;
    this.stats.averageGasCost = (
      (currentAvg * (this.stats.totalCalculations - 1) + gasCalculation.finalCost) / 
      this.stats.totalCalculations
    );
    
    if (gasCalculation.finalCost > this.stats.maxGasCostSeen) {
      this.stats.maxGasCostSeen = gasCalculation.finalCost;
    }
  }

  cleanupHistoricalData() {
    if (this.historicalGasData.length > this.maxHistoryLength) {
      this.historicalGasData = this.historicalGasData.slice(-this.maxHistoryLength);
    }
  }

  getGasStats() {
    return {
      ...this.stats,
      networkConditions: this.currentNetworkConditions,
      historicalDataPoints: this.historicalGasData.length,
      accuracy: this.stats.totalCalculations > 0 ? 
        (this.stats.accuratePredictions / this.stats.totalCalculations * 100).toFixed(2) + '%' : '0%'
    };
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Gas cost calculator configuration updated');
    this.emit('configUpdated', this.config);
  }
}

module.exports = GasCostCalculator;