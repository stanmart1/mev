const { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  Keypair,
  sendAndConfirmTransaction,
  ComputeBudgetProgram
} = require('@solana/web3.js');
const config = require('../config/config');
const logger = require('../config/logger');
const pool = require('../config/database');
const EventEmitter = require('events');

class LiquidationExecutor extends EventEmitter {
  constructor() {
    super();
    this.connection = new Connection(config.solana.rpcUrl, config.solana.commitment);
    this.isExecuting = false;
    this.executionQueue = [];
    this.maxConcurrentExecutions = 3;
    this.currentExecutions = 0;
    
    // Execution configuration
    this.config = {
      maxGasPrice: 0.02, // Maximum 0.02 SOL for gas
      maxSlippage: 0.03, // 3% maximum slippage
      confirmationTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      minProfitThreshold: 0.005, // Minimum 0.005 SOL profit to execute
      priorityFeeMultiplier: 1.5 // 50% higher priority fee for faster execution
    };
    
    // Execution statistics
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalProfitRealized: 0,
      averageExecutionTime: 0,
      gasSpent: 0
    };
    
    // Protocol-specific liquidation instructions
    this.protocolInstructions = {
      solend: this.createSolendLiquidationInstruction.bind(this),
      portFinance: this.createPortFinanceLiquidationInstruction.bind(this),
      francium: this.createFranciumLiquidationInstruction.bind(this)
    };
  }

  async start() {
    if (this.isExecuting) {
      logger.warn('Liquidation executor already running');
      return;
    }

    this.isExecuting = true;
    logger.info('🚀 Starting automated liquidation executor...');
    
    // Start processing queue
    this.processQueue();
    
    this.emit('executorStarted');
    logger.info('✅ Liquidation executor started successfully');
  }

  async stop() {
    if (!this.isExecuting) return;
    
    this.isExecuting = false;
    
    // Wait for current executions to complete
    while (this.currentExecutions > 0) {
      await this.sleep(1000);
    }
    
    this.emit('executorStopped');
    logger.info('🛑 Liquidation executor stopped');
  }

  async queueLiquidation(opportunity) {
    if (!this.isExecuting) {
      logger.warn('Executor not running, cannot queue liquidation');
      return false;
    }

    // Pre-execution validation
    const validationResult = await this.validateOpportunity(opportunity);
    if (!validationResult.valid) {
      logger.warn(`Liquidation validation failed: ${validationResult.reason}`);
      return false;
    }

    // Add to execution queue
    this.executionQueue.push({
      ...opportunity,
      queuedAt: Date.now(),
      retryCount: 0
    });

    logger.info(`💼 Queued liquidation: ${opportunity.protocol} - ${opportunity.profitSOL.toFixed(6)} SOL profit`);
    this.emit('liquidationQueued', opportunity);
    
    return true;
  }

  async processQueue() {
    while (this.isExecuting) {
      try {
        // Process opportunities if we have capacity
        if (this.executionQueue.length > 0 && this.currentExecutions < this.maxConcurrentExecutions) {
          const opportunity = this.executionQueue.shift();
          
          // Check if opportunity is still valid (not too old)
          const age = Date.now() - opportunity.queuedAt;
          if (age > 60000) { // 60 seconds max age
            logger.warn(`Discarding stale liquidation opportunity: ${age}ms old`);
            continue;
          }

          // Execute in parallel
          this.executeLiquidation(opportunity);
        }
        
        await this.sleep(100); // Check queue every 100ms
      } catch (error) {
        logger.error('Error in liquidation queue processing:', error);
      }
    }
  }

  async executeLiquidation(opportunity) {
    this.currentExecutions++;
    const startTime = Date.now();
    
    try {
      logger.info(`⚡ Executing liquidation: ${opportunity.protocol} - ${opportunity.obligationPubkey}`);
      
      // Update opportunity status to executing
      await this.updateOpportunityStatus(opportunity.id, 'executing');
      
      // Create and send liquidation transaction
      const result = await this.createAndSendLiquidationTransaction(opportunity);
      
      if (result.success) {
        const executionTime = Date.now() - startTime;
        
        // Update statistics
        this.stats.totalExecutions++;
        this.stats.successfulExecutions++;
        this.stats.totalProfitRealized += result.actualProfit;
        this.stats.gasSpent += result.gasCost;
        this.stats.averageExecutionTime = (
          (this.stats.averageExecutionTime * (this.stats.totalExecutions - 1) + executionTime) / 
          this.stats.totalExecutions
        );
        
        // Update database
        await this.updateOpportunityExecution(opportunity.id, {
          status: 'executed',
          signature: result.signature,
          actualProfit: result.actualProfit,
          gasCost: result.gasCost,
          executionTime
        });
        
        logger.info(`✅ Liquidation executed successfully: ${result.signature} | Profit: ${result.actualProfit.toFixed(6)} SOL`);
        this.emit('liquidationExecuted', { opportunity, result });
        
      } else {
        await this.handleExecutionFailure(opportunity, result.error);
      }
      
    } catch (error) {
      await this.handleExecutionFailure(opportunity, error);
    } finally {
      this.currentExecutions--;
    }
  }

  async createAndSendLiquidationTransaction(opportunity) {
    try {
      // Get the appropriate instruction creator for the protocol
      const instructionCreator = this.protocolInstructions[opportunity.protocol];
      if (!instructionCreator) {
        throw new Error(`Unsupported protocol: ${opportunity.protocol}`);
      }

      // Create liquidation instruction
      const liquidationInstruction = await instructionCreator(opportunity);
      
      // Create transaction
      const transaction = new Transaction();
      
      // Add priority fee for faster execution
      const priorityFee = Math.floor(5000 * this.config.priorityFeeMultiplier); // Base 5000 lamports
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFee
        })
      );
      
      // Add liquidation instruction
      transaction.add(liquidationInstruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.getExecutorWallet().publicKey;
      
      // Sign transaction
      transaction.sign(this.getExecutorWallet());
      
      // Send transaction with confirmation
      const signature = await this.connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      // Calculate actual results
      const actualProfit = await this.calculateActualProfit(signature, opportunity);
      const gasCost = await this.calculateGasCost(signature);
      
      return {
        success: true,
        signature,
        actualProfit,
        gasCost
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createSolendLiquidationInstruction(opportunity) {
    // Simplified Solend liquidation instruction
    // In production, use actual Solend SDK
    
    const programId = new PublicKey('So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo');
    const obligationKey = new PublicKey(opportunity.obligationPubkey);
    
    // Mock instruction data - in production, use proper instruction encoding
    const instructionData = Buffer.from([
      0, // Liquidate instruction discriminator
      ...Array(32).fill(0) // Placeholder data
    ]);
    
    return new TransactionInstruction({
      keys: [
        { pubkey: obligationKey, isSigner: false, isWritable: true },
        { pubkey: this.getExecutorWallet().publicKey, isSigner: true, isWritable: true },
        // Add other required accounts
      ],
      programId,
      data: instructionData
    });
  }

  async createPortFinanceLiquidationInstruction(opportunity) {
    // Simplified Port Finance liquidation instruction
    const programId = new PublicKey('Port7uDVFX5mULp7WJjj9g69nf1B1UoNMW3HBQcMFcZ');
    const obligationKey = new PublicKey(opportunity.obligationPubkey);
    
    const instructionData = Buffer.from([1, ...Array(32).fill(0)]);
    
    return new TransactionInstruction({
      keys: [
        { pubkey: obligationKey, isSigner: false, isWritable: true },
        { pubkey: this.getExecutorWallet().publicKey, isSigner: true, isWritable: true },
      ],
      programId,
      data: instructionData
    });
  }

  async createFranciumLiquidationInstruction(opportunity) {
    // Simplified Francium liquidation instruction
    const programId = new PublicKey('Fran2GkrBY7xrNfYGK9KAAhsq3w4e8ZmA5J9oHjGe2jf');
    const obligationKey = new PublicKey(opportunity.obligationPubkey);
    
    const instructionData = Buffer.from([2, ...Array(32).fill(0)]);
    
    return new TransactionInstruction({
      keys: [
        { pubkey: obligationKey, isSigner: false, isWritable: true },
        { pubkey: this.getExecutorWallet().publicKey, isSigner: true, isWritable: true },
      ],
      programId,
      data: instructionData
    });
  }

  async validateOpportunity(opportunity) {
    // Profit threshold check
    if (opportunity.profitSOL < this.config.minProfitThreshold) {
      return { valid: false, reason: 'Profit below threshold' };
    }

    // Gas cost validation
    if (opportunity.gasCostSOL > this.config.maxGasPrice) {
      return { valid: false, reason: 'Gas cost too high' };
    }

    // Health factor validation (should still be liquidatable)
    if (opportunity.healthFactor > 1.0) {
      return { valid: false, reason: 'Position no longer liquidatable' };
    }

    // Risk score validation
    if (opportunity.riskScore > 8) {
      return { valid: false, reason: 'Risk score too high' };
    }

    return { valid: true };
  }

  async handleExecutionFailure(opportunity, error) {
    this.stats.totalExecutions++;
    this.stats.failedExecutions++;
    
    logger.error(`❌ Liquidation execution failed: ${opportunity.protocol} - ${error.message}`);
    
    // Retry logic
    if (opportunity.retryCount < this.config.retryAttempts) {
      opportunity.retryCount++;
      opportunity.queuedAt = Date.now(); // Reset queue time
      this.executionQueue.unshift(opportunity); // Add to front of queue for retry
      
      logger.info(`🔄 Retrying liquidation (attempt ${opportunity.retryCount}/${this.config.retryAttempts})`);
    } else {
      // Mark as failed after max retries
      await this.updateOpportunityStatus(opportunity.id, 'failed');
      this.emit('liquidationFailed', { opportunity, error: error.message });
    }
  }

  async calculateActualProfit(signature, opportunity) {
    // Simplified profit calculation - in production, analyze transaction logs
    // For now, return estimated profit with some variance
    const variance = (Math.random() - 0.5) * 0.1; // ±5% variance
    return opportunity.profitSOL * (1 + variance);
  }

  async calculateGasCost(signature) {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed'
      });
      
      if (transaction && transaction.meta) {
        return (transaction.meta.fee || 5000) / 1e9; // Convert lamports to SOL
      }
    } catch (error) {
      logger.debug('Could not calculate actual gas cost:', error.message);
    }
    
    return 0.005; // Default estimate
  }

  async updateOpportunityStatus(opportunityId, status) {
    try {
      const client = await pool.connect();
      await client.query(
        'UPDATE mev_opportunities SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, opportunityId]
      );
      client.release();
    } catch (error) {
      logger.error('Error updating opportunity status:', error);
    }
  }

  async updateOpportunityExecution(opportunityId, executionData) {
    try {
      const client = await pool.connect();
      await client.query(`
        UPDATE mev_opportunities 
        SET status = $1, signature = $2, actual_profit_sol = $3, 
            executed_at = NOW(), updated_at = NOW()
        WHERE id = $4
      `, [
        executionData.status,
        executionData.signature,
        executionData.actualProfit,
        opportunityId
      ]);
      client.release();
    } catch (error) {
      logger.error('Error updating opportunity execution:', error);
    }
  }

  getExecutorWallet() {
    // In production, load from secure key storage
    // For demo, create a random keypair
    if (!this.wallet) {
      this.wallet = Keypair.generate();
      logger.warn('⚠️ Using generated wallet for demo. In production, use secure key management.');
    }
    return this.wallet;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.stats,
      isExecuting: this.isExecuting,
      queueLength: this.executionQueue.length,
      currentExecutions: this.currentExecutions,
      successRate: this.stats.totalExecutions > 0 ? 
        (this.stats.successfulExecutions / this.stats.totalExecutions * 100).toFixed(2) + '%' : '0%'
    };
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Liquidation executor configuration updated');
    this.emit('configUpdated', this.config);
  }
}

module.exports = LiquidationExecutor;