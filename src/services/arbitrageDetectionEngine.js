const pool = require('../config/database');
const config = require('../config/config');
const logger = require('../config/logger');
const Big = require('big.js');

class ArbitrageDetectionEngine {
  constructor() {
    this.dexFees = {
      raydium: 0.0025,    // 0.25%
      orca: 0.003,        // 0.30%
      serum: 0.0022,      // 0.22%
      jupiter: 0.0020,    // 0.20% (aggregator advantage)
      meteora: 0.0025,    // 0.25%
      openbook: 0.0022    // 0.22%
    };
    
    this.slippageEstimates = {
      raydium: { base: 0.001, multiplier: 0.0001 },   // 0.1% + 0.01% per $1k
      orca: { base: 0.0008, multiplier: 0.00008 },    // 0.08% + 0.008% per $1k  
      serum: { base: 0.0015, multiplier: 0.0002 },    // 0.15% + 0.02% per $1k
      jupiter: { base: 0.0005, multiplier: 0.00005 }, // 0.05% + 0.005% per $1k (best routing)
      meteora: { base: 0.0006, multiplier: 0.00006 }, // 0.06% + 0.006% per $1k (stable)
      openbook: { base: 0.0012, multiplier: 0.0001 }  // 0.12% + 0.01% per $1k
    };
    
    this.gasEstimates = {
      simple: 0.000005,    // 5,000 lamports = 0.000005 SOL
      complex: 0.00001,    // 10,000 lamports for multi-hop
      jupiter: 0.000015    // 15,000 lamports for aggregation
    };
  }

  async detectArbitrageOpportunities() {
    const client = await pool.connect();
    
    try {
      // Get recent price data from all DEXs (last 2 minutes)
      const priceQuery = `
        SELECT 
          dex_name,
          token_mint_a,
          token_mint_b,
          token_symbol_a,
          token_symbol_b,
          price,
          volume_24h_usd,
          block_slot,
          timestamp,
          pool_address
        FROM dex_prices 
        WHERE timestamp > NOW() - INTERVAL '2 minutes'
        AND price > 0
        AND volume_24h_usd > 0
        ORDER BY timestamp DESC
      `;
      
      const priceData = await client.query(priceQuery);
      
      if (priceData.rows.length < 2) {
        logger.info('Insufficient price data for arbitrage detection');
        return [];
      }
      
      // Group prices by token pairs
      const tokenPairs = this.groupPricesByTokenPairs(priceData.rows);
      
      const opportunities = [];
      
      // Analyze each token pair for arbitrage opportunities
      for (const [pairKey, dexPrices] of tokenPairs.entries()) {
        if (dexPrices.length < 2) continue; // Need at least 2 DEXs
        
        const pairOpportunities = await this.analyzePairForArbitrage(pairKey, dexPrices);
        opportunities.push(...pairOpportunities);
      }
      
      logger.info(`Arbitrage detection complete: ${opportunities.length} opportunities found`);
      return opportunities;
      
    } catch (error) {
      logger.error('Error in arbitrage detection:', error);
      return [];
    } finally {
      client.release();
    }
  }

  groupPricesByTokenPairs(priceData) {
    const tokenPairs = new Map();
    
    for (const price of priceData) {
      // Create consistent pair key (always order tokens alphabetically)
      const tokenA = price.token_mint_a;
      const tokenB = price.token_mint_b;
      const pairKey = tokenA < tokenB ? `${tokenA}/${tokenB}` : `${tokenB}/${tokenA}`;
      
      if (!tokenPairs.has(pairKey)) {
        tokenPairs.set(pairKey, []);
      }
      
      tokenPairs.get(pairKey).push({
        dex: price.dex_name,
        price: parseFloat(price.price),
        volume: parseFloat(price.volume_24h_usd),
        tokenA: price.token_mint_a,
        tokenB: price.token_mint_b,
        symbolA: price.token_symbol_a,
        symbolB: price.token_symbol_b,
        timestamp: price.timestamp,
        poolAddress: price.pool_address,
        slot: price.block_slot
      });
    }
    
    return tokenPairs;
  }

  async analyzePairForArbitrage(pairKey, dexPrices) {
    const opportunities = [];
    
    try {
      // Sort prices to find highest and lowest
      const sortedPrices = dexPrices.sort((a, b) => b.price - a.price);
      const highestPrice = sortedPrices[0];
      const lowestPrice = sortedPrices[sortedPrices.length - 1];
      
      // Skip if same DEX
      if (highestPrice.dex === lowestPrice.dex) return opportunities;
      
      // Calculate raw price difference
      const priceDifference = highestPrice.price - lowestPrice.price;
      const priceDifferencePercent = (priceDifference / lowestPrice.price) * 100;
      
      // Skip if below minimum threshold
      if (priceDifferencePercent < config.mev.arbitrage.minPriceDifferencePercent) {
        return opportunities;
      }
      
      // Calculate potential trade sizes based on available volume
      const tradeSizes = this.calculateTradeSizes(lowestPrice.volume, highestPrice.volume);
      
      for (const tradeSize of tradeSizes) {
        const arbitrageCalc = await this.calculateArbitrageProfit(
          lowestPrice,  // Buy here (lower price)
          highestPrice, // Sell here (higher price)
          tradeSize
        );
        
        if (arbitrageCalc.netProfitSOL > config.mev.minProfitThreshold) {
          const opportunity = await this.createArbitrageOpportunity(
            pairKey,
            lowestPrice,
            highestPrice,
            arbitrageCalc,
            tradeSize
          );
          
          if (opportunity) {
            opportunities.push(opportunity);
          }
        }
      }
      
    } catch (error) {
      logger.error(`Error analyzing pair ${pairKey}:`, error);
    }
    
    return opportunities;
  }

  calculateTradeSizes(volumeA, volumeB) {
    // Calculate multiple trade sizes based on available volume
    const maxVolume = Math.min(volumeA, volumeB);
    const tradeSizes = [];
    
    // Different percentage allocations
    const allocations = [0.1, 0.25, 0.5, 1.0]; // 10%, 25%, 50%, 100%
    
    for (const allocation of allocations) {
      const size = maxVolume * allocation;
      if (size >= config.mev.arbitrage.minVolumeUSD) {
        tradeSizes.push(size);
      }
    }
    
    // Always include minimum size if none qualify
    if (tradeSizes.length === 0) {
      tradeSizes.push(config.mev.arbitrage.minVolumeUSD);
    }
    
    return tradeSizes;
  }

  async calculateArbitrageProfit(buyDex, sellDex, tradeSizeUSD) {
    try {
      // Convert trade size to SOL equivalent (approximate)
      const solPrice = 100; // Approximate SOL price in USD
      const tradeSizeSOL = tradeSizeUSD / solPrice;
      
      // Calculate tokens received after buying on lower price DEX
      const buyPrice = new Big(buyDex.price);
      const sellPrice = new Big(sellDex.price);
      
      // Step 1: Calculate slippage for buy transaction
      const buySlippage = this.calculateSlippage(buyDex.dex, tradeSizeUSD);
      const effectiveBuyPrice = buyPrice.mul(new Big(1).plus(buySlippage));
      
      // Step 2: Calculate slippage for sell transaction  
      const sellSlippage = this.calculateSlippage(sellDex.dex, tradeSizeUSD);
      const effectiveSellPrice = sellPrice.mul(new Big(1).minus(sellSlippage));
      
      // Step 3: Calculate trading fees
      const buyFee = this.dexFees[buyDex.dex] || 0.0025;
      const sellFee = this.dexFees[sellDex.dex] || 0.0025;
      
      // Step 4: Calculate tokens received after buy
      const tokensReceived = new Big(tradeSizeSOL)
        .div(effectiveBuyPrice)
        .mul(new Big(1).minus(buyFee));
      
      // Step 5: Calculate SOL received after sell
      const solReceived = tokensReceived
        .mul(effectiveSellPrice)
        .mul(new Big(1).minus(sellFee));
      
      // Step 6: Calculate gas costs
      const gasCost = this.calculateGasCost(buyDex.dex, sellDex.dex);
      
      // Step 7: Calculate net profit
      const grossProfit = solReceived.minus(tradeSizeSOL);
      const netProfit = grossProfit.minus(gasCost);
      
      // Step 8: Calculate profit percentage
      const profitPercent = netProfit.div(tradeSizeSOL).mul(100);
      
      // Step 9: Calculate execution risk score
      const riskScore = this.calculateExecutionRisk(
        buyDex,
        sellDex,
        tradeSizeUSD,
        buySlippage + sellSlippage
      );
      
      return {
        tradeSizeUSD,
        tradeSizeSOL: parseFloat(tradeSizeSOL.toFixed(6)),
        buyPrice: parseFloat(buyPrice.toFixed(8)),
        sellPrice: parseFloat(sellPrice.toFixed(8)),
        effectiveBuyPrice: parseFloat(effectiveBuyPrice.toFixed(8)),
        effectiveSellPrice: parseFloat(effectiveSellPrice.toFixed(8)),
        buySlippage: parseFloat((buySlippage * 100).toFixed(4)),
        sellSlippage: parseFloat((sellSlippage * 100).toFixed(4)),
        buyFee: parseFloat((buyFee * 100).toFixed(4)),
        sellFee: parseFloat((sellFee * 100).toFixed(4)),
        tokensReceived: parseFloat(tokensReceived.toFixed(6)),
        solReceived: parseFloat(solReceived.toFixed(6)),
        gasCost: parseFloat(gasCost.toFixed(6)),
        grossProfitSOL: parseFloat(grossProfit.toFixed(6)),
        netProfitSOL: parseFloat(netProfit.toFixed(6)),
        profitPercent: parseFloat(profitPercent.toFixed(4)),
        riskScore,
        roi: parseFloat((netProfit.div(tradeSizeSOL).mul(100)).toFixed(2))
      };
      
    } catch (error) {
      logger.error('Error calculating arbitrage profit:', error);
      return null;
    }
  }

  calculateSlippage(dex, tradeSizeUSD) {
    const slippageConfig = this.slippageEstimates[dex] || this.slippageEstimates.raydium;
    const tradeSizeK = tradeSizeUSD / 1000; // Convert to thousands
    
    // Base slippage + size-dependent slippage
    return slippageConfig.base + (slippageConfig.multiplier * tradeSizeK);
  }

  calculateGasCost(buyDex, sellDex) {
    // Base gas cost
    let gasCost = this.gasEstimates.simple * 2; // Two transactions
    
    // Add complexity cost for different DEX types
    if (buyDex === 'jupiter' || sellDex === 'jupiter') {
      gasCost += this.gasEstimates.jupiter;
    }
    
    if (buyDex !== sellDex) {
      gasCost += this.gasEstimates.complex; // Cross-DEX complexity
    }
    
    return gasCost;
  }

  calculateExecutionRisk(buyDex, sellDex, tradeSizeUSD, totalSlippage) {
    let riskScore = 1; // Base risk
    
    // Size risk
    if (tradeSizeUSD > 10000) riskScore += 2;
    else if (tradeSizeUSD > 1000) riskScore += 1;
    
    // Slippage risk
    if (totalSlippage > 0.02) riskScore += 3; // High slippage
    else if (totalSlippage > 0.01) riskScore += 2;
    else if (totalSlippage > 0.005) riskScore += 1;
    
    // DEX risk (some DEXs are more reliable)
    const riskLevels = {
      jupiter: 0,   // Most reliable (aggregator)
      raydium: 1,   // Very reliable
      orca: 1,      // Very reliable
      meteora: 1,   // Stable swaps
      serum: 2,     // Order book risk
      openbook: 2,  // Order book risk
      unknown: 3    // Highest risk
    };
    
    riskScore += riskLevels[buyDex.dex] || 3;
    riskScore += riskLevels[sellDex.dex] || 3;
    
    // Market timing risk
    const now = new Date();
    const buyAge = (now - new Date(buyDex.timestamp)) / 1000; // seconds
    const sellAge = (now - new Date(sellDex.timestamp)) / 1000;
    
    if (Math.max(buyAge, sellAge) > 60) riskScore += 2; // Data older than 1 minute
    else if (Math.max(buyAge, sellAge) > 30) riskScore += 1; // Data older than 30 seconds
    
    return Math.min(riskScore, 10); // Cap at 10
  }

  async createArbitrageOpportunity(pairKey, buyDex, sellDex, calculation, tradeSizeUSD) {
    const client = await pool.connect();
    
    try {
      const opportunityQuery = `
        INSERT INTO mev_opportunities (
          opportunity_type, primary_dex, secondary_dex,
          token_mint_a, token_mint_b, token_symbol_a, token_symbol_b,
          price_a, price_b, volume_usd,
          estimated_profit_sol, estimated_profit_usd, 
          gas_cost_sol, net_profit_sol, profit_percentage,
          slippage_estimate, execution_risk_score, competition_probability,
          status, block_slot
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING id
      `;
      
      // Calculate competition probability based on profit size
      const competitionProb = this.calculateCompetitionProbability(calculation.profitPercent);
      
      const values = [
        'arbitrage',
        buyDex.dex,
        sellDex.dex,
        buyDex.tokenA.substring(0, 44),
        buyDex.tokenB.substring(0, 44),
        buyDex.symbolA ? buyDex.symbolA.substring(0, 20) : 'UNK',
        buyDex.symbolB ? buyDex.symbolB.substring(0, 20) : 'UNK',
        calculation.effectiveBuyPrice,
        calculation.effectiveSellPrice,
        tradeSizeUSD,
        calculation.grossProfitSOL,
        calculation.grossProfitSOL * 100, // Approximate USD
        calculation.gasCost,
        calculation.netProfitSOL,
        calculation.profitPercent,
        (calculation.buySlippage + calculation.sellSlippage) / 100,
        calculation.riskScore,
        competitionProb,
        'detected',
        Math.max(buyDex.slot, sellDex.slot)
      ];
      
      const result = await client.query(opportunityQuery, values);
      
      // Log detailed arbitrage opportunity
      logger.info(`🎯 Arbitrage Opportunity Created:`, {
        id: result.rows[0].id,
        pair: pairKey,
        buyDex: buyDex.dex,
        sellDex: sellDex.dex,
        buyPrice: calculation.effectiveBuyPrice,
        sellPrice: calculation.effectiveSellPrice,
        tradeSizeUSD,
        netProfitSOL: calculation.netProfitSOL,
        profitPercent: calculation.profitPercent,
        roi: calculation.roi,
        riskScore: calculation.riskScore,
        totalSlippage: `${(calculation.buySlippage + calculation.sellSlippage).toFixed(2)}%`
      });
      
      return {
        id: result.rows[0].id,
        type: 'arbitrage',
        pair: pairKey,
        buyDex: buyDex.dex,
        sellDex: sellDex.dex,
        calculation,
        tradeSizeUSD
      };
      
    } catch (error) {
      logger.error('Error creating arbitrage opportunity:', error);
      return null;
    } finally {
      client.release();
    }
  }

  calculateCompetitionProbability(profitPercent) {
    // Higher profit = higher competition probability
    if (profitPercent > 5) return 0.9;   // 90% chance of competition
    if (profitPercent > 3) return 0.7;   // 70% chance
    if (profitPercent > 1) return 0.5;   // 50% chance
    if (profitPercent > 0.5) return 0.3; // 30% chance
    return 0.1; // 10% chance for small profits
  }

  async getArbitrageStatistics() {
    const client = await pool.connect();
    
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_opportunities,
          AVG(profit_percentage) as avg_profit_percent,
          AVG(estimated_profit_sol) as avg_profit_sol,
          AVG(execution_risk_score) as avg_risk_score,
          MIN(estimated_profit_sol) as min_profit,
          MAX(estimated_profit_sol) as max_profit,
          COUNT(CASE WHEN status = 'detected' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'executed' THEN 1 END) as executed_count
        FROM mev_opportunities 
        WHERE opportunity_type = 'arbitrage'
        AND detection_timestamp > NOW() - INTERVAL '1 hour'
      `;
      
      const result = await client.query(statsQuery);
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error getting arbitrage statistics:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async startContinuousDetection(intervalMs = 15000) {
    logger.info(`Starting continuous arbitrage detection every ${intervalMs}ms`);
    
    const runDetection = async () => {
      try {
        const opportunities = await this.detectArbitrageOpportunities();
        
        if (opportunities.length > 0) {
          logger.info(`🔄 Arbitrage scan complete: ${opportunities.length} new opportunities`);
          
          // Get statistics
          const stats = await this.getArbitrageStatistics();
          if (stats) {
            logger.info(`📊 Arbitrage Stats (1h): ${stats.total_opportunities} total, ${parseFloat(stats.avg_profit_percent || 0).toFixed(2)}% avg profit`);
          }
        }
      } catch (error) {
        logger.error('Error in continuous arbitrage detection:', error);
      }
    };
    
    // Run immediately
    await runDetection();
    
    // Then run on interval
    return setInterval(runDetection, intervalMs);
  }
}

module.exports = ArbitrageDetectionEngine;