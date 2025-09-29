const { PublicKey, Connection } = require('@solana/web3.js');
const config = require('../config/config');
const logger = require('../config/logger');
const pool = require('../config/database');
const ProtocolAdapter = require('./protocolAdapter');
const LiquidationExecutor = require('./liquidationExecutor');
const AdvancedRiskModel = require('./advancedRiskModel');
const SandwichAttackDetector = require('./sandwichAttackDetector');
const EventEmitter = require('events');

class LiquidationScanner extends EventEmitter {
  constructor() {
    super();
    this.connection = new Connection(config.solana.rpcUrl, config.solana.commitment);
    this.protocolAdapter = new ProtocolAdapter();
    this.liquidationExecutor = new LiquidationExecutor();
    this.advancedRiskModel = new AdvancedRiskModel();
    this.sandwichDetector = new SandwichAttackDetector();
    this.isScanning = false;
    this.scanInterval = null;
    this.startTime = null;
    this.stats = {
      positionsScanned: 0,
      liquidationOpportunities: 0,
      profitableOpportunities: 0,
      autoExecutedOpportunities: 0,
      sandwichOpportunities: 0,
      errors: 0
    };
    
    // Auto-execution configuration
    this.autoExecutionConfig = {
      enabled: false, // Disabled by default for safety
      maxRiskScore: 6, // Only execute low-medium risk opportunities
      minProfitSOL: 0.01, // Minimum 0.01 SOL profit for auto-execution
      maxPositionSize: 1000, // Maximum $1000 position size for auto-execution
    };
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Liquidation thresholds by asset type (legacy - now using protocolAdapter)
    this.liquidationThresholds = {
      'SOL': { ltv: 0.8, liquidationThreshold: 0.85, liquidationBonus: 0.05 },
      'USDC': { ltv: 0.9, liquidationThreshold: 0.95, liquidationBonus: 0.05 },
      'USDT': { ltv: 0.9, liquidationThreshold: 0.95, liquidationBonus: 0.05 },
      'BTC': { ltv: 0.75, liquidationThreshold: 0.8, liquidationBonus: 0.1 },
      'ETH': { ltv: 0.8, liquidationThreshold: 0.85, liquidationBonus: 0.075 },
      'RAY': { ltv: 0.6, liquidationThreshold: 0.7, liquidationBonus: 0.1 },
      'SRM': { ltv: 0.6, liquidationThreshold: 0.7, liquidationBonus: 0.1 },
      'default': { ltv: 0.5, liquidationThreshold: 0.6, liquidationBonus: 0.15 }
    };
  }

  setupEventListeners() {
    // Listen to liquidation executor events
    this.liquidationExecutor.on('liquidationExecuted', (result) => {
      this.stats.autoExecutedOpportunities++;
      this.advancedRiskModel.updateHistoricalData({
        ...result.opportunity,
        success: true,
        actualProfit: result.result.actualProfit,
        predictedRisk: result.opportunity.advancedRiskScore
      });
      logger.info(`✅ Auto-executed liquidation: ${result.result.actualProfit.toFixed(6)} SOL profit`);
    });

    this.liquidationExecutor.on('liquidationFailed', (result) => {
      this.advancedRiskModel.updateHistoricalData({
        ...result.opportunity,
        success: false,
        actualProfit: 0,
        predictedRisk: result.opportunity.advancedRiskScore
      });
      logger.warn(`❌ Auto-execution failed: ${result.error}`);
    });

    this.liquidationExecutor.on('liquidationQueued', (opportunity) => {
      logger.info(`⏳ Liquidation queued for auto-execution: ${opportunity.protocol}`);
    });
    
    // Listen to sandwich detector events
    this.sandwichDetector.on('sandwichOpportunity', (opportunity) => {
      this.stats.sandwichOpportunities++;
      logger.info(`🥪 Sandwich opportunity detected: ${opportunity.targetDex} - ${opportunity.profitPercent.toFixed(2)}% profit`);
    });

    this.sandwichDetector.on('detectorStarted', () => {
      logger.info('🥪 Sandwich detector started successfully');
    });

    this.sandwichDetector.on('detectorStopped', () => {
      logger.info('🛑 Sandwich detector stopped');
    });
  }

  async start() {
    if (this.isScanning) {
      logger.warn('Liquidation scanner already running');
      return;
    }

    try {
      this.isScanning = true;
      this.startTime = Date.now();
      logger.info('🔍 Starting liquidation opportunity scanner...');
      
      // Start liquidation executor if auto-execution is enabled
      if (this.autoExecutionConfig.enabled) {
        await this.liquidationExecutor.start();
        logger.info('🤖 Auto-execution enabled');
      }
      
      // Start sandwich attack detector
      await this.sandwichDetector.start();
      
      // Start scanning immediately
      await this.scanAllProtocols();
      
      // Set up periodic scanning (every 30 seconds)
      this.scanInterval = setInterval(async () => {
        try {
          await this.scanAllProtocols();
        } catch (error) {
          logger.error('Error in periodic liquidation scan:', error);
          this.stats.errors++;
        }
      }, 30000);
      
      this.emit('scannerStarted');
      logger.info('✅ Liquidation scanner started successfully');
    } catch (error) {
      logger.error('Failed to start liquidation scanner:', error);
      this.isScanning = false;
      throw error;
    }
  }

  async stop() {
    if (!this.isScanning) return;
    
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    // Stop liquidation executor
    await this.liquidationExecutor.stop();
    
    // Stop sandwich detector
    await this.sandwichDetector.stop();
    
    this.emit('scannerStopped');
    logger.info('🛑 Liquidation scanner stopped');
  }

  async scanAllProtocols() {
    logger.info('🔍 Scanning all protocols for liquidation opportunities...');
    
    const supportedProtocols = this.protocolAdapter.getSupportedProtocols();
    logger.info(`Scanning ${supportedProtocols.length} protocols: ${supportedProtocols.join(', ')}`);
    
    for (const protocolName of supportedProtocols) {
      try {
        await this.scanProtocol(protocolName);
      } catch (error) {
        logger.error(`Error scanning ${protocolName}:`, error);
        this.stats.errors++;
      }
    }
  }

  async scanProtocol(protocolName) {
    try {
      // Get all obligations for the protocol
      const obligations = await this.protocolAdapter.getObligations(protocolName);
      logger.info(`Found ${obligations.length} obligations in ${protocolName}`);
      
      for (const obligation of obligations) {
        try {
          this.stats.positionsScanned++;
          
          // Calculate health factor using protocol adapter
          const healthFactor = await this.protocolAdapter.getHealthFactor(obligation);
          
          // Check if position is near liquidation
          if (healthFactor < 1.1 && healthFactor > 0) { // 10% buffer above liquidation
            const opportunity = await this.analyzeLiquidationOpportunity(obligation, healthFactor);
            
            if (opportunity) {
              this.stats.liquidationOpportunities++;
              
              // Calculate advanced risk score
              opportunity.advancedRiskScore = await this.advancedRiskModel.calculateAdvancedRiskScore(opportunity);
              
              if (opportunity.profitSOL > 0.001) { // Minimum 0.001 SOL profit
                this.stats.profitableOpportunities++;
                
                // Store opportunity in database
                opportunity.id = await this.storeLiquidationOpportunity(opportunity);
                
                // Emit event for monitoring
                this.emit('liquidationOpportunity', opportunity);
                
                // Check for auto-execution
                await this.evaluateForAutoExecution(opportunity);
                
                logger.info(`💰 Liquidation found: ${protocolName} - Health: ${healthFactor.toFixed(3)} | Profit: ${opportunity.profitSOL.toFixed(6)} SOL | Risk: ${opportunity.advancedRiskScore.toFixed(1)}/10`);
              }
            }
          }
        } catch (error) {
          logger.debug(`Error analyzing obligation:`, error.message);
          this.stats.errors++;
        }
      }
    } catch (error) {
      logger.error(`Error in scanProtocol for ${protocolName}:`, error);
      throw error;
    }
  }

  async getProtocolObligations(protocol) {
    try {
      // Get program accounts for obligations
      const accounts = await this.connection.getProgramAccounts(
        new PublicKey(protocol.programId),
        {
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: protocol.obligationPrefix
              }
            }
          ]
        }
      );
      
      return accounts.map(account => ({
        pubkey: account.pubkey,
        data: account.account.data,
        protocol: protocol.name
      }));
    } catch (error) {
      logger.error(`Failed to get obligations for ${protocol.name}:`, error);
      return [];
    }
  }

  async calculateHealthFactor(obligation, protocol) {
    try {
      // Parse obligation account data based on protocol
      const obligationData = await this.parseObligationData(obligation, protocol);
      
      if (!obligationData) return null;
      
      let totalCollateralValue = 0;
      let totalBorrowValue = 0;
      let weightedLiquidationThreshold = 0;
      
      // Calculate collateral value
      for (const collateral of obligationData.collaterals || []) {
        const assetPrice = await this.getAssetPrice(collateral.mint);
        const assetInfo = this.getAssetInfo(collateral.mint);
        const collateralValue = (collateral.amount * assetPrice) / Math.pow(10, assetInfo.decimals);
        
        totalCollateralValue += collateralValue;
        weightedLiquidationThreshold += collateralValue * assetInfo.liquidationThreshold;
      }
      
      // Calculate borrow value
      for (const borrow of obligationData.borrows || []) {
        const assetPrice = await this.getAssetPrice(borrow.mint);
        const assetInfo = this.getAssetInfo(borrow.mint);
        const borrowValue = (borrow.amount * assetPrice) / Math.pow(10, assetInfo.decimals);
        
        totalBorrowValue += borrowValue;
      }
      
      if (totalCollateralValue === 0) return null;
      
      const avgLiquidationThreshold = weightedLiquidationThreshold / totalCollateralValue;
      const healthFactor = (totalCollateralValue * avgLiquidationThreshold) / totalBorrowValue;
      
      return healthFactor;
    } catch (error) {
      logger.debug('Error calculating health factor:', error.message);
      return null;
    }
  }

  async parseObligationData(obligation, protocol) {
    // Simplified parsing - in production, you'd use actual protocol IDLs
    try {
      // This is a placeholder implementation
      // In reality, you'd decode the account data using the protocol's IDL
      return {
        collaterals: [
          { mint: 'So11111111111111111111111111111111111111112', amount: 1000000000 } // 1 SOL
        ],
        borrows: [
          { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: 50000000 } // 50 USDC
        ]
      };
    } catch (error) {
      logger.debug('Error parsing obligation data:', error.message);
      return null;
    }
  }

  async getAssetPrice(mint) {
    // Simplified price fetching - in production, use Jupiter/Birdeye APIs
    const commonPrices = {
      'So11111111111111111111111111111111111111112': 20, // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1, // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 1, // USDT
    };
    
    return commonPrices[mint] || 1;
  }

  getAssetInfo(mint) {
    const commonAssets = {
      'So11111111111111111111111111111111111111112': { 
        symbol: 'SOL', 
        decimals: 9,
        ...this.liquidationThresholds.SOL
      },
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { 
        symbol: 'USDC', 
        decimals: 6,
        ...this.liquidationThresholds.USDC
      },
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { 
        symbol: 'USDT', 
        decimals: 6,
        ...this.liquidationThresholds.USDT
      }
    };
    
    return commonAssets[mint] || {
      symbol: 'UNKNOWN',
      decimals: 9,
      ...this.liquidationThresholds.default
    };
  }

  async analyzeLiquidationOpportunity(obligation, healthFactor) {
    try {
      if (!obligation.collaterals || obligation.collaterals.length === 0) return null;
      
      let totalLiquidationValue = 0;
      let totalLiquidationBonus = 0;
      let collateralDetails = [];
      let borrowDetails = [];
      
      // Calculate liquidation values and bonuses
      for (const collateral of obligation.collaterals) {
        const assetPrice = await this.protocolAdapter.getAssetPrice(collateral.mint);
        const liquidationBonus = this.protocolAdapter.getLiquidationBonus(collateral.symbol);
        
        const decimals = collateral.symbol === 'USDC' || collateral.symbol === 'USDT' ? 6 : 9;
        const collateralAmount = collateral.amount.toNumber() / Math.pow(10, decimals);
        const collateralValue = collateralAmount * assetPrice;
        const bonusValue = collateralValue * liquidationBonus;
        
        totalLiquidationValue += collateralValue;
        totalLiquidationBonus += bonusValue;
        
        collateralDetails.push({
          mint: collateral.mint,
          symbol: collateral.symbol,
          amount: collateralAmount,
          valueUSD: collateralValue,
          liquidationBonus: bonusValue
        });
      }
      
      for (const borrow of obligation.borrows) {
        const assetPrice = await this.protocolAdapter.getAssetPrice(borrow.mint);
        const decimals = borrow.symbol === 'USDC' || borrow.symbol === 'USDT' ? 6 : 9;
        const borrowAmount = borrow.amount.toNumber() / Math.pow(10, decimals);
        const borrowValue = borrowAmount * assetPrice;
        
        borrowDetails.push({
          mint: borrow.mint,
          symbol: borrow.symbol,
          amount: borrowAmount,
          valueUSD: borrowValue
        });
      }
      
      // Calculate execution costs
      const gasCost = 0.01; // Estimated gas cost in SOL
      const slippage = 0.005; // 0.5% slippage
      const slippageCost = totalLiquidationValue * slippage;
      
      // Calculate net profit
      const grossProfitUSD = totalLiquidationBonus;
      const solPrice = await this.protocolAdapter.getAssetPrice(this.protocolAdapter.assetMints.SOL);
      const totalCostsUSD = (gasCost * solPrice) + slippageCost;
      const netProfitUSD = grossProfitUSD - totalCostsUSD;
      const netProfitSOL = netProfitUSD / solPrice;
      
      // Risk assessment
      const riskScore = this.calculateLiquidationRisk(healthFactor, totalLiquidationValue);
      
      return {
        obligationPubkey: obligation.pubkey,
        protocol: obligation.protocol,
        healthFactor,
        totalCollateralUSD: totalLiquidationValue,
        totalBorrowUSD: borrowDetails.reduce((sum, b) => sum + b.valueUSD, 0),
        liquidationBonusUSD: totalLiquidationBonus,
        gasCostSOL: gasCost,
        slippageCostUSD: slippageCost,
        grossProfitUSD,
        netProfitUSD,
        profitSOL: netProfitSOL,
        riskScore,
        collaterals: collateralDetails,
        borrows: borrowDetails,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error analyzing liquidation opportunity:', error);
      return null;
    }
  }

  calculateLiquidationRisk(healthFactor, liquidationValue) {
    let riskScore = 5; // Base risk score
    
    // Health factor risk (lower is riskier for timing)
    if (healthFactor < 0.95) riskScore += 2;
    else if (healthFactor < 1.0) riskScore += 1;
    else if (healthFactor > 1.05) riskScore -= 1;
    
    // Liquidation value risk (higher value = more competition)
    if (liquidationValue > 10000) riskScore += 2;
    else if (liquidationValue > 1000) riskScore += 1;
    else if (liquidationValue < 100) riskScore -= 1;
    
    return Math.max(1, Math.min(10, riskScore));
  }

  async storeLiquidationOpportunity(opportunity) {
    try {
      const client = await pool.connect();
      
      const query = `
        INSERT INTO mev_opportunities (
          opportunity_type, block_slot, primary_dex, 
          token_mint_a, token_mint_b, token_symbol_a, token_symbol_b,
          volume_usd, estimated_profit_sol, estimated_profit_usd,
          gas_cost_sol, net_profit_sol, profit_percentage,
          execution_risk_score, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
      `;
      
      const currentSlot = await this.connection.getSlot();
      const primaryCollateral = opportunity.collaterals[0];
      const primaryBorrow = opportunity.borrows[0];
      
      const values = [
        'liquidation',
        currentSlot,
        opportunity.protocol,
        primaryCollateral?.mint || '',
        primaryBorrow?.mint || '',
        primaryCollateral?.symbol || '',
        primaryBorrow?.symbol || '',
        opportunity.totalCollateralUSD,
        opportunity.profitSOL,
        opportunity.netProfitUSD,
        opportunity.gasCostSOL,
        opportunity.profitSOL,
        (opportunity.netProfitUSD / opportunity.totalCollateralUSD) * 100,
        Math.round(opportunity.advancedRiskScore || opportunity.riskScore),
        'detected'
      ];
      
      const result = await client.query(query, values);
      client.release();
      
      logger.info(`💰 Liquidation opportunity stored: ${opportunity.protocol} - ${opportunity.profitSOL.toFixed(4)} SOL profit`);
      
      return result.rows[0].id;
    } catch (error) {
      logger.error('Error storing liquidation opportunity:', error);
      throw error;
    }
  }

  async evaluateForAutoExecution(opportunity) {
    if (!this.autoExecutionConfig.enabled) {
      return; // Auto-execution disabled
    }

    // Safety checks for auto-execution
    const shouldExecute = this.shouldAutoExecute(opportunity);
    
    if (shouldExecute.execute) {
      logger.info(`🤖 Auto-executing liquidation: ${opportunity.protocol} - Risk: ${opportunity.advancedRiskScore.toFixed(1)}/10`);
      await this.liquidationExecutor.queueLiquidation(opportunity);
    } else {
      logger.debug(`⏸️ Skipping auto-execution: ${shouldExecute.reason}`);
    }
  }

  shouldAutoExecute(opportunity) {
    // Risk score check
    if (opportunity.advancedRiskScore > this.autoExecutionConfig.maxRiskScore) {
      return { execute: false, reason: `Risk score too high: ${opportunity.advancedRiskScore.toFixed(1)}/10` };
    }

    // Profit threshold check
    if (opportunity.profitSOL < this.autoExecutionConfig.minProfitSOL) {
      return { execute: false, reason: `Profit too low: ${opportunity.profitSOL.toFixed(6)} SOL` };
    }

    // Position size check
    if (opportunity.totalCollateralUSD > this.autoExecutionConfig.maxPositionSize) {
      return { execute: false, reason: `Position too large: $${opportunity.totalCollateralUSD.toFixed(0)}` };
    }

    // Health factor check (must be liquidatable)
    if (opportunity.healthFactor > 1.0) {
      return { execute: false, reason: `Position not liquidatable: health factor ${opportunity.healthFactor.toFixed(3)}` };
    }

    return { execute: true, reason: 'All checks passed' };
  }

  // Configuration management methods
  enableAutoExecution(config = {}) {
    this.autoExecutionConfig = {
      ...this.autoExecutionConfig,
      enabled: true,
      ...config
    };
    
    logger.info('🤖 Auto-execution enabled with config:', this.autoExecutionConfig);
    
    // Start executor if scanner is running
    if (this.isScanning && !this.liquidationExecutor.isExecuting) {
      this.liquidationExecutor.start();
    }
  }

  disableAutoExecution() {
    this.autoExecutionConfig.enabled = false;
    logger.info('⏹️ Auto-execution disabled');
  }

  getAutoExecutionConfig() {
    return { ...this.autoExecutionConfig };
  }

  updateAutoExecutionConfig(newConfig) {
    this.autoExecutionConfig = { ...this.autoExecutionConfig, ...newConfig };
    logger.info('Auto-execution configuration updated:', this.autoExecutionConfig);
  }

  getStats() {
    return {
      ...this.stats,
      isScanning: this.isScanning,
      uptime: this.isScanning && this.startTime ? Date.now() - this.startTime : 0,
      supportedProtocols: this.protocolAdapter.getSupportedProtocols(),
      autoExecution: {
        enabled: this.autoExecutionConfig.enabled,
        config: this.autoExecutionConfig,
        stats: this.liquidationExecutor.getStats()
      },
      riskModel: {
        performance: this.advancedRiskModel.getModelPerformance()
      },
      sandwichDetector: {
        stats: this.sandwichDetector.getStats(),
        config: this.sandwichDetector.getConfig()
      }
    };
  }

  getStatus() {
    return {
      isRunning: this.isScanning,
      protocols: this.protocolAdapter.getSupportedProtocols(),
      protocolStats: this.protocolAdapter.getProtocolStats(),
      autoExecution: {
        enabled: this.autoExecutionConfig.enabled,
        executor: this.liquidationExecutor.getStats()
      },
      riskModel: {
        weights: this.advancedRiskModel.getRiskFactorWeights(),
        performance: this.advancedRiskModel.getModelPerformance()
      },
      sandwichDetector: {
        isRunning: this.sandwichDetector.isDetecting,
        stats: this.sandwichDetector.getStats(),
        config: this.sandwichDetector.getConfig()
      },
      stats: this.getStats()
    };
  }
}

module.exports = LiquidationScanner;