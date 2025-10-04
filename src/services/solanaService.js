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
      
      // Initialize WebSocket connection (non-blocking)
      this.initializeWebSocket().catch(err => {
        logger.warn('WebSocket initialization failed, will retry:', err.message);
      });
      
      this.isConnected = true;
      logger.info('Solana service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Solana service:', error);
      throw error;
    }
  }

  async initializeWebSocket() {
    return new Promise((resolve) => {
      try {
        this.wsConnection = new WebSocket(config.solana.wsUrl, {
          handshakeTimeout: 10000,
          perMessageDeflate: false
        });
        
        const connectionTimeout = setTimeout(() => {
          logger.warn('WebSocket connection timeout, will retry...');
          if (this.wsConnection) {
            this.wsConnection.terminate();
          }
          resolve(); // Resolve anyway to not block initialization
        }, 15000);
        
        this.wsConnection.on('open', () => {
          clearTimeout(connectionTimeout);
          logger.info('WebSocket connection established');
          this.wsRetryCount = 0;
          resolve();
        });
        
        this.wsConnection.on('error', (error) => {
          clearTimeout(connectionTimeout);
          logger.error('WebSocket error:', error.message || error);
          // Don't reject, just log and continue
        });
        
        this.wsConnection.on('close', (code, reason) => {
          clearTimeout(connectionTimeout);
          logger.warn(`WebSocket connection closed (code: ${code}, reason: ${reason || 'none'})`);
          this.scheduleReconnect();
        });
        
        this.wsConnection.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.handleWebSocketMessage(message);
          } catch (error) {
            logger.error('Error parsing WebSocket message:', error);
          }
        });
      } catch (error) {
        logger.error('Failed to create WebSocket connection:', error);
        resolve(); // Resolve anyway to not block initialization
      }
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.wsRetryCount = (this.wsRetryCount || 0) + 1;
    const delay = Math.min(5000 * this.wsRetryCount, 60000); // Max 60 seconds
    
    logger.info(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.wsRetryCount})`);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.wsRetryCount <= 10) { // Max 10 retries
        this.initializeWebSocket().catch(err => {
          logger.error('WebSocket reconnect failed:', err);
        });
      } else {
        logger.error('Max WebSocket reconnect attempts reached, giving up');
      }
    }, delay);
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
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Unsubscribe from all programs
    for (const [programId] of this.subscriptions) {
      this.unsubscribeFromProgram(programId);
    }
    
    // Close WebSocket connection
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
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