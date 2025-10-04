const { Connection, clusterApiUrl } = require('@solana/web3.js');

const config = {
  // Database configuration
  database: {
    host: '149.102.159.118',
    port: 54327,
    user: 'postgres',
    password: 'blqLo6a8hLaqLsUa5iTxScYNuauQ5lLnigwNeRWkCjLQgxl2s099OwG7vEZjH6uf',
    database: 'postgres'
  },
  
  // Solana configuration
  solana: {
    network: process.env.SOLANA_NETWORK || 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL || (process.env.SOLANA_NETWORK === 'mainnet-beta' ? 
      clusterApiUrl('mainnet-beta') : clusterApiUrl('devnet')),
    wsUrl: process.env.SOLANA_WS_URL || (process.env.SOLANA_NETWORK === 'mainnet-beta' ? 
      'wss://api.mainnet-beta.solana.com' : 'wss://api.devnet.solana.com'),
    commitment: 'confirmed',
    enablePolling: true, // Fallback polling for low-activity networks
    pollingInterval: 45000, // 45 seconds (increased from 10s)
    maxConcurrentRequests: 2, // Limit concurrent requests
    requestsPerSecond: 3 // Conservative rate limit
  },
  
  // DEX Program IDs
  programs: {
    raydium: {
      amm: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
      serum: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
    },
    orca: {
      whirlpool: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
      legacy: '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP'
    },
    serum: {
      program: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'
    },
    jupiter: {
      v4: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
      v6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
      perps: 'PERPHjGBqRHArX4DySjwM6UJHiycKwGPABe2zSMiPZUi'
    },
    openbook: {
      v1: 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
      v2: 'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb'
    },
    meteora: {
      pools: 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB'
    }
  },
  
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost'
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // MEV configuration - Lowered thresholds for maximum opportunity detection
  mev: {
    minProfitThreshold: 0.001, // 0.001 SOL minimum profit (was 0.01)
    maxSlippage: 0.01, // 1% max slippage (was 0.5%)
    gasBuffer: 1.1, // 10% gas buffer (was 20%)
    
    // Arbitrage thresholds
    arbitrage: {
      minPriceDifferencePercent: 0.1, // 0.1% minimum (was 0.5%)
      minVolumeUSD: 10, // $10 minimum volume (was $100)
      maxRiskScore: 8 // Allow higher risk (was 5)
    },
    
    // Sandwich attack thresholds
    sandwich: {
      minVolumeUSD: 100, // $100 minimum (was $10,000)
      maxSlippage: 0.02, // 2% max slippage
      profitMultiplier: 0.005 // 0.5% of transaction value (was 0.1%)
    },
    
    // Detection sensitivity
    detection: {
      enableLowValueTransactions: true,
      minTransactionValue: 1, // $1 minimum
      enableAllTokenPairs: true,
      detectPartialSwaps: true
    }
  }
};

module.exports = config;