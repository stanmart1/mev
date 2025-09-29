const { Connection, PublicKey } = require('@solana/web3.js');
const config = require('../config/config');
const logger = require('../config/logger');

// Simple BN replacement for big numbers
class BN {
  constructor(value) {
    this.value = typeof value === 'string' ? parseInt(value) : value;
  }
  
  toNumber() {
    return this.value;
  }
}

class ProtocolAdapter {
  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, config.solana.commitment);
    
    // Protocol-specific configurations
    this.protocolConfigs = {
      solend: {
        programId: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo',
        mainPool: '4UpD2fh7xH3VP9QQaXtsS1YY3bxzWhtfpks7FatyKvdY',
        reserves: {
          'SOL': 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
          'USDC': 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
          'USDT': '8UviNr47S8eL6J3WfDxMRa3hvLta1VDJwNWqsDgtN3Cv',
          'ETH': '5suXmvdbKQ98VonxGCXqViuWRu8k4zgZRHHxJBmm8aFe',
          'BTC': '5suXmvdbKQ98VonxGCXqViuWRu8k4zgZRHHxJBmm8aFe'
        }
      },
      portFinance: {
        programId: 'Port7uDVFX5mULp7WJjj9g69nf1B1UoNMW3HBQcMFcZ',
        mainPool: '8FaEVbU7BeBMKBsYo4WUn56k8F1BhbqZYeA1XRkKwdFP',
        reserves: {
          'SOL': 'H25RM4pDTQZj8rqhz5QwP4fPUQBPx3qpMhJqfPGX6bSb',
          'USDC': 'ErByZ7LYfvUmtp8mgO98Bq7mR6Y9UJJrJdmtTe6HD4vH',
          'USDT': 'ErByZ7LYfvUmtp8mgO98Bq7mR6Y9UJJrJdmtTe6HD4vH'
        }
      },
      francium: {
        programId: 'Fran2GkrBY7xrNfYGK9KAAhsq3w4e8ZmA5J9oHjGe2jf',
        mainPool: '9kxEJ4zKKFR9R1qxGKT3o6TqjqY1CXEV8jhFGVHhkMh',
        reserves: {
          'SOL': 'G9YFQCy4LewmLKdJeJNYnwG1b1u1kL9qzAcKUVgPXNJ',
          'USDC': 'G9YFQCy4LewmLKdJeJNYnwG1b1u1kL9qzAcKUVgPXNJ'
        }
      }
    };
    
    // Asset mint addresses
    this.assetMints = {
      'SOL': 'So11111111111111111111111111111111111111112',
      'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      'ETH': '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk',
      'BTC': '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
      'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      'SRM': 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt'
    };
    
    // Price cache
    this.priceCache = new Map();
    this.lastPriceUpdate = 0;
    this.PRICE_CACHE_DURATION = 60000; // 1 minute
  }

  async getObligations(protocol) {
    try {
      const config = this.protocolConfigs[protocol];
      if (!config) {
        throw new Error(`Unsupported protocol: ${protocol}`);
      }

      const programId = new PublicKey(config.programId);
      
      // Get all program accounts (simplified approach)
      const accounts = await this.connection.getProgramAccounts(programId, {
        filters: [
          {
            dataSize: 1300 // Approximate size for obligation accounts
          }
        ]
      });

      const obligations = [];
      for (const account of accounts) {
        try {
          const obligationData = await this.parseObligationAccount(account, protocol);
          if (obligationData && obligationData.collaterals.length > 0) {
            obligations.push({
              pubkey: account.pubkey.toString(),
              protocol,
              ...obligationData
            });
          }
        } catch (error) {
          logger.debug(`Error parsing obligation account: ${error.message}`);
        }
      }

      return obligations;
    } catch (error) {
      logger.error(`Error fetching obligations for ${protocol}:`, error);
      return [];
    }
  }

  async parseObligationAccount(account, protocol) {
    try {
      // Simplified parsing - in production, use actual protocol IDLs
      // This is a mock implementation that simulates real obligation data
      
      const mockObligations = [
        {
          owner: 'DemoUser1234567890abcdef1234567890abcdef12',
          collaterals: [
            {
              mint: this.assetMints.SOL,
              symbol: 'SOL',
              amount: new BN('2000000000'), // 2 SOL
              marketValue: new BN('40000000') // $40 (assuming $20/SOL)
            }
          ],
          borrows: [
            {
              mint: this.assetMints.USDC,
              symbol: 'USDC',
              amount: new BN('35000000'), // 35 USDC
              marketValue: new BN('35000000') // $35
            }
          ],
          lastUpdate: Date.now()
        },
        {
          owner: 'DemoUser2abcdef1234567890abcdef1234567890',
          collaterals: [
            {
              mint: this.assetMints.ETH,
              symbol: 'ETH',
              amount: new BN('100000000'), // 0.1 ETH
              marketValue: new BN('160000000') // $160 (assuming $1600/ETH)
            }
          ],
          borrows: [
            {
              mint: this.assetMints.USDT,
              symbol: 'USDT',
              amount: new BN('140000000'), // 140 USDT
              marketValue: new BN('140000000') // $140
            }
          ],
          lastUpdate: Date.now()
        },
        {
          owner: 'DemoUser3xyz1234567890abcdef1234567890abc',
          collaterals: [
            {
              mint: this.assetMints.BTC,
              symbol: 'BTC',
              amount: new BN('50000000'), // 0.05 BTC
              marketValue: new BN('150000000') // $1500 (assuming $30000/BTC)
            }
          ],
          borrows: [
            {
              mint: this.assetMints.USDC,
              symbol: 'USDC',
              amount: new BN('130000000'), // 130 USDC
              marketValue: new BN('130000000') // $130
            }
          ],
          lastUpdate: Date.now()
        }
      ];

      // Return a random mock obligation to simulate varying data
      const randomIndex = Math.floor(Math.random() * mockObligations.length);
      return mockObligations[randomIndex];
      
    } catch (error) {
      logger.debug('Error parsing obligation account:', error.message);
      return null;
    }
  }

  async getAssetPrice(mint) {
    try {
      const now = Date.now();
      
      // Check cache first
      if (this.priceCache.has(mint) && 
          (now - this.lastPriceUpdate) < this.PRICE_CACHE_DURATION) {
        return this.priceCache.get(mint);
      }

      // Mock prices for testing - in production, use Jupiter/Birdeye APIs
      const mockPrices = {
        [this.assetMints.SOL]: 20.0,
        [this.assetMints.USDC]: 1.0,
        [this.assetMints.USDT]: 1.0,
        [this.assetMints.ETH]: 1600.0,
        [this.assetMints.BTC]: 30000.0,
        [this.assetMints.RAY]: 0.5,
        [this.assetMints.SRM]: 0.3
      };

      const price = mockPrices[mint] || 1.0;
      
      // Add some random variation (±2%) to simulate market movement
      const variation = (Math.random() - 0.5) * 0.04; // ±2%
      const finalPrice = price * (1 + variation);
      
      this.priceCache.set(mint, finalPrice);
      this.lastPriceUpdate = now;
      
      return finalPrice;
    } catch (error) {
      logger.error('Error fetching asset price:', error);
      return 1.0; // Default price
    }
  }

  async getReserveInfo(protocol, mint) {
    try {
      const config = this.protocolConfigs[protocol];
      if (!config) {
        throw new Error(`Unsupported protocol: ${protocol}`);
      }

      // Mock reserve info - in production, fetch from actual reserve accounts
      const symbol = Object.keys(this.assetMints).find(
        key => this.assetMints[key] === mint
      ) || 'UNKNOWN';

      return {
        mint,
        symbol,
        liquidationThreshold: this.getLiquidationThreshold(symbol),
        liquidationBonus: this.getLiquidationBonus(symbol),
        maxLTV: this.getMaxLTV(symbol),
        totalDeposits: '1000000000000', // Mock total deposits
        totalBorrows: '800000000000',   // Mock total borrows
        utilizationRate: 0.8,
        borrowRate: 0.05,
        supplyRate: 0.03
      };
    } catch (error) {
      logger.error('Error fetching reserve info:', error);
      return null;
    }
  }

  getLiquidationThreshold(symbol) {
    const thresholds = {
      'SOL': 0.85,
      'USDC': 0.95,
      'USDT': 0.95,
      'ETH': 0.85,
      'BTC': 0.80,
      'RAY': 0.70,
      'SRM': 0.70
    };
    return thresholds[symbol] || 0.60;
  }

  getLiquidationBonus(symbol) {
    const bonuses = {
      'SOL': 0.05,
      'USDC': 0.05,
      'USDT': 0.05,
      'ETH': 0.075,
      'BTC': 0.10,
      'RAY': 0.10,
      'SRM': 0.10
    };
    return bonuses[symbol] || 0.15;
  }

  getMaxLTV(symbol) {
    const ltvs = {
      'SOL': 0.80,
      'USDC': 0.90,
      'USDT': 0.90,
      'ETH': 0.80,
      'BTC': 0.75,
      'RAY': 0.60,
      'SRM': 0.60
    };
    return ltvs[symbol] || 0.50;
  }

  async simulateLiquidation(obligation, liquidationAmount, collateralMint) {
    try {
      const collateral = obligation.collaterals.find(c => c.mint === collateralMint);
      if (!collateral) {
        throw new Error('Collateral not found');
      }

      const reserveInfo = await this.getReserveInfo(obligation.protocol, collateralMint);
      const collateralPrice = await this.getAssetPrice(collateralMint);
      
      // Calculate liquidation details
      const collateralAmount = liquidationAmount / collateralPrice;
      const bonusAmount = collateralAmount * reserveInfo.liquidationBonus;
      const totalCollateralSeized = collateralAmount + bonusAmount;
      
      // Estimate gas costs
      const baseFee = 0.000005; // 5k lamports
      const computeUnits = 200000; // Estimated compute units for liquidation
      const priorityFee = 0.00001; // 10k lamports priority fee
      const totalGasCost = baseFee + (computeUnits * 0.000000001) + priorityFee;
      
      return {
        liquidationAmount,
        collateralSeized: totalCollateralSeized,
        bonusReceived: bonusAmount,
        gasCostSOL: totalGasCost,
        grossProfitUSD: bonusAmount * collateralPrice,
        netProfitUSD: (bonusAmount * collateralPrice) - (totalGasCost * 20), // Assuming SOL = $20
        feasible: totalCollateralSeized <= collateral.amount / Math.pow(10, 9)
      };
    } catch (error) {
      logger.error('Error simulating liquidation:', error);
      return null;
    }
  }

  async getHealthFactor(obligation) {
    try {
      let totalCollateralValue = 0;
      let totalBorrowValue = 0;
      let weightedLiquidationThreshold = 0;

      // Calculate total collateral value
      for (const collateral of obligation.collaterals) {
        const price = await this.getAssetPrice(collateral.mint);
        const decimals = collateral.symbol === 'USDC' || collateral.symbol === 'USDT' ? 6 : 9;
        const value = (collateral.amount.toNumber() / Math.pow(10, decimals)) * price;
        
        const threshold = this.getLiquidationThreshold(collateral.symbol);
        
        totalCollateralValue += value;
        weightedLiquidationThreshold += value * threshold;
      }

      // Calculate total borrow value
      for (const borrow of obligation.borrows) {
        const price = await this.getAssetPrice(borrow.mint);
        const decimals = borrow.symbol === 'USDC' || borrow.symbol === 'USDT' ? 6 : 9;
        const value = (borrow.amount.toNumber() / Math.pow(10, decimals)) * price;
        
        totalBorrowValue += value;
      }

      if (totalBorrowValue === 0) return Number.MAX_SAFE_INTEGER;
      if (totalCollateralValue === 0) return 0;

      const avgLiquidationThreshold = weightedLiquidationThreshold / totalCollateralValue;
      const healthFactor = (totalCollateralValue * avgLiquidationThreshold) / totalBorrowValue;

      return healthFactor;
    } catch (error) {
      logger.error('Error calculating health factor:', error);
      return 0;
    }
  }

  getSupportedProtocols() {
    return Object.keys(this.protocolConfigs);
  }

  getProtocolStats() {
    return Object.entries(this.protocolConfigs).map(([name, config]) => ({
      name,
      programId: config.programId,
      supportedAssets: Object.keys(config.reserves || {}),
      mainPool: config.mainPool
    }));
  }
}

module.exports = ProtocolAdapter;