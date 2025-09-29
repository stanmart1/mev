const { Connection, PublicKey } = require('@solana/web3.js');
const config = require('../config/config');
const logger = require('../config/logger');
const pool = require('../config/database');
const EventEmitter = require('events');

class SandwichAttackDetector extends EventEmitter {
  constructor() {
    super();
    this.connection = new Connection(config.solana.rpcUrl, config.solana.commitment);
    this.isDetecting = false;
    this.mempoolInterval = null;
    this.startTime = null;
    
    // Detection configuration
    this.config = {
      minSwapValueUSD: 1000,        // Minimum $1000 swap to consider
      maxSlippageImpact: 0.05,      // 5% maximum slippage impact
      minProfitThreshold: 0.01,     // Minimum 1% profit to sandwich
      mempoolScanInterval: 1000,    // Scan mempool every 1 second
      maxFrontRunGas: 0.02,         // Maximum 0.02 SOL for front-run
      priorityFeeMultiplier: 2.0,   // 2x priority fee for sandwich
      slippageTolerance: 0.03       // 3% slippage tolerance
    };
    
    // Statistics tracking
    this.stats = {
      transactionsScanned: 0,
      sandwichOpportunities: 0,
      profitableOpportunities: 0,
      averageProfitPercent: 0,
      largestOpportunityUSD: 0,
      errors: 0
    };
    
    // DEX Program IDs for sandwich targets
    this.dexPrograms = {
      raydium: {
        amm: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
        name: 'Raydium AMM'
      },
      orca: {
        whirlpool: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
        name: 'Orca Whirlpool'
      },
      jupiter: {
        v6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
        name: 'Jupiter V6'
      },
      openbook: {
        v2: 'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb',
        name: 'OpenBook V2'
      }
    };
    
    // Token price cache for profit calculations
    this.priceCache = new Map();
    this.lastPriceUpdate = 0;
    this.PRICE_CACHE_DURATION = 30000; // 30 seconds
    
    // Mempool transaction cache
    this.pendingTransactions = new Map();
    this.TRANSACTION_TTL = 60000; // 60 seconds TTL for pending transactions
  }

  async start() {
    if (this.isDetecting) {
      logger.warn('Sandwich attack detector already running');
      return;
    }

    try {
      this.isDetecting = true;
      this.startTime = Date.now();
      logger.info('🥪 Starting sandwich attack opportunity detector...');
      
      // Start mempool monitoring
      await this.startMempoolMonitoring();
      
      // Start periodic scanning
      this.mempoolInterval = setInterval(async () => {
        try {
          await this.scanMempool();
        } catch (error) {
          logger.error('Error in mempool scanning:', error);
          this.stats.errors++;
        }
      }, this.config.mempoolScanInterval);
      
      this.emit('detectorStarted');
      logger.info('✅ Sandwich attack detector started successfully');
    } catch (error) {
      logger.error('Failed to start sandwich attack detector:', error);
      this.isDetecting = false;
      throw error;
    }
  }

  async stop() {
    if (!this.isDetecting) return;
    
    this.isDetecting = false;
    if (this.mempoolInterval) {
      clearInterval(this.mempoolInterval);
      this.mempoolInterval = null;
    }
    
    this.emit('detectorStopped');
    logger.info('🛑 Sandwich attack detector stopped');
  }

  async startMempoolMonitoring() {
    // Set up WebSocket connection for real-time mempool monitoring
    try {
      // Subscribe to pending transactions for target DEX programs
      for (const [dexName, dexConfig] of Object.entries(this.dexPrograms)) {
        if (dexConfig.amm) {
          await this.subscribeToProgram(dexConfig.amm, dexName);
        }
        if (dexConfig.whirlpool) {
          await this.subscribeToProgram(dexConfig.whirlpool, dexName);
        }
        if (dexConfig.v6) {
          await this.subscribeToProgram(dexConfig.v6, dexName);
        }
        if (dexConfig.v2) {
          await this.subscribeToProgram(dexConfig.v2, dexName);
        }
      }
      
      logger.info(`🔍 Monitoring ${Object.keys(this.dexPrograms).length} DEX programs for sandwich opportunities`);
    } catch (error) {
      logger.error('Error setting up mempool monitoring:', error);
    }
  }

  async subscribeToProgram(programId, dexName) {
    try {
      // In production, this would use WebSocket subscriptions
      // For demo, we'll simulate with periodic polling
      logger.debug(`Subscribed to ${dexName} program: ${programId}`);
    } catch (error) {
      logger.error(`Error subscribing to ${dexName}:`, error);
    }
  }

  async scanMempool() {
    try {
      // Get recent transactions from target programs
      const recentTransactions = await this.getRecentTransactions();
      
      for (const transaction of recentTransactions) {
        this.stats.transactionsScanned++;
        
        // Analyze transaction for sandwich opportunity
        const opportunity = await this.analyzeTransactionForSandwich(transaction);
        
        if (opportunity) {
          this.stats.sandwichOpportunities++;
          
          if (opportunity.profitPercent >= this.config.minProfitThreshold * 100) {
            this.stats.profitableOpportunities++;
            
            // Update statistics
            this.updateStatistics(opportunity);
            
            // Store opportunity in database
            await this.storeSandwichOpportunity(opportunity);
            
            // Emit event for real-time processing
            this.emit('sandwichOpportunity', opportunity);
            
            logger.info(`🥪 Sandwich opportunity: ${opportunity.targetDex} | Target: $${opportunity.targetValueUSD.toFixed(0)} | Profit: ${opportunity.profitPercent.toFixed(2)}%`);
          }
        }
      }
      
      // Clean up old pending transactions
      this.cleanupPendingTransactions();
      
    } catch (error) {
      logger.error('Error scanning mempool:', error);
      this.stats.errors++;
    }
  }

  async getRecentTransactions() {
    // Simulate getting recent transactions from mempool
    // In production, this would query actual mempool data
    const mockTransactions = [];
    
    // Generate some mock high-value transactions
    const dexNames = Object.keys(this.dexPrograms);
    for (let i = 0; i < 3; i++) {
      const dex = dexNames[Math.floor(Math.random() * dexNames.length)];
      const valueUSD = 500 + Math.random() * 10000; // $500-$10,500
      
      if (valueUSD >= this.config.minSwapValueUSD) {
        mockTransactions.push({
          signature: this.generateMockSignature(),
          dex,
          timestamp: Date.now(),
          valueUSD,
          tokenA: this.getRandomToken(),
          tokenB: this.getRandomToken(),
          slippage: Math.random() * 0.05, // 0-5% slippage
          priorityFee: Math.random() * 0.001 // 0-0.001 SOL priority fee
        });
      }
    }
    
    return mockTransactions;
  }

  generateMockSignature() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 88; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  getRandomToken() {
    const tokens = [
      { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112' },
      { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
      { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
      { symbol: 'RAY', mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
      { symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' }
    ];
    
    return tokens[Math.floor(Math.random() * tokens.length)];
  }

  async analyzeTransactionForSandwich(transaction) {
    try {
      // Skip if transaction value is too low
      if (transaction.valueUSD < this.config.minSwapValueUSD) {
        return null;
      }
      
      // Skip if slippage impact is too low (not profitable to sandwich)
      if (transaction.slippage < 0.01) { // Less than 1% slippage
        return null;
      }
      
      // Calculate sandwich parameters
      const sandwichParams = await this.calculateSandwichParameters(transaction);
      
      if (!sandwichParams) {
        return null;
      }
      
      // Validate profitability
      if (sandwichParams.profitPercent < this.config.minProfitThreshold * 100) {
        return null;
      }
      
      return {
        targetSignature: transaction.signature,
        targetDex: transaction.dex,
        targetValueUSD: transaction.valueUSD,
        targetSlippage: transaction.slippage,
        tokenA: transaction.tokenA,
        tokenB: transaction.tokenB,
        ...sandwichParams,
        detectedAt: Date.now()
      };
      
    } catch (error) {
      logger.debug('Error analyzing transaction for sandwich:', error.message);
      return null;
    }
  }

  async calculateSandwichParameters(transaction) {
    try {
      // Get current token prices
      const tokenAPrice = await this.getTokenPrice(transaction.tokenA.mint);
      const tokenBPrice = await this.getTokenPrice(transaction.tokenB.mint);
      
      if (!tokenAPrice || !tokenBPrice) {
        return null;
      }
      
      // Calculate optimal front-run size (typically 10-50% of target transaction)
      const frontRunSizePercent = this.calculateOptimalFrontRunSize(transaction);
      const frontRunValueUSD = transaction.valueUSD * frontRunSizePercent;
      
      // Calculate price impact from target transaction
      const priceImpact = this.estimatePriceImpact(transaction.valueUSD, transaction.tokenA.symbol);
      
      // Calculate front-run parameters
      const frontRun = {
        amountIn: frontRunValueUSD / tokenAPrice,
        amountOutMin: (frontRunValueUSD / tokenBPrice) * (1 - this.config.slippageTolerance),
        tokenIn: transaction.tokenA,
        tokenOut: transaction.tokenB,
        priorityFee: transaction.priorityFee * this.config.priorityFeeMultiplier,
        gasLimit: 200000,
        slippageTolerance: this.config.slippageTolerance
      };
      
      // Calculate back-run parameters
      const backRun = {
        amountIn: frontRun.amountOutMin,
        amountOutMin: frontRunValueUSD / tokenAPrice * (1 + priceImpact * 0.8), // Capture 80% of price impact
        tokenIn: transaction.tokenB,
        tokenOut: transaction.tokenA,
        priorityFee: transaction.priorityFee * 0.5, // Lower priority for back-run
        gasLimit: 200000,
        slippageTolerance: this.config.slippageTolerance
      };
      
      // Calculate total costs and profit
      const totalGasCost = (frontRun.priorityFee + backRun.priorityFee + 0.01); // Base gas + priority fees
      const grossProfit = backRun.amountOutMin - frontRun.amountIn;
      const grossProfitUSD = grossProfit * tokenAPrice;
      const netProfitUSD = grossProfitUSD - (totalGasCost * tokenAPrice);
      const profitPercent = (netProfitUSD / frontRunValueUSD) * 100;
      
      // Risk assessment
      const riskScore = this.calculateSandwichRisk(transaction, priceImpact, frontRunValueUSD);
      
      return {
        frontRun,
        backRun,
        priceImpact,
        frontRunValueUSD,
        grossProfitUSD,
        netProfitUSD,
        profitPercent,
        totalGasCost,
        riskScore,
        estimatedExecutionTime: 15000, // 15 seconds estimated
        competitionRisk: this.assessCompetitionRisk(transaction)
      };
      
    } catch (error) {
      logger.debug('Error calculating sandwich parameters:', error.message);
      return null;
    }
  }

  calculateOptimalFrontRunSize(transaction) {
    // Dynamic front-run sizing based on transaction size and market conditions
    const baseSize = 0.2; // 20% base size
    
    // Larger transactions allow for larger front-runs
    const sizeMultiplier = Math.min(transaction.valueUSD / 10000, 2.0); // Max 2x multiplier
    
    // Adjust based on slippage (higher slippage = larger front-run potential)
    const slippageMultiplier = Math.min(transaction.slippage / 0.03, 1.5); // Max 1.5x multiplier
    
    const optimalSize = baseSize * sizeMultiplier * slippageMultiplier;
    
    // Cap at 50% of target transaction
    return Math.min(optimalSize, 0.5);
  }

  estimatePriceImpact(valueUSD, tokenSymbol) {
    // Estimate price impact based on token and transaction size
    const baseLiquidity = {
      'SOL': 50000000,   // $50M base liquidity
      'USDC': 100000000, // $100M base liquidity
      'USDT': 80000000,  // $80M base liquidity
      'RAY': 10000000,   // $10M base liquidity
      'BONK': 5000000    // $5M base liquidity
    };
    
    const liquidity = baseLiquidity[tokenSymbol] || 5000000; // Default $5M
    
    // Price impact = sqrt(tradeSize / liquidity) - simplified model
    const impact = Math.sqrt(valueUSD / liquidity) * 0.1;
    
    return Math.min(impact, 0.1); // Cap at 10% price impact
  }

  calculateSandwichRisk(transaction, priceImpact, frontRunValueUSD) {
    let riskScore = 5; // Base risk score
    
    // Size risk - larger sandwiches are riskier
    if (frontRunValueUSD > 10000) riskScore += 2;
    else if (frontRunValueUSD > 5000) riskScore += 1;
    else if (frontRunValueUSD < 1000) riskScore -= 1;
    
    // Price impact risk - higher impact = higher risk
    if (priceImpact > 0.05) riskScore += 2; // > 5% impact
    else if (priceImpact > 0.03) riskScore += 1; // > 3% impact
    else if (priceImpact < 0.01) riskScore -= 1; // < 1% impact
    
    // Slippage risk
    if (transaction.slippage > 0.03) riskScore += 1; // > 3% slippage
    
    // DEX risk - some DEXs are more competitive
    const competitiveDexs = ['jupiter', 'raydium'];
    if (competitiveDexs.includes(transaction.dex)) riskScore += 1;
    
    return Math.max(1, Math.min(10, riskScore));
  }

  assessCompetitionRisk(transaction) {
    // Assess competition based on transaction characteristics
    let competitionLevel = 'medium';
    
    if (transaction.valueUSD > 20000) {
      competitionLevel = 'high'; // Large transactions attract more MEV bots
    } else if (transaction.valueUSD < 2000) {
      competitionLevel = 'low'; // Small transactions have less competition
    }
    
    // Popular tokens have more competition
    const popularTokens = ['SOL', 'USDC', 'USDT'];
    if (popularTokens.includes(transaction.tokenA.symbol) || 
        popularTokens.includes(transaction.tokenB.symbol)) {
      if (competitionLevel === 'low') competitionLevel = 'medium';
      else if (competitionLevel === 'medium') competitionLevel = 'high';
    }
    
    return competitionLevel;
  }

  async getTokenPrice(mint) {
    try {
      const now = Date.now();
      
      // Check cache first
      if (this.priceCache.has(mint) && 
          (now - this.lastPriceUpdate) < this.PRICE_CACHE_DURATION) {
        return this.priceCache.get(mint);
      }
      
      // Mock prices for demo - in production, use Jupiter/Birdeye APIs
      const mockPrices = {
        'So11111111111111111111111111111111111111112': 20.0,  // SOL
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1.0,   // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 1.0,   // USDT
        '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 0.5,   // RAY
        'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 0.00001 // BONK
      };
      
      const price = mockPrices[mint] || 1.0;
      
      // Add some random variation (±1%) to simulate real market movement
      const variation = (Math.random() - 0.5) * 0.02;
      const finalPrice = price * (1 + variation);
      
      this.priceCache.set(mint, finalPrice);
      if (this.priceCache.size === 1) this.lastPriceUpdate = now;
      
      return finalPrice;
    } catch (error) {
      logger.debug('Error fetching token price:', error.message);
      return null;
    }
  }

  cleanupPendingTransactions() {
    const now = Date.now();
    for (const [signature, transaction] of this.pendingTransactions.entries()) {
      if (now - transaction.timestamp > this.TRANSACTION_TTL) {
        this.pendingTransactions.delete(signature);
      }
    }
  }

  updateStatistics(opportunity) {
    // Update running averages and maximums
    const currentAvg = this.stats.averageProfitPercent;
    const count = this.stats.profitableOpportunities;
    
    this.stats.averageProfitPercent = (
      (currentAvg * (count - 1) + opportunity.profitPercent) / count
    );
    
    if (opportunity.targetValueUSD > this.stats.largestOpportunityUSD) {
      this.stats.largestOpportunityUSD = opportunity.targetValueUSD;
    }
  }

  async storeSandwichOpportunity(opportunity) {
    try {
      const client = await pool.connect();
      
      const query = `
        INSERT INTO mev_opportunities (
          opportunity_type, block_slot, signature, primary_dex,
          token_mint_a, token_mint_b, token_symbol_a, token_symbol_b,
          volume_usd, estimated_profit_sol, estimated_profit_usd,
          gas_cost_sol, net_profit_sol, profit_percentage,
          slippage_estimate, execution_risk_score, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id
      `;
      
      const currentSlot = await this.connection.getSlot();
      const profitSOL = opportunity.netProfitUSD / 20; // Convert to SOL assuming $20/SOL
      
      const values = [
        'sandwich',
        currentSlot,
        opportunity.targetSignature,
        opportunity.targetDex,
        opportunity.tokenA.mint,
        opportunity.tokenB.mint,
        opportunity.tokenA.symbol,
        opportunity.tokenB.symbol,
        opportunity.targetValueUSD,
        profitSOL,
        opportunity.netProfitUSD,
        opportunity.totalGasCost,
        profitSOL,
        opportunity.profitPercent,
        opportunity.targetSlippage,
        opportunity.riskScore,
        'detected'
      ];
      
      const result = await client.query(query, values);
      client.release();
      
      logger.debug(`🥪 Sandwich opportunity stored: ${opportunity.targetDex} - ${opportunity.profitPercent.toFixed(2)}% profit`);
      
      return result.rows[0].id;
    } catch (error) {
      logger.error('Error storing sandwich opportunity:', error);
      throw error;
    }
  }

  getStats() {
    return {
      ...this.stats,
      isDetecting: this.isDetecting,
      uptime: this.isDetecting && this.startTime ? Date.now() - this.startTime : 0,
      successRate: this.stats.transactionsScanned > 0 ? 
        (this.stats.profitableOpportunities / this.stats.transactionsScanned * 100).toFixed(2) + '%' : '0%'
    };
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Sandwich detector configuration updated');
    this.emit('configUpdated', this.config);
  }
}

module.exports = SandwichAttackDetector;