const { Connection, Keypair, Transaction, VersionedTransaction } = require('@solana/web3.js');
const axios = require('axios');

class JitoConnectionService {
  constructor() {
    this.enabled = process.env.JITO_ENABLED === 'true';
    this.blockEngineUrl = process.env.JITO_BLOCK_ENGINE_URL;
    this.tipAccount = process.env.JITO_TIP_ACCOUNT;
    this.minTip = parseInt(process.env.JITO_MIN_TIP_LAMPORTS) || 10000;
    this.maxTip = parseInt(process.env.JITO_MAX_TIP_LAMPORTS) || 100000;
    this.authKeypair = null;
    
    if (this.enabled && process.env.JITO_AUTH_KEYPAIR) {
      try {
        const keypairData = JSON.parse(process.env.JITO_AUTH_KEYPAIR);
        this.authKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
      } catch (error) {
        console.error('Failed to load Jito auth keypair:', error.message);
        this.enabled = false;
      }
    }
  }

  isEnabled() {
    return this.enabled && this.blockEngineUrl && this.authKeypair;
  }

  async submitBundle(transactions, tipLamports = null) {
    if (!this.isEnabled()) {
      throw new Error('Jito is not enabled or configured');
    }

    const tip = tipLamports || this.calculateOptimalTip(transactions.length);
    
    try {
      const response = await axios.post(
        `${this.blockEngineUrl}/api/v1/bundles`,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'sendBundle',
          params: [transactions.map(tx => tx.serialize().toString('base64'))]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        bundleId: response.data.result,
        tip,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Jito bundle submission error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getBundleStatus(bundleId) {
    if (!this.isEnabled()) {
      throw new Error('Jito is not enabled');
    }

    try {
      const response = await axios.post(
        `${this.blockEngineUrl}/api/v1/bundles`,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'getBundleStatuses',
          params: [[bundleId]]
        }
      );

      const status = response.data.result?.value?.[0];
      return {
        bundleId,
        status: status?.confirmation_status || 'unknown',
        slot: status?.slot,
        err: status?.err
      };
    } catch (error) {
      return {
        bundleId,
        status: 'error',
        error: error.message
      };
    }
  }

  calculateOptimalTip(transactionCount) {
    const baseTip = this.minTip;
    const scaleFactor = Math.min(transactionCount, 5);
    return Math.min(baseTip * scaleFactor, this.maxTip);
  }

  getConnectionInfo() {
    return {
      enabled: this.enabled,
      blockEngineUrl: this.blockEngineUrl,
      tipAccount: this.tipAccount,
      minTip: this.minTip,
      maxTip: this.maxTip,
      authenticated: !!this.authKeypair
    };
  }
}

module.exports = new JitoConnectionService();
