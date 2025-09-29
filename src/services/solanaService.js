const { Connection, PublicKey } = require('@solana/web3.js');
const WebSocket = require('ws');
const config = require('../config/config');
const logger = require('../config/logger');

class SolanaService {
  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, {
      commitment: config.solana.commitment,
      wsEndpoint: config.solana.wsUrl
    });
    
    this.wsConnection = null;
    this.subscriptions = new Map();
    this.isConnected = false;
  }

  async initialize() {
    try {
      // Test RPC connection
      const version = await this.connection.getVersion();
      logger.info(`Connected to Solana RPC: ${version['solana-core']}`);
      
      // Initialize WebSocket connection
      await this.initializeWebSocket();
      
      this.isConnected = true;
      logger.info('Solana service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Solana service:', error);
      throw error;
    }
  }

  async initializeWebSocket() {
    return new Promise((resolve, reject) => {
      this.wsConnection = new WebSocket(config.solana.wsUrl);
      
      this.wsConnection.on('open', () => {
        logger.info('WebSocket connection established');
        resolve();
      });
      
      this.wsConnection.on('error', (error) => {
        logger.error('WebSocket error:', error);
        reject(error);
      });
      
      this.wsConnection.on('close', () => {
        logger.warn('WebSocket connection closed, attempting to reconnect...');
        setTimeout(() => this.initializeWebSocket(), 5000);
      });
      
      this.wsConnection.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      });
    });
  }

  handleWebSocketMessage(message) {
    if (message.method === 'logsNotification') {
      const { result } = message.params;
      this.processLogNotification(result);
    }
  }

  processLogNotification(logData) {
    const { value } = logData;
    if (!value || !value.logs) return;
    
    // Emit event for log processors
    this.emit('logs', {
      signature: value.signature,
      slot: value.context.slot,
      logs: value.logs,
      accounts: value.accounts
    });
  }

  async subscribeToProgram(programId, callback) {
    try {
      const programPubkey = new PublicKey(programId);
      
      const subscriptionId = this.connection.onLogs(
        programPubkey,
        (logs, context) => {
          callback({
            signature: logs.signature,
            slot: context.slot,
            logs: logs.logs,
            err: logs.err
          });
        },
        config.solana.commitment
      );
      
      this.subscriptions.set(programId, subscriptionId);
      logger.info(`Subscribed to program: ${programId}`);
      
      return subscriptionId;
    } catch (error) {
      logger.error(`Failed to subscribe to program ${programId}:`, error);
      throw error;
    }
  }

  async subscribeToDEXPrograms(callback) {
    const programs = [
      config.programs.raydium.amm,
      config.programs.raydium.serum,
      config.programs.orca.whirlpool,
      config.programs.orca.legacy,
      config.programs.serum.program
    ];

    const subscriptions = [];
    
    for (const programId of programs) {
      try {
        const subscriptionId = await this.subscribeToProgram(programId, callback);
        subscriptions.push({ programId, subscriptionId });
      } catch (error) {
        logger.error(`Failed to subscribe to DEX program ${programId}:`, error);
      }
    }
    
    logger.info(`Subscribed to ${subscriptions.length} DEX programs`);
    return subscriptions;
  }

  async unsubscribeFromProgram(programId) {
    const subscriptionId = this.subscriptions.get(programId);
    if (subscriptionId) {
      await this.connection.removeOnLogsListener(subscriptionId);
      this.subscriptions.delete(programId);
      logger.info(`Unsubscribed from program: ${programId}`);
    }
  }

  async getTransaction(signature) {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      return transaction;
    } catch (error) {
      logger.error(`Failed to get transaction ${signature}:`, error);
      return null;
    }
  }

  async getAccountInfo(publicKey) {
    try {
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(publicKey));
      return accountInfo;
    } catch (error) {
      logger.error(`Failed to get account info for ${publicKey}:`, error);
      return null;
    }
  }

  async getCurrentSlot() {
    try {
      return await this.connection.getSlot();
    } catch (error) {
      logger.error('Failed to get current slot:', error);
      return null;
    }
  }

  async getRecentBlockhash() {
    try {
      const { blockhash } = await this.connection.getLatestBlockhash();
      return blockhash;
    } catch (error) {
      logger.error('Failed to get recent blockhash:', error);
      return null;
    }
  }

  disconnect() {
    // Unsubscribe from all programs
    for (const [programId] of this.subscriptions) {
      this.unsubscribeFromProgram(programId);
    }
    
    // Close WebSocket connection
    if (this.wsConnection) {
      this.wsConnection.close();
    }
    
    this.isConnected = false;
    logger.info('Solana service disconnected');
  }
}

// Add EventEmitter functionality
const EventEmitter = require('events');
Object.setPrototypeOf(SolanaService.prototype, EventEmitter.prototype);
Object.setPrototypeOf(SolanaService, EventEmitter);

module.exports = SolanaService;