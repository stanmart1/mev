const SolanaService = require('./solanaService');
const logger = require('../config/logger');
const pool = require('../config/database');

class TransactionMonitor {
  constructor() {
    this.solanaService = new SolanaService();
    this.isRunning = false;
    this.subscriptions = [];
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Transaction monitor is already running');
      return;
    }

    try {
      await this.solanaService.initialize();
      
      // Subscribe to DEX programs
      this.subscriptions = await this.solanaService.subscribeToDEXPrograms(
        (logData) => this.processTransaction(logData)
      );
      
      this.isRunning = true;
      logger.info('Transaction monitor started successfully');
    } catch (error) {
      logger.error('Failed to start transaction monitor:', error);
      throw error;
    }
  }

  async processTransaction(logData) {
    try {
      const { signature, slot, logs, err } = logData;
      
      // Skip failed transactions
      if (err) return;
      
      // Parse transaction for MEV opportunities
      const transaction = await this.solanaService.getTransaction(signature);
      if (!transaction) return;
      
      // Extract DEX-specific data
      const dexData = this.extractDEXData(logs, transaction);
      if (!dexData) return;
      
      // Check for MEV opportunities
      await this.checkForMEVOpportunities(dexData, slot, signature);
      
    } catch (error) {
      logger.error('Error processing transaction:', error);
    }
  }

  extractDEXData(logs, transaction) {
    try {
      const dexData = {
        dex: null,
        tokens: [],
        prices: [],
        volumes: [],
        swapInfo: null
      };

      // Analyze logs to identify DEX and extract swap data
      for (const log of logs) {
        // Raydium swap detection
        if (log.includes('Program log: Instruction: Swap')) {
          dexData.dex = 'raydium';
          dexData.swapInfo = this.parseRaydiumSwap(logs, transaction);
        }
        
        // Orca swap detection
        if (log.includes('Program log: Instruction: swap')) {
          dexData.dex = 'orca';
          dexData.swapInfo = this.parseOrcaSwap(logs, transaction);
        }
        
        // Serum trade detection
        if (log.includes('Program log: new_order') || log.includes('Program log: match_orders')) {
          dexData.dex = 'serum';
          dexData.swapInfo = this.parseSerumTrade(logs, transaction);
        }
      }

      return dexData.swapInfo ? dexData : null;
    } catch (error) {
      logger.error('Error extracting DEX data:', error);
      return null;
    }
  }

  parseRaydiumSwap(logs, transaction) {
    try {
      // Parse Raydium-specific swap data
      const swapInfo = {
        tokenIn: null,
        tokenOut: null,
        amountIn: 0,
        amountOut: 0,
        price: 0,
        poolAddress: null
      };

      // Extract account keys and instruction data
      if (transaction.transaction && transaction.transaction.message) {
        const { accountKeys, instructions } = transaction.transaction.message;
        
        // Find swap instruction
        const swapInstruction = instructions.find(ix => 
          ix.programIdIndex !== undefined && 
          accountKeys[ix.programIdIndex].toString() === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
        );
        
        if (swapInstruction) {
          // Parse instruction data (simplified)
          swapInfo.poolAddress = accountKeys[swapInstruction.accounts[1]]?.toString();
          
          // Extract token amounts from logs
          for (const log of logs) {
            if (log.includes('swap_base_in:') || log.includes('swap_base_out:')) {
              const amountMatch = log.match(/(\d+)/);
              if (amountMatch) {
                swapInfo.amountIn = parseInt(amountMatch[1]);
              }
            }
          }
        }
      }

      return swapInfo.poolAddress ? swapInfo : null;
    } catch (error) {
      logger.error('Error parsing Raydium swap:', error);
      return null;
    }
  }

  parseOrcaSwap(logs, transaction) {
    try {
      // Parse Orca-specific swap data
      const swapInfo = {
        tokenIn: null,
        tokenOut: null,
        amountIn: 0,
        amountOut: 0,
        price: 0,
        poolAddress: null
      };

      // Extract Orca swap data from logs and transaction
      if (transaction.transaction && transaction.transaction.message) {
        const { accountKeys, instructions } = transaction.transaction.message;
        
        // Find Orca swap instruction
        const swapInstruction = instructions.find(ix => 
          ix.programIdIndex !== undefined && 
          (accountKeys[ix.programIdIndex].toString() === 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc' ||
           accountKeys[ix.programIdIndex].toString() === '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP')
        );
        
        if (swapInstruction) {
          swapInfo.poolAddress = accountKeys[swapInstruction.accounts[0]]?.toString();
        }
      }

      return swapInfo.poolAddress ? swapInfo : null;
    } catch (error) {
      logger.error('Error parsing Orca swap:', error);
      return null;
    }
  }

  parseSerumTrade(logs, transaction) {
    try {
      // Parse Serum-specific trade data
      const tradeInfo = {
        tokenIn: null,
        tokenOut: null,
        amountIn: 0,
        amountOut: 0,
        price: 0,
        marketAddress: null
      };

      // Extract Serum trade data
      for (const log of logs) {
        if (log.includes('fill:')) {
          // Parse fill data from logs
          const fillMatch = log.match(/fill: (\w+) (\d+) (\d+)/);
          if (fillMatch) {
            tradeInfo.marketAddress = fillMatch[1];
            tradeInfo.amountIn = parseInt(fillMatch[2]);
            tradeInfo.amountOut = parseInt(fillMatch[3]);
          }
        }
      }

      return tradeInfo.marketAddress ? tradeInfo : null;
    } catch (error) {
      logger.error('Error parsing Serum trade:', error);
      return null;
    }
  }

  async checkForMEVOpportunities(dexData, slot, signature) {
    try {
      // Store transaction data for analysis
      await this.storeDEXTransaction(dexData, slot, signature);
      
      // Check for arbitrage opportunities
      if (dexData.swapInfo && dexData.swapInfo.price > 0) {
        await this.detectArbitrageOpportunity(dexData, slot);
      }
      
      // Check for large transactions that could be sandwiched
      if (dexData.swapInfo && dexData.swapInfo.amountIn > 1000000) { // Threshold for sandwich detection
        await this.detectSandwichOpportunity(dexData, slot, signature);
      }
      
    } catch (error) {
      logger.error('Error checking for MEV opportunities:', error);
    }
  }

  async storeDEXTransaction(dexData, slot, signature) {
    const client = await pool.connect();
    
    try {
      const query = `
        INSERT INTO dex_prices (
          dex_name, token_mint_a, token_mint_b, price, 
          block_slot, pool_address, program_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      const values = [
        dexData.dex,
        dexData.swapInfo?.tokenIn || 'unknown',
        dexData.swapInfo?.tokenOut || 'unknown',
        dexData.swapInfo?.price || 0,
        slot,
        dexData.swapInfo?.poolAddress || dexData.swapInfo?.marketAddress,
        signature
      ];
      
      await client.query(query, values);
    } catch (error) {
      logger.error('Error storing DEX transaction:', error);
    } finally {
      client.release();
    }
  }

  async detectArbitrageOpportunity(dexData, slot) {
    const client = await pool.connect();
    
    try {
      // Look for price differences across DEXs for the same token pair
      const query = `
        SELECT dex_name, price, timestamp 
        FROM dex_prices 
        WHERE token_mint_a = $1 AND token_mint_b = $2
        AND timestamp > NOW() - INTERVAL '5 minutes'
        ORDER BY timestamp DESC
        LIMIT 10
      `;
      
      const result = await client.query(query, [
        dexData.swapInfo.tokenIn,
        dexData.swapInfo.tokenOut
      ]);
      
      if (result.rows.length >= 2) {
        // Calculate price differences
        const prices = result.rows.map(row => ({
          dex: row.dex_name,
          price: parseFloat(row.price)
        }));
        
        const maxPrice = Math.max(...prices.map(p => p.price));
        const minPrice = Math.min(...prices.map(p => p.price));
        const priceDiff = ((maxPrice - minPrice) / minPrice) * 100;
        
        if (priceDiff > 0.5) { // 0.5% minimum arbitrage threshold
          await this.createArbitrageOpportunity(dexData, prices, priceDiff, slot);
        }
      }
      
    } catch (error) {
      logger.error('Error detecting arbitrage opportunity:', error);
    } finally {
      client.release();
    }
  }

  async createArbitrageOpportunity(dexData, prices, priceDiff, slot) {
    const client = await pool.connect();
    
    try {
      const maxPriceEntry = prices.find(p => p.price === Math.max(...prices.map(pr => pr.price)));
      const minPriceEntry = prices.find(p => p.price === Math.min(...prices.map(pr => pr.price)));
      
      const query = `
        INSERT INTO mev_opportunities (
          opportunity_type, primary_dex, secondary_dex,
          token_mint_a, token_mint_b, price_a, price_b,
          estimated_profit_sol, profit_percentage, block_slot,
          execution_risk_score, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      
      const estimatedProfit = (priceDiff / 100) * 1; // Simplified profit calculation
      
      const values = [
        'arbitrage',
        minPriceEntry.dex,
        maxPriceEntry.dex,
        dexData.swapInfo.tokenIn,
        dexData.swapInfo.tokenOut,
        minPriceEntry.price,
        maxPriceEntry.price,
        estimatedProfit,
        priceDiff,
        slot,
        5, // Medium risk score
        'detected'
      ];
      
      await client.query(query, values);
      logger.info(`Arbitrage opportunity detected: ${priceDiff.toFixed(2)}% price difference`);
      
    } catch (error) {
      logger.error('Error creating arbitrage opportunity:', error);
    } finally {
      client.release();
    }
  }

  async detectSandwichOpportunity(dexData, slot, signature) {
    // Simplified sandwich detection based on transaction size
    const client = await pool.connect();
    
    try {
      const estimatedProfit = dexData.swapInfo.amountIn * 0.001; // 0.1% of transaction value
      
      const query = `
        INSERT INTO mev_opportunities (
          opportunity_type, primary_dex, token_mint_a, token_mint_b,
          volume_usd, estimated_profit_sol, block_slot, signature,
          execution_risk_score, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      const values = [
        'sandwich',
        dexData.dex,
        dexData.swapInfo.tokenIn,
        dexData.swapInfo.tokenOut,
        dexData.swapInfo.amountIn / 1000000, // Convert to approximate USD
        estimatedProfit,
        slot,
        signature,
        7, // Higher risk for sandwich attacks
        'detected'
      ];
      
      await client.query(query, values);
      logger.info(`Sandwich opportunity detected for large transaction: ${signature}`);
      
    } catch (error) {
      logger.error('Error creating sandwich opportunity:', error);
    } finally {
      client.release();
    }
  }

  async stop() {
    if (!this.isRunning) {
      logger.warn('Transaction monitor is not running');
      return;
    }

    // Unsubscribe from all programs
    for (const subscription of this.subscriptions) {
      await this.solanaService.unsubscribeFromProgram(subscription.programId);
    }
    
    this.solanaService.disconnect();
    this.isRunning = false;
    logger.info('Transaction monitor stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      subscriptions: this.subscriptions.length,
      solanaConnected: this.solanaService.isConnected
    };
  }
}

module.exports = TransactionMonitor;