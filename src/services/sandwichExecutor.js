const { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  Keypair,
  ComputeBudgetProgram,
  SystemProgram
} = require('@solana/web3.js');
const config = require('../config/config');
const logger = require('../config/logger');
const pool = require('../config/database');
const EventEmitter = require('events');

class SandwichExecutor extends EventEmitter {
  constructor() {
    super();
    this.connection = new Connection(config.solana.rpcUrl, config.solana.commitment);
    this.isExecuting = false;
    this.executionQueue = [];
    this.maxConcurrentSandwiches = 2;
    this.currentExecutions = 0;
    
    // Execution configuration
    this.config = {
      maxGasPerTransaction: 0.03,    // Maximum 0.03 SOL per transaction
      confirmationTimeout: 20000,    // 20 seconds for confirmation
      retryAttempts: 2,              // Retry failed transactions
      minProfitThreshold: 0.02,      // Minimum 2% profit to execute
      maxSlippage: 0.05,             // 5% maximum slippage
      priorityFeeBoost: 3.0          // 3x priority fee for fast execution
    };
    
    // Execution statistics
    this.stats = {
      totalSandwiches: 0,
      successfulSandwiches: 0,
      failedSandwiches: 0,
      totalProfitRealized: 0,
      averageExecutionTime: 0,
      gasSpent: 0,
      mevCaptured: 0
    };
    
    // DEX instruction builders
    this.dexInstructionBuilders = {
      raydium: this.buildRaydiumSwapInstruction.bind(this),
      orca: this.buildOrcaSwapInstruction.bind(this),
      jupiter: this.buildJupiterSwapInstruction.bind(this),
      openbook: this.buildOpenBookSwapInstruction.bind(this)
    };
  }

  async start() {
    if (this.isExecuting) {
      logger.warn('Sandwich executor already running');
      return;
    }

    this.isExecuting = true;
    logger.info('\ud83e\udd6a Starting sandwich execution engine...');
    
    // Start processing queue
    this.processQueue();
    
    this.emit('executorStarted');
    logger.info('\u2705 Sandwich executor started successfully');
  }

  async stop() {
    if (!this.isExecuting) return;
    
    this.isExecuting = false;
    
    // Wait for current executions to complete
    while (this.currentExecutions > 0) {
      await this.sleep(1000);
    }
    
    this.emit('executorStopped');
    logger.info('\ud83d\uded1 Sandwich executor stopped');
  }

  async queueSandwich(opportunity) {
    if (!this.isExecuting) {
      logger.warn('Executor not running, cannot queue sandwich');
      return false;
    }

    // Pre-execution validation
    const validationResult = await this.validateSandwichOpportunity(opportunity);
    if (!validationResult.valid) {
      logger.warn(`Sandwich validation failed: ${validationResult.reason}`);
      return false;
    }

    // Add to execution queue
    this.executionQueue.push({
      ...opportunity,
      queuedAt: Date.now(),
      retryCount: 0
    });

    logger.info(`\ud83e\udd6a Queued sandwich: ${opportunity.targetDex} - ${opportunity.profitPercent.toFixed(2)}% profit`);
    this.emit('sandwichQueued', opportunity);
    
    return true;
  }

  async processQueue() {
    while (this.isExecuting) {
      try {
        // Process opportunities if we have capacity
        if (this.executionQueue.length > 0 && this.currentExecutions < this.maxConcurrentSandwiches) {
          const opportunity = this.executionQueue.shift();
          
          // Check if opportunity is still valid (not too old)
          const age = Date.now() - opportunity.queuedAt;
          if (age > 30000) { // 30 seconds max age for sandwich
            logger.warn(`Discarding stale sandwich opportunity: ${age}ms old`);
            continue;
          }

          // Execute in parallel
          this.executeSandwich(opportunity);
        }
        
        await this.sleep(50); // Check queue every 50ms for fast execution
      } catch (error) {
        logger.error('Error in sandwich queue processing:', error);
      }
    }
  }

  async executeSandwich(opportunity) {
    this.currentExecutions++;
    const startTime = Date.now();
    
    try {
      logger.info(`\u26a1 Executing sandwich: ${opportunity.targetDex} - Target: $${opportunity.targetValueUSD.toFixed(0)}`);
      
      // Step 1: Build and send front-run transaction
      const frontRunResult = await this.executeFrontRun(opportunity);
      
      if (!frontRunResult.success) {
        throw new Error(`Front-run failed: ${frontRunResult.error}`);
      }
      
      // Step 2: Monitor target transaction
      const targetResult = await this.monitorTargetTransaction(opportunity);
      
      if (!targetResult.success) {
        // Target failed, try to cancel or minimize loss
        await this.handleTargetFailure(opportunity, frontRunResult);
        throw new Error(`Target transaction failed: ${targetResult.error}`);
      }
      
      // Step 3: Execute back-run transaction
      const backRunResult = await this.executeBackRun(opportunity, frontRunResult);
      
      if (!backRunResult.success) {
        throw new Error(`Back-run failed: ${backRunResult.error}`);
      }
      
      // Calculate final results
      const executionTime = Date.now() - startTime;
      const actualProfit = await this.calculateActualProfit(frontRunResult, backRunResult, opportunity);
      
      // Update statistics
      this.stats.totalSandwiches++;
      this.stats.successfulSandwiches++;
      this.stats.totalProfitRealized += actualProfit;
      this.stats.averageExecutionTime = (
        (this.stats.averageExecutionTime * (this.stats.totalSandwiches - 1) + executionTime) / 
        this.stats.totalSandwiches
      );
      
      // Update database
      await this.updateSandwichExecution(opportunity.id, {
        status: 'executed',
        frontRunSignature: frontRunResult.signature,
        backRunSignature: backRunResult.signature,
        actualProfit,
        executionTime
      });
      
      logger.info(`\u2705 Sandwich executed successfully: Profit: ${actualProfit.toFixed(6)} SOL in ${executionTime}ms`);
      this.emit('sandwichExecuted', { opportunity, frontRunResult, backRunResult, actualProfit });
      
    } catch (error) {
      await this.handleSandwichFailure(opportunity, error);
    } finally {
      this.currentExecutions--;
    }
  }

  async executeFrontRun(opportunity) {
    try {
      // Build front-run transaction
      const transaction = await this.buildSwapTransaction(
        opportunity.frontRun,
        opportunity.targetDex,
        'front-run'
      );
      
      // Send with high priority
      const signature = await this.sendTransactionWithPriority(transaction, 'high');
      
      // Wait for confirmation
      const confirmation = await this.waitForConfirmation(signature);
      
      return {
        success: confirmation.success,
        signature,
        error: confirmation.error,
        actualAmountOut: confirmation.actualAmountOut
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async executeBackRun(opportunity, frontRunResult) {
    try {
      // Adjust back-run parameters based on front-run results
      const adjustedBackRun = this.adjustBackRunParameters(
        opportunity.backRun, 
        frontRunResult
      );
      
      // Build back-run transaction
      const transaction = await this.buildSwapTransaction(
        adjustedBackRun,
        opportunity.targetDex,
        'back-run'
      );
      
      // Send with medium priority (target should be confirmed by now)
      const signature = await this.sendTransactionWithPriority(transaction, 'medium');
      
      // Wait for confirmation
      const confirmation = await this.waitForConfirmation(signature);
      
      return {
        success: confirmation.success,
        signature,
        error: confirmation.error,
        actualAmountOut: confirmation.actualAmountOut
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async buildSwapTransaction(swapParams, dex, type) {
    try {
      // Get the appropriate instruction builder
      const instructionBuilder = this.dexInstructionBuilders[dex];
      if (!instructionBuilder) {
        throw new Error(`Unsupported DEX: ${dex}`);
      }

      // Create swap instruction
      const swapInstruction = await instructionBuilder(swapParams);
      
      // Create transaction
      const transaction = new Transaction();
      
      // Add priority fee based on type
      const priorityMultiplier = type === 'front-run' ? this.config.priorityFeeBoost : 1.0;
      const priorityFee = Math.floor(swapParams.priorityFee * 1e9 * priorityMultiplier); // Convert to lamports
      
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFee
        })
      );
      
      // Add compute unit limit
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: swapParams.gasLimit
        })
      );
      
      // Add swap instruction
      transaction.add(swapInstruction);
      
      return transaction;
      
    } catch (error) {
      throw new Error(`Failed to build ${type} transaction: ${error.message}`);
    }
  }

  async buildRaydiumSwapInstruction(swapParams) {
    // Simplified Raydium swap instruction - in production, use Raydium SDK
    const programId = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
    
    // Mock instruction data
    const instructionData = Buffer.from([
      0x09, // Swap instruction
      ...Buffer.alloc(32) // Placeholder for actual instruction data
    ]);
    
    return new TransactionInstruction({
      keys: [
        { pubkey: this.getExecutorWallet().publicKey, isSigner: true, isWritable: true },
        { pubkey: new PublicKey(swapParams.tokenIn.mint), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(swapParams.tokenOut.mint), isSigner: false, isWritable: true },
        // Add other required accounts
      ],
      programId,
      data: instructionData
    });
  }

  async buildOrcaSwapInstruction(swapParams) {
    // Simplified Orca swap instruction
    const programId = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');
    
    const instructionData = Buffer.from([0x01, ...Buffer.alloc(32)]);
    
    return new TransactionInstruction({
      keys: [
        { pubkey: this.getExecutorWallet().publicKey, isSigner: true, isWritable: true },
        { pubkey: new PublicKey(swapParams.tokenIn.mint), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(swapParams.tokenOut.mint), isSigner: false, isWritable: true },
      ],
      programId,
      data: instructionData
    });
  }

  async buildJupiterSwapInstruction(swapParams) {
    // Simplified Jupiter swap instruction
    const programId = new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
    
    const instructionData = Buffer.from([0x02, ...Buffer.alloc(32)]);
    
    return new TransactionInstruction({
      keys: [
        { pubkey: this.getExecutorWallet().publicKey, isSigner: true, isWritable: true },
        { pubkey: new PublicKey(swapParams.tokenIn.mint), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(swapParams.tokenOut.mint), isSigner: false, isWritable: true },
      ],
      programId,
      data: instructionData
    });
  }

  async buildOpenBookSwapInstruction(swapParams) {
    // Simplified OpenBook swap instruction
    const programId = new PublicKey('opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb');
    
    const instructionData = Buffer.from([0x03, ...Buffer.alloc(32)]);
    
    return new TransactionInstruction({
      keys: [
        { pubkey: this.getExecutorWallet().publicKey, isSigner: true, isWritable: true },
        { pubkey: new PublicKey(swapParams.tokenIn.mint), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(swapParams.tokenOut.mint), isSigner: false, isWritable: true },
      ],
      programId,
      data: instructionData
    });
  }

  getExecutorWallet() {
    // In production, load from secure key storage
    if (!this.wallet) {
      this.wallet = Keypair.generate();
      logger.warn('\u26a0\ufe0f Using generated wallet for demo. In production, use secure key management.');
    }
    return this.wallet;
  }

  getStats() {
    return {
      ...this.stats,
      isExecuting: this.isExecuting,
      queueLength: this.executionQueue.length,
      currentExecutions: this.currentExecutions,
      successRate: this.stats.totalSandwiches > 0 ? 
        (this.stats.successfulSandwiches / this.stats.totalSandwiches * 100).toFixed(2) + '%' : '0%'
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SandwichExecutor;