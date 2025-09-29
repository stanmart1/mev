const { Connection, Transaction, PublicKey, TransactionInstruction } = require('@solana/web3.js');
const config = require('../config/config');
const logger = require('../config/logger');
const pool = require('../config/database');
const EventEmitter = require('events');

class MEVBundleConstructor extends EventEmitter {
  constructor() {
    super();
    this.connection = new Connection(config.solana.rpcUrl, config.solana.commitment);
    this.isConstructing = false;
    this.activeBundles = new Map();
    this.bundleQueue = [];
    this.maxBundleSize = 10; // Maximum transactions per bundle
    this.startTime = null;
    
    // Bundle construction configuration
    this.config = {
      maxBundleTransactions: 10,      // Max 10 transactions per bundle
      minBundleProfitSOL: 0.05,       // Minimum 0.05 SOL profit for bundle
      maxBundleGasCost: 0.02,         // Maximum 0.02 SOL gas cost per bundle
      bundleTimeoutMs: 30000,         // 30 seconds bundle construction timeout
      priorityFeeMultiplier: 1.5,     // 1.5x priority fee for bundle transactions
      maxSlippageBundle: 0.03,        // 3% maximum slippage for bundle
      riskTolerance: 7,               // Maximum risk score (1-10) for inclusion
      optimizationPasses: 3           // Number of optimization iterations
    };
    
    // Bundle construction statistics
    this.stats = {
      bundlesConstructed: 0,
      bundlesExecuted: 0,
      bundlesFailed: 0,
      totalBundleProfit: 0,
      averageBundleSize: 0,
      averageOptimizationTime: 0,
      gasEfficiencyRatio: 0,
      profitableOpportunities: 0,
      totalOpportunitiesProcessed: 0
    };
    
    // Transaction types and their relationships
    this.transactionTypes = {
      ARBITRAGE: 'arbitrage',
      LIQUIDATION: 'liquidation', 
      SANDWICH: 'sandwich',
      FLASHLOAN: 'flashloan',
      TOKEN_SWAP: 'token_swap'
    };
    
    // Transaction dependency graph for ordering
    this.dependencyGraph = new Map();
    
    // MEV opportunity queue for bundle construction
    this.opportunityQueue = [];
    this.maxQueueSize = 100;
  }

  async start() {
    if (this.isConstructing) {
      logger.warn('MEV Bundle Constructor already running');
      return;
    }

    try {
      this.isConstructing = true;
      this.startTime = Date.now();
      logger.info('🔗 Starting MEV Bundle Constructor...');
      
      // Start bundle construction processing
      this.processBundleQueue();
      
      // Start opportunity monitoring
      this.monitorOpportunities();
      
      this.emit('constructorStarted');
      logger.info('✅ MEV Bundle Constructor started successfully');
    } catch (error) {
      logger.error('Failed to start MEV Bundle Constructor:', error);
      this.isConstructing = false;
      throw error;
    }
  }

  async stop() {
    if (!this.isConstructing) return;
    
    this.isConstructing = false;
    
    // Wait for active bundles to complete
    while (this.activeBundles.size > 0) {
      await this.sleep(1000);
    }
    
    this.emit('constructorStopped');
    logger.info('🛑 MEV Bundle Constructor stopped');
  }

  async addOpportunity(opportunity) {
    if (!this.isConstructing) {
      logger.warn('Bundle constructor not running, cannot add opportunity');
      return false;
    }

    // Validate opportunity
    if (!this.validateOpportunity(opportunity)) {
      logger.warn('Invalid opportunity provided to bundle constructor');
      return false;
    }

    // Add to opportunity queue
    this.opportunityQueue.push({
      ...opportunity,
      addedAt: Date.now(),
      bundleId: null,
      processed: false
    });

    // Limit queue size
    if (this.opportunityQueue.length > this.maxQueueSize) {
      this.opportunityQueue.shift(); // Remove oldest
    }

    logger.debug(`Added ${opportunity.type} opportunity to bundle queue`);
    this.emit('opportunityAdded', opportunity);
    
    return true;
  }

  validateOpportunity(opportunity) {
    const required = ['type', 'profitSOL', 'gasCost', 'riskScore', 'dex', 'tokens'];
    return required.every(field => opportunity.hasOwnProperty(field));
  }

  async processBundleQueue() {
    while (this.isConstructing) {
      try {
        if (this.opportunityQueue.length >= 2) { // Need at least 2 for bundling
          await this.constructOptimalBundle();
        }
        
        // Clean up old opportunities
        this.cleanupOldOpportunities();
        
        await this.sleep(1000); // Check every second
      } catch (error) {
        logger.error('Error in bundle queue processing:', error);
      }
    }
  }

  async constructOptimalBundle() {
    const startTime = Date.now();
    this.stats.totalOpportunitiesProcessed += this.opportunityQueue.length;
    
    try {
      logger.info('🔗 Constructing optimal MEV bundle...');
      
      // Step 1: Group related opportunities
      const groups = this.groupRelatedOpportunities();
      
      if (groups.length === 0) {
        logger.debug('No groupable opportunities found');
        return null;
      }
      
      // Step 2: Select best group for bundling
      const bestGroup = this.selectBestGroup(groups);
      
      if (!bestGroup || bestGroup.length === 0) {
        logger.debug('No suitable group found for bundling');
        return null;
      }
      
      // Step 3: Optimize transaction ordering
      const optimizedOrder = await this.optimizeTransactionOrder(bestGroup);
      
      // Step 4: Calculate bundle metrics
      const bundleMetrics = this.calculateBundleMetrics(optimizedOrder);
      
      // Step 5: Validate bundle profitability
      if (!this.validateBundleProfitability(bundleMetrics)) {
        logger.debug('Bundle not profitable enough for execution');
        return null;
      }
      
      // Step 6: Create bundle
      const bundle = this.createBundle(optimizedOrder, bundleMetrics);
      
      // Step 7: Store bundle
      bundle.id = await this.storeBundleInDatabase(bundle);
      
      // Update statistics
      this.updateBundleStats(bundle, Date.now() - startTime);
      
      // Remove processed opportunities from queue
      this.removeProcessedOpportunities(optimizedOrder);
      
      this.emit('bundleConstructed', bundle);
      logger.info(`✅ Bundle constructed: ${bundle.transactions.length} txs, ${bundle.estimatedProfit.toFixed(6)} SOL profit`);
      
      return bundle;
      
    } catch (error) {
      logger.error('Error constructing bundle:', error);
      return null;
    }
  }

  groupRelatedOpportunities() {
    const groups = [];
    const processed = new Set();
    
    for (let i = 0; i < this.opportunityQueue.length; i++) {
      if (processed.has(i)) continue;
      
      const opportunity = this.opportunityQueue[i];
      const group = [opportunity];
      processed.add(i);
      
      // Find related opportunities
      for (let j = i + 1; j < this.opportunityQueue.length; j++) {
        if (processed.has(j)) continue;
        
        const candidate = this.opportunityQueue[j];
        
        if (this.areOpportunitiesRelated(opportunity, candidate)) {
          group.push(candidate);
          processed.add(j);
        }
      }
      
      if (group.length >= 2) {
        groups.push(group);
      }
    }
    
    return groups;
  }

  areOpportunitiesRelated(opp1, opp2) {
    // Same token pairs
    if (this.shareTokens(opp1.tokens, opp2.tokens)) {
      return true;
    }
    
    // Same DEX with close timing
    if (opp1.dex === opp2.dex && 
        Math.abs(opp1.addedAt - opp2.addedAt) < 10000) { // 10 seconds
      return true;
    }
    
    // Complementary strategies (arbitrage + sandwich)
    if ((opp1.type === this.transactionTypes.ARBITRAGE && 
         opp2.type === this.transactionTypes.SANDWICH) ||
        (opp1.type === this.transactionTypes.SANDWICH && 
         opp2.type === this.transactionTypes.ARBITRAGE)) {
      return true;
    }
    
    // Liquidation + flashloan combination
    if ((opp1.type === this.transactionTypes.LIQUIDATION && 
         opp2.type === this.transactionTypes.FLASHLOAN) ||
        (opp1.type === this.transactionTypes.FLASHLOAN && 
         opp2.type === this.transactionTypes.LIQUIDATION)) {
      return true;
    }
    
    return false;
  }

  shareTokens(tokens1, tokens2) {
    if (!tokens1 || !tokens2) return false;
    
    for (const token1 of tokens1) {
      for (const token2 of tokens2) {
        if (token1.mint === token2.mint) {
          return true;
        }
      }
    }
    return false;
  }

  selectBestGroup(groups) {
    if (groups.length === 0) return null;
    
    // Score each group
    const scoredGroups = groups.map(group => ({
      group,
      score: this.calculateGroupScore(group)
    }));
    
    // Sort by score (highest first)
    scoredGroups.sort((a, b) => b.score - a.score);
    
    // Return best group that meets criteria
    for (const { group, score } of scoredGroups) {
      if (this.groupMeetsRequirements(group)) {
        return group;
      }
    }
    
    return null;
  }

  calculateGroupScore(group) {
    let score = 0;
    
    // Profit weight (40%)
    const totalProfit = group.reduce((sum, opp) => sum + opp.profitSOL, 0);
    score += totalProfit * 40;
    
    // Risk adjustment (20%)
    const avgRisk = group.reduce((sum, opp) => sum + opp.riskScore, 0) / group.length;
    score += (10 - avgRisk) * 2; // Lower risk = higher score
    
    // Gas efficiency (20%)
    const totalGas = group.reduce((sum, opp) => sum + opp.gasCost, 0);
    const gasEfficiency = totalProfit / totalGas;
    score += gasEfficiency * 20;
    
    // Synergy bonus (20%)
    const synergyBonus = this.calculateSynergyBonus(group);
    score += synergyBonus * 20;
    
    return score;
  }

  calculateSynergyBonus(group) {
    let bonus = 0;
    
    // Type diversity bonus
    const types = new Set(group.map(opp => opp.type));
    bonus += types.size * 0.1;
    
    // Token overlap bonus
    let tokenOverlaps = 0;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (this.shareTokens(group[i].tokens, group[j].tokens)) {
          tokenOverlaps++;
        }
      }
    }
    bonus += tokenOverlaps * 0.2;
    
    // DEX diversity bonus (spread risk)
    const dexes = new Set(group.map(opp => opp.dex));
    if (dexes.size > 1) {
      bonus += 0.3;
    }
    
    return Math.min(bonus, 1.0); // Cap at 1.0
  }

  groupMeetsRequirements(group) {
    // Check group size
    if (group.length > this.config.maxBundleTransactions) {
      return false;
    }
    
    // Check total profit
    const totalProfit = group.reduce((sum, opp) => sum + opp.profitSOL, 0);
    if (totalProfit < this.config.minBundleProfitSOL) {
      return false;
    }
    
    // Check total gas cost
    const totalGas = group.reduce((sum, opp) => sum + opp.gasCost, 0);
    if (totalGas > this.config.maxBundleGasCost) {
      return false;
    }
    
    // Check average risk
    const avgRisk = group.reduce((sum, opp) => sum + opp.riskScore, 0) / group.length;
    if (avgRisk > this.config.riskTolerance) {
      return false;
    }
    
    return true;
  }

  async optimizeTransactionOrder(opportunities) {
    logger.debug('Optimizing transaction order for bundle...');
    
    let bestOrder = [...opportunities];
    let bestScore = this.calculateOrderScore(bestOrder);
    
    // Multiple optimization passes
    for (let pass = 0; pass < this.config.optimizationPasses; pass++) {
      // Try different ordering strategies
      const strategies = [
        this.orderByProfit.bind(this),
        this.orderByRisk.bind(this),
        this.orderByDependency.bind(this),
        this.orderByGasEfficiency.bind(this),
        this.orderByType.bind(this)
      ];
      
      for (const strategy of strategies) {
        const orderedOps = strategy([...opportunities]);
        const score = this.calculateOrderScore(orderedOps);
        
        if (score > bestScore) {
          bestOrder = orderedOps;
          bestScore = score;
        }
      }
      
      // Try random swaps for local optimization
      for (let i = 0; i < 10; i++) {
        const candidate = this.randomSwapOptimization([...bestOrder]);
        const score = this.calculateOrderScore(candidate);
        
        if (score > bestScore) {
          bestOrder = candidate;
          bestScore = score;
        }
      }
    }
    
    logger.debug(`Transaction order optimized with score: ${bestScore.toFixed(4)}`);
    return bestOrder;
  }

  calculateOrderScore(order) {
    let score = 0;
    
    // Profit accumulation score (earlier profits are better)
    let cumulativeProfit = 0;
    for (let i = 0; i < order.length; i++) {
      cumulativeProfit += order[i].profitSOL;
      score += cumulativeProfit / (i + 1); // Weight early profits higher
    }
    
    // Risk distribution score (spread high-risk transactions)
    let riskPenalty = 0;
    for (let i = 0; i < order.length - 1; i++) {
      if (order[i].riskScore > 7 && order[i + 1].riskScore > 7) {
        riskPenalty += 5; // Penalty for consecutive high-risk transactions
      }
    }
    score -= riskPenalty;
    
    // Gas efficiency score
    const totalProfit = order.reduce((sum, opp) => sum + opp.profitSOL, 0);
    const totalGas = order.reduce((sum, opp) => sum + opp.gasCost, 0);
    score += (totalProfit / totalGas) * 10;
    
    return score;
  }

  orderByProfit(opportunities) {
    return opportunities.sort((a, b) => b.profitSOL - a.profitSOL);
  }

  orderByRisk(opportunities) {
    return opportunities.sort((a, b) => a.riskScore - b.riskScore);
  }

  orderByDependency(opportunities) {
    // Implement topological sort based on dependencies
    // For now, simple ordering by type priority
    const typePriority = {
      [this.transactionTypes.FLASHLOAN]: 1,
      [this.transactionTypes.ARBITRAGE]: 2,
      [this.transactionTypes.SANDWICH]: 3,
      [this.transactionTypes.LIQUIDATION]: 4,
      [this.transactionTypes.TOKEN_SWAP]: 5
    };
    
    return opportunities.sort((a, b) => 
      typePriority[a.type] - typePriority[b.type]
    );
  }

  orderByGasEfficiency(opportunities) {
    return opportunities.sort((a, b) => 
      (b.profitSOL / b.gasCost) - (a.profitSOL / a.gasCost)
    );
  }

  orderByType(opportunities) {
    // Group by type, then by profit within type
    return opportunities.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      return b.profitSOL - a.profitSOL;
    });
  }

  randomSwapOptimization(order) {
    if (order.length < 2) return order;
    
    const i = Math.floor(Math.random() * order.length);
    const j = Math.floor(Math.random() * order.length);
    
    if (i !== j) {
      [order[i], order[j]] = [order[j], order[i]];
    }
    
    return order;
  }

  calculateBundleMetrics(opportunities) {
    const totalProfit = opportunities.reduce((sum, opp) => sum + opp.profitSOL, 0);
    const totalGasCost = opportunities.reduce((sum, opp) => sum + opp.gasCost, 0);
    const avgRiskScore = opportunities.reduce((sum, opp) => sum + opp.riskScore, 0) / opportunities.length;
    const maxSlippage = Math.max(...opportunities.map(opp => opp.slippage || 0));
    
    return {
      totalProfit,
      totalGasCost,
      netProfit: totalProfit - totalGasCost,
      avgRiskScore,
      maxSlippage,
      gasEfficiency: totalProfit / totalGasCost,
      transactionCount: opportunities.length,
      estimatedExecutionTime: this.estimateBundleExecutionTime(opportunities)
    };
  }

  estimateBundleExecutionTime(opportunities) {
    // Base time per transaction + complexity factors
    const baseTimePerTx = 2000; // 2 seconds per transaction
    const complexityMultiplier = Math.max(1, opportunities.length * 0.1);
    
    return baseTimePerTx * opportunities.length * complexityMultiplier;
  }

  validateBundleProfitability(metrics) {
    // Check minimum profit
    if (metrics.netProfit < this.config.minBundleProfitSOL) {
      logger.debug(`Bundle profit ${metrics.netProfit.toFixed(6)} below minimum ${this.config.minBundleProfitSOL}`);
      return false;
    }
    
    // Check gas efficiency
    if (metrics.gasEfficiency < 2.0) { // At least 2:1 profit to gas ratio
      logger.debug(`Bundle gas efficiency ${metrics.gasEfficiency.toFixed(2)} too low`);
      return false;
    }
    
    // Check risk tolerance
    if (metrics.avgRiskScore > this.config.riskTolerance) {
      logger.debug(`Bundle average risk ${metrics.avgRiskScore.toFixed(2)} above tolerance`);
      return false;
    }
    
    return true;
  }

  createBundle(opportunities, metrics) {
    const bundleId = this.generateBundleId();
    
    const bundle = {
      id: bundleId,
      createdAt: Date.now(),
      transactions: opportunities.map((opp, index) => ({
        index,
        opportunityId: opp.id || `temp_${Date.now()}_${index}`,
        type: opp.type,
        dex: opp.dex,
        tokens: opp.tokens,
        profitSOL: opp.profitSOL,
        gasCost: opp.gasCost,
        riskScore: opp.riskScore,
        estimatedSlippage: opp.slippage || 0,
        priorityFee: opp.gasCost * this.config.priorityFeeMultiplier
      })),
      metrics: metrics,
      estimatedProfit: metrics.netProfit,
      estimatedGasCost: metrics.totalGasCost,
      riskScore: metrics.avgRiskScore,
      status: 'constructed',
      executionPlan: this.createExecutionPlan(opportunities)
    };
    
    this.activeBundles.set(bundleId, bundle);
    return bundle;
  }

  createExecutionPlan(opportunities) {
    return {
      steps: opportunities.map((opp, index) => ({
        stepIndex: index,
        action: opp.type,
        dex: opp.dex,
        estimatedDuration: 2000, // 2 seconds per step
        dependencies: index > 0 ? [index - 1] : [],
        rollbackStrategy: this.getRollbackStrategy(opp.type)
      })),
      totalEstimatedTime: opportunities.length * 2000,
      rollbackPlan: 'Reverse transaction order on failure',
      riskMitigation: 'Monitor each step and abort on significant deviation'
    };
  }

  getRollbackStrategy(transactionType) {
    const strategies = {
      [this.transactionTypes.ARBITRAGE]: 'Reverse swap on opposite DEX',
      [this.transactionTypes.LIQUIDATION]: 'Return borrowed funds immediately',
      [this.transactionTypes.SANDWICH]: 'Execute back-run regardless of target',
      [this.transactionTypes.FLASHLOAN]: 'Ensure loan repayment in same transaction',
      [this.transactionTypes.TOKEN_SWAP]: 'Use slippage protection'
    };
    
    return strategies[transactionType] || 'Monitor and manual intervention';
  }

  generateBundleId() {
    return `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async storeBundleInDatabase(bundle) {
    try {
      const client = await pool.connect();
      
      const query = `
        INSERT INTO mev_bundles (
          bundle_id, transaction_count, estimated_profit_sol, estimated_gas_cost_sol,
          average_risk_score, bundle_status, construction_timestamp, execution_plan
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;
      
      const values = [
        bundle.id,
        bundle.transactions.length,
        bundle.estimatedProfit,
        bundle.estimatedGasCost,
        bundle.riskScore,
        bundle.status,
        new Date(bundle.createdAt),
        JSON.stringify(bundle.executionPlan)
      ];
      
      const result = await client.query(query, values);
      client.release();
      
      logger.debug(`Bundle stored in database: ${bundle.id}`);
      return result.rows[0].id;
      
    } catch (error) {
      logger.error('Error storing bundle in database:', error);
      throw error;
    }
  }

  removeProcessedOpportunities(processedOps) {
    // Remove opportunities that were included in the bundle
    this.opportunityQueue = this.opportunityQueue.filter(opp => 
      !processedOps.some(processed => processed.id === opp.id)
    );
  }

  updateBundleStats(bundle, constructionTime) {
    this.stats.bundlesConstructed++;
    this.stats.totalBundleProfit += bundle.estimatedProfit;
    
    const currentAvgSize = this.stats.averageBundleSize;
    this.stats.averageBundleSize = (
      (currentAvgSize * (this.stats.bundlesConstructed - 1) + bundle.transactions.length) / 
      this.stats.bundlesConstructed
    );
    
    const currentAvgTime = this.stats.averageOptimizationTime;
    this.stats.averageOptimizationTime = (
      (currentAvgTime * (this.stats.bundlesConstructed - 1) + constructionTime) / 
      this.stats.bundlesConstructed
    );
    
    this.stats.gasEfficiencyRatio = this.stats.totalBundleProfit / 
      (this.stats.bundlesConstructed * this.config.maxBundleGasCost);
      
    if (bundle.estimatedProfit > 0) {
      this.stats.profitableOpportunities++;
    }
  }

  cleanupOldOpportunities() {
    const now = Date.now();
    const maxAge = 60000; // 60 seconds
    
    this.opportunityQueue = this.opportunityQueue.filter(opp => 
      (now - opp.addedAt) < maxAge
    );
  }

  monitorOpportunities() {
    // This would integrate with existing MEV detection systems
    // For now, we'll emit events when opportunities are added
    setInterval(() => {
      if (this.opportunityQueue.length > 0) {
        logger.debug(`Bundle queue: ${this.opportunityQueue.length} opportunities waiting`);
      }
    }, 10000); // Log every 10 seconds
  }

  getStats() {
    return {
      ...this.stats,
      isConstructing: this.isConstructing,
      uptime: this.isConstructing && this.startTime ? Date.now() - this.startTime : 0,
      queueLength: this.opportunityQueue.length,
      activeBundles: this.activeBundles.size,
      successRate: this.stats.bundlesConstructed > 0 ? 
        (this.stats.bundlesExecuted / this.stats.bundlesConstructed * 100).toFixed(2) + '%' : '0%'
    };
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('MEV Bundle Constructor configuration updated');
    this.emit('configUpdated', this.config);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MEVBundleConstructor;