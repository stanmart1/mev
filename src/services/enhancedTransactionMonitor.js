const SolanaService = require('./solanaService');
const logger = require('../config/logger');
const pool = require('../config/database');
const { PublicKey } = require('@solana/web3.js');
const EventEmitter = require('events');

class EnhancedTransactionMonitor extends EventEmitter {
  constructor() {
    super();
    this.solanaService = new SolanaService();
    this.isRunning = false;
    this.subscriptions = [];
    this.processingQueue = [];
    this.batchSize = 50;
    this.batchTimeout = 1000; // 1 second
    this.stats = {
      transactionsProcessed: 0,
      swapsDetected: 0,
      opportunitiesFound: 0,
      errors: 0
    };
    
    // Token decimals cache
    this.tokenDecimals = new Map();
    
    // Known token symbols for popular tokens
    this.tokenSymbols = new Map([
      ['So11111111111111111111111111111111111111112', 'SOL'],
      ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'USDC'],
      ['Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 'USDT'],
      ['mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', 'mSOL'],
      ['7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', 'stSOL']
    ]);
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Enhanced transaction monitor is already running');
      return;
    }

    try {
      await this.solanaService.initialize();
      
      // Subscribe to DEX programs with enhanced callback
      this.subscriptions = await this.solanaService.subscribeToDEXPrograms(
        (logData) => this.queueTransaction(logData)
      );
      
      // Start batch processing
      this.startBatchProcessor();
      
      this.isRunning = true;
      logger.info('Enhanced transaction monitor started successfully');
      
      // Log stats periodically
      this.statsInterval = setInterval(() => this.logStats(), 30000);
      
    } catch (error) {
      logger.error('Failed to start enhanced transaction monitor:', error);
      throw error;
    }
  }

  queueTransaction(logData) {
    this.processingQueue.push({
      ...logData,
      timestamp: Date.now()
    });
  }

  startBatchProcessor() {
    this.batchInterval = setInterval(async () => {
      if (this.processingQueue.length > 0) {
        const batch = this.processingQueue.splice(0, this.batchSize);
        await this.processBatch(batch);
      }
    }, this.batchTimeout);
  }

  async processBatch(batch) {
    const processPromises = batch.map(logData => this.processTransaction(logData));
    const results = await Promise.allSettled(processPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.stats.errors++;
        logger.error(`Error processing transaction ${batch[index].signature}:`, result.reason);
      }
    });
  }

  async processTransaction(logData) {
    try {
      const { signature, slot, logs, err } = logData;
      
      // Skip failed transactions
      if (err) return;
      
      this.stats.transactionsProcessed++;
      
      // Enhanced transaction parsing
      const swapData = await this.parseSwapTransaction(signature, slot, logs);
      if (!swapData) return;
      
      this.stats.swapsDetected++;
      
      // Store swap data efficiently
      await this.storeSwapData(swapData);
      
      // Emit real-time event
      this.emit('swapDetected', swapData);
      
      // Check for MEV opportunities
      const opportunities = await this.analyzeForOpportunities(swapData);
      if (opportunities.length > 0) {
        this.stats.opportunitiesFound += opportunities.length;
        opportunities.forEach(opp => this.emit('opportunityDetected', opp));
      }
      
    } catch (error) {
      this.stats.errors++;
      logger.error('Error processing transaction:', error);
    }
  }

  async parseSwapTransaction(signature, slot, logs) {
    try {
      // Get full transaction data
      const transaction = await this.solanaService.getTransaction(signature);
      if (!transaction || !transaction.transaction) return null;
      
      const { message } = transaction.transaction;
      const { accountKeys, instructions } = message;
      
      // Enhanced DEX detection and parsing
      for (const instruction of instructions) {
        const programId = accountKeys[instruction.programIdIndex].toString();
        
        // Raydium AMM
        if (programId === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8') {
          return await this.parseRaydiumSwap(signature, slot, logs, instruction, accountKeys, transaction);
        }
        
        // Orca Whirlpool
        if (programId === 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc') {
          return await this.parseOrcaWhirlpoolSwap(signature, slot, logs, instruction, accountKeys, transaction);
        }
        
        // Orca Legacy
        if (programId === '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP') {
          return await this.parseOrcaLegacySwap(signature, slot, logs, instruction, accountKeys, transaction);
        }
        
        // Serum DEX
        if (programId === '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin') {
          return await this.parseSerumTrade(signature, slot, logs, instruction, accountKeys, transaction);
        }
      }
      
      return null;
    } catch (error) {
      logger.error(`Error parsing swap transaction ${signature}:`, error);
      return null;
    }
  }

  async parseRaydiumSwap(signature, slot, logs, instruction, accountKeys, transaction) {
    try {
      const swapData = {
        signature,
        slot,
        dex: 'raydium',
        timestamp: new Date(),
        poolAddress: accountKeys[instruction.accounts[1]]?.toString(),
        tokenMintA: null,
        tokenMintB: null,
        tokenSymbolA: null,
        tokenSymbolB: null,
        amountIn: 0,
        amountOut: 0,
        price: 0,
        priceImpact: 0,
        fee: 0,
        user: accountKeys[instruction.accounts[16]]?.toString(), // User authority
        volumeUSD: 0
      };
      
      // Extract token mints from pool accounts
      if (instruction.accounts.length >= 12) {
        swapData.tokenMintA = accountKeys[instruction.accounts[8]]?.toString();
        swapData.tokenMintB = accountKeys[instruction.accounts[9]]?.toString();
      }
      
      // Parse amounts from logs
      for (const log of logs) {
        // Raydium swap log format: "Program log: swap_base_in: <amount>, swap_quote_out: <amount>"
        const swapMatch = log.match(/swap_base_in:\\s*(\\d+),\\s*swap_quote_out:\\s*(\\d+)/);
        if (swapMatch) {
          swapData.amountIn = parseInt(swapMatch[1]);
          swapData.amountOut = parseInt(swapMatch[2]);
        }
        
        // Fee extraction
        const feeMatch = log.match(/fee:\\s*(\\d+)/);
        if (feeMatch) {
          swapData.fee = parseInt(feeMatch[1]);
        }
      }
      
      // Calculate price and additional metrics
      if (swapData.amountIn > 0 && swapData.amountOut > 0) {
        await this.enrichSwapData(swapData);
        return swapData;
      }
      
      return null;
    } catch (error) {
      logger.error('Error parsing Raydium swap:', error);
      return null;
    }
  }

  async parseOrcaWhirlpoolSwap(signature, slot, logs, instruction, accountKeys, transaction) {
    try {
      const swapData = {
        signature,
        slot,
        dex: 'orca_whirlpool',
        timestamp: new Date(),
        poolAddress: accountKeys[instruction.accounts[0]]?.toString(),
        tokenMintA: null,
        tokenMintB: null,
        tokenSymbolA: null,
        tokenSymbolB: null,
        amountIn: 0,
        amountOut: 0,
        price: 0,
        priceImpact: 0,
        fee: 0,
        user: accountKeys[instruction.accounts[1]]?.toString(),
        volumeUSD: 0
      };
      
      // Parse Orca Whirlpool logs
      for (const log of logs) {
        // Whirlpool swap format varies, look for transfer logs
        const transferMatch = log.match(/Program log: Transfer:\\s*(\\d+)/);
        if (transferMatch) {
          const amount = parseInt(transferMatch[1]);
          if (swapData.amountIn === 0) {
            swapData.amountIn = amount;
          } else if (swapData.amountOut === 0) {
            swapData.amountOut = amount;
          }
        }
      }
      
      // Get token mints from whirlpool account data
      if (swapData.poolAddress) {
        const poolInfo = await this.getWhirlpoolInfo(swapData.poolAddress);
        if (poolInfo) {
          swapData.tokenMintA = poolInfo.tokenMintA;
          swapData.tokenMintB = poolInfo.tokenMintB;
        }
      }
      
      if (swapData.amountIn > 0 && swapData.amountOut > 0) {
        await this.enrichSwapData(swapData);
        return swapData;
      }
      
      return null;
    } catch (error) {
      logger.error('Error parsing Orca Whirlpool swap:', error);
      return null;
    }
  }

  async parseOrcaLegacySwap(signature, slot, logs, instruction, accountKeys, transaction) {
    try {
      const swapData = {
        signature,
        slot,
        dex: 'orca_legacy',
        timestamp: new Date(),
        poolAddress: accountKeys[instruction.accounts[1]]?.toString(),
        tokenMintA: null,
        tokenMintB: null,
        tokenSymbolA: null,
        tokenSymbolB: null,
        amountIn: 0,
        amountOut: 0,
        price: 0,
        priceImpact: 0,
        fee: 0,
        user: accountKeys[instruction.accounts[0]]?.toString(),
        volumeUSD: 0
      };
      
      // Parse Orca legacy swap logs
      for (const log of logs) {
        const swapMatch = log.match(/Swapped:\\s*(\\d+)\\s*for\\s*(\\d+)/);
        if (swapMatch) {
          swapData.amountIn = parseInt(swapMatch[1]);
          swapData.amountOut = parseInt(swapMatch[2]);
        }
      }
      
      if (swapData.amountIn > 0 && swapData.amountOut > 0) {
        await this.enrichSwapData(swapData);
        return swapData;
      }
      
      return null;
    } catch (error) {
      logger.error('Error parsing Orca legacy swap:', error);
      return null;
    }
  }

  async parseSerumTrade(signature, slot, logs, instruction, accountKeys, transaction) {
    try {
      const tradeData = {
        signature,
        slot,
        dex: 'serum',
        timestamp: new Date(),
        marketAddress: accountKeys[instruction.accounts[0]]?.toString(),
        tokenMintA: null,
        tokenMintB: null,
        tokenSymbolA: null,
        tokenSymbolB: null,
        amountIn: 0,
        amountOut: 0,
        price: 0,
        priceImpact: 0,
        fee: 0,
        user: accountKeys[instruction.accounts[1]]?.toString(),
        volumeUSD: 0
      };
      
      // Parse Serum trade logs
      for (const log of logs) {
        const fillMatch = log.match(/fill:\\s*(\\d+)\\s*@\\s*(\\d+)/);
        if (fillMatch) {
          tradeData.amountIn = parseInt(fillMatch[1]);
          tradeData.price = parseInt(fillMatch[2]) / 1e6; // Adjust for price decimals
        }
      }
      
      if (tradeData.amountIn > 0 && tradeData.price > 0) {
        tradeData.amountOut = tradeData.amountIn * tradeData.price;
        await this.enrichSwapData(tradeData);
        return tradeData;
      }
      
      return null;
    } catch (error) {
      logger.error('Error parsing Serum trade:', error);
      return null;
    }
  }

  async enrichSwapData(swapData) {
    try {
      // Get token symbols
      if (swapData.tokenMintA) {
        swapData.tokenSymbolA = this.tokenSymbols.get(swapData.tokenMintA) || 
                               await this.getTokenSymbol(swapData.tokenMintA);
      }
      
      if (swapData.tokenMintB) {
        swapData.tokenSymbolB = this.tokenSymbols.get(swapData.tokenMintB) || 
                               await this.getTokenSymbol(swapData.tokenMintB);
      }
      
      // Get token decimals for proper amount calculation
      const decimalsA = await this.getTokenDecimals(swapData.tokenMintA);
      const decimalsB = await this.getTokenDecimals(swapData.tokenMintB);
      
      // Adjust amounts for decimals
      const adjustedAmountIn = swapData.amountIn / Math.pow(10, decimalsA);
      const adjustedAmountOut = swapData.amountOut / Math.pow(10, decimalsB);
      
      // Calculate price
      if (adjustedAmountIn > 0 && adjustedAmountOut > 0) {
        swapData.price = adjustedAmountOut / adjustedAmountIn;
      }
      
      // Estimate USD volume (simplified - using SOL price approximation)
      if (swapData.tokenSymbolA === 'SOL' || swapData.tokenSymbolB === 'SOL') {
        const solAmount = swapData.tokenSymbolA === 'SOL' ? adjustedAmountIn : adjustedAmountOut;
        swapData.volumeUSD = solAmount * 100; // Approximate SOL price
      } else if (swapData.tokenSymbolA === 'USDC' || swapData.tokenSymbolB === 'USDC') {
        const usdcAmount = swapData.tokenSymbolA === 'USDC' ? adjustedAmountIn : adjustedAmountOut;
        swapData.volumeUSD = usdcAmount;
      }
      
    } catch (error) {
      logger.error('Error enriching swap data:', error);
    }
  }

  async getTokenDecimals(tokenMint) {
    if (!tokenMint) return 9; // Default to 9 decimals
    
    if (this.tokenDecimals.has(tokenMint)) {
      return this.tokenDecimals.get(tokenMint);
    }
    
    try {
      const accountInfo = await this.solanaService.getAccountInfo(tokenMint);
      if (accountInfo && accountInfo.data) {
        // Parse mint data to get decimals (byte 44)
        const decimals = accountInfo.data[44];
        this.tokenDecimals.set(tokenMint, decimals);
        return decimals;
      }
    } catch (error) {
      logger.error(`Error getting decimals for token ${tokenMint}:`, error);
    }
    
    return 9; // Default fallback
  }

  async getTokenSymbol(tokenMint) {
    // In a real implementation, you'd query token metadata
    // For now, return a shortened version of the mint address
    return tokenMint ? tokenMint.substring(0, 6) + '...' : 'UNK';
  }

  async getWhirlpoolInfo(poolAddress) {
    try {
      const accountInfo = await this.solanaService.getAccountInfo(poolAddress);
      if (accountInfo && accountInfo.data) {
        // Parse whirlpool data structure to get token mints
        // This is a simplified version - real implementation would use proper deserialization
        return {
          tokenMintA: 'tokenA', // Would be parsed from account data
          tokenMintB: 'tokenB'  // Would be parsed from account data
        };
      }
    } catch (error) {
      logger.error(`Error getting whirlpool info for ${poolAddress}:`, error);
    }
    return null;
  }

  async storeSwapData(swapData) {
    const client = await pool.connect();
    
    try {
      // Store in dex_prices table for historical analysis
      const priceQuery = `
        INSERT INTO dex_prices (
          dex_name, token_mint_a, token_mint_b, token_symbol_a, token_symbol_b,
          price, volume_24h_usd, block_slot, timestamp, pool_address, program_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `;
      
      const priceValues = [
        swapData.dex,
        swapData.tokenMintA,
        swapData.tokenMintB,
        swapData.tokenSymbolA,
        swapData.tokenSymbolB,
        swapData.price,
        swapData.volumeUSD,
        swapData.slot,
        swapData.timestamp,
        swapData.poolAddress || swapData.marketAddress,
        swapData.signature
      ];
      
      await client.query(priceQuery, priceValues);
      
    } catch (error) {
      logger.error('Error storing swap data:', error);
    } finally {
      client.release();
    }
  }

  async analyzeForOpportunities(swapData) {
    const opportunities = [];
    
    try {
      // Check for arbitrage opportunities
      const arbitrageOpp = await this.checkArbitrageOpportunity(swapData);
      if (arbitrageOpp) {
        opportunities.push(arbitrageOpp);
      }
      
      // Check for sandwich opportunities (large transactions)
      if (swapData.volumeUSD > 10000) { // $10k threshold
        const sandwichOpp = await this.checkSandwichOpportunity(swapData);
        if (sandwichOpp) {
          opportunities.push(sandwichOpp);
        }
      }
      
    } catch (error) {
      logger.error('Error analyzing opportunities:', error);
    }
    
    return opportunities;
  }

  async checkArbitrageOpportunity(swapData) {
    const client = await pool.connect();
    
    try {
      // Look for recent prices on other DEXs for the same token pair
      const query = `
        SELECT dex_name, price, timestamp 
        FROM dex_prices 
        WHERE ((token_mint_a = $1 AND token_mint_b = $2) OR (token_mint_a = $2 AND token_mint_b = $1))
        AND dex_name != $3
        AND timestamp > NOW() - INTERVAL '2 minutes'
        ORDER BY timestamp DESC
        LIMIT 5
      `;
      
      const result = await client.query(query, [
        swapData.tokenMintA,
        swapData.tokenMintB,
        swapData.dex
      ]);
      
      if (result.rows.length > 0) {
        for (const row of result.rows) {
          const priceDiff = Math.abs(swapData.price - parseFloat(row.price));
          const priceDiffPercent = (priceDiff / swapData.price) * 100;
          
          if (priceDiffPercent > 0.5) { // 0.5% minimum threshold
            return await this.createArbitrageOpportunity(swapData, row, priceDiffPercent);
          }
        }
      }
      
    } catch (error) {
      logger.error('Error checking arbitrage opportunity:', error);
    } finally {
      client.release();
    }
    
    return null;
  }

  async createArbitrageOpportunity(swapData, comparePriceData, priceDiffPercent) {
    const client = await pool.connect();
    
    try {
      const opportunityQuery = `
        INSERT INTO mev_opportunities (
          opportunity_type, primary_dex, secondary_dex, token_mint_a, token_mint_b,
          token_symbol_a, token_symbol_b, price_a, price_b, estimated_profit_sol,
          profit_percentage, block_slot, signature, execution_risk_score, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
      `;
      
      const estimatedProfit = (priceDiffPercent / 100) * Math.min(swapData.volumeUSD / 100, 10); // Conservative estimate
      
      const values = [
        'arbitrage',
        swapData.dex,
        comparePriceData.dex_name,
        swapData.tokenMintA,
        swapData.tokenMintB,
        swapData.tokenSymbolA,
        swapData.tokenSymbolB,
        swapData.price,
        parseFloat(comparePriceData.price),
        estimatedProfit,
        priceDiffPercent,
        swapData.slot,
        swapData.signature,
        5, // Medium risk
        'detected'
      ];
      
      const result = await client.query(opportunityQuery, values);
      
      logger.info(`Arbitrage opportunity detected: ${priceDiffPercent.toFixed(2)}% between ${swapData.dex} and ${comparePriceData.dex_name}`);
      
      return {
        id: result.rows[0].id,
        type: 'arbitrage',
        profitPercent: priceDiffPercent,
        estimatedProfit: estimatedProfit
      };
      
    } catch (error) {
      logger.error('Error creating arbitrage opportunity:', error);
    } finally {
      client.release();
    }
    
    return null;
  }

  async checkSandwichOpportunity(swapData) {
    // Simplified sandwich opportunity detection
    const estimatedProfit = swapData.volumeUSD * 0.001; // 0.1% of transaction value
    
    if (estimatedProfit > 0.01) { // Minimum $0.01 profit threshold
      return await this.createSandwichOpportunity(swapData, estimatedProfit);
    }
    
    return null;
  }

  async createSandwichOpportunity(swapData, estimatedProfit) {
    const client = await pool.connect();
    
    try {
      const opportunityQuery = `
        INSERT INTO mev_opportunities (
          opportunity_type, primary_dex, token_mint_a, token_mint_b,
          token_symbol_a, token_symbol_b, volume_usd, estimated_profit_sol,
          block_slot, signature, execution_risk_score, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `;
      
      const values = [
        'sandwich',
        swapData.dex,
        swapData.tokenMintA,
        swapData.tokenMintB,
        swapData.tokenSymbolA,
        swapData.tokenSymbolB,
        swapData.volumeUSD,
        estimatedProfit / 100, // Convert to SOL approximation
        swapData.slot,
        swapData.signature,
        7, // Higher risk for sandwich
        'detected'
      ];
      
      const result = await client.query(opportunityQuery, values);
      
      logger.info(`Sandwich opportunity detected: $${swapData.volumeUSD.toFixed(2)} transaction`);
      
      return {
        id: result.rows[0].id,
        type: 'sandwich',
        estimatedProfit: estimatedProfit,
        volumeUSD: swapData.volumeUSD
      };
      
    } catch (error) {
      logger.error('Error creating sandwich opportunity:', error);
    } finally {
      client.release();
    }
    
    return null;
  }

  logStats() {
    logger.info('Transaction Monitor Stats:', this.stats);
  }

  async stop() {
    if (!this.isRunning) {
      logger.warn('Enhanced transaction monitor is not running');
      return;
    }

    // Clear intervals
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    // Unsubscribe from all programs
    for (const subscription of this.subscriptions) {
      await this.solanaService.unsubscribeFromProgram(subscription.programId);
    }
    
    this.solanaService.disconnect();
    this.isRunning = false;
    logger.info('Enhanced transaction monitor stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      subscriptions: this.subscriptions.length,
      solanaConnected: this.solanaService.isConnected,
      queueSize: this.processingQueue.length,
      stats: this.stats
    };
  }

  getStats() {
    return { ...this.stats };
  }
}

module.exports = EnhancedTransactionMonitor;