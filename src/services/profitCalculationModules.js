/**
 * Gas Cost Calculator
 * Calculates transaction gas costs with network conditions
 */
class GasCostCalculator {
    constructor(config) {
        this.config = config;
        this.cache = new Map();
    }

    async calculate(opportunity, options = {}) {
        const currentGasPrices = await this.getCurrentGasPrices();
        const networkCongestion = await this.getNetworkCongestion();
        
        const baseGasCost = this.config.basePriorityFee || 5000;
        const congestionMultiplier = 1 + (networkCongestion * 0.5);
        const strategyMultiplier = this.getStrategyGasMultiplier(opportunity.strategy);
        const dexGasCosts = this.getDexSpecificGasCosts(opportunity.primaryDex, opportunity.secondaryDex);
        
        const estimatedGasCost = baseGasCost * congestionMultiplier * strategyMultiplier + dexGasCosts;
        const gasVariance = estimatedGasCost * 0.2;
        
        return {
            base: baseGasCost,
            total: estimatedGasCost,
            variance: gasVariance,
            breakdown: {
                priorityFee: baseGasCost * congestionMultiplier,
                dexCosts: dexGasCosts,
                strategyMultiplier,
                congestionMultiplier
            }
        };
    }

    async getCurrentGasPrices() {
        if (this.cache.has('gasPrices') && Date.now() - this.cache.get('gasPrices').timestamp < 30000) {
            return this.cache.get('gasPrices').data;
        }
        
        // Mock implementation - in production, query actual network
        const gasPrices = {
            low: 3000,
            medium: 5000,
            high: 8000,
            current: 5000 + Math.random() * 3000
        };
        
        this.cache.set('gasPrices', { data: gasPrices, timestamp: Date.now() });
        return gasPrices;
    }

    async getNetworkCongestion() {
        // Mock network congestion (0-1 scale)
        return 0.3 + Math.random() * 0.4; // 0.3 to 0.7
    }

    getStrategyGasMultiplier(strategy) {
        const multipliers = {
            'arbitrage': 1.2,
            'liquidation': 1.5,
            'sandwich': 1.8,
            'flashloan': 2.0
        };
        return multipliers[strategy] || 1.0;
    }

    getDexSpecificGasCosts(primaryDex, secondaryDex) {
        const dexCosts = {
            'raydium': 2000,
            'orca': 2500,
            'serum': 3000,
            'jupiter': 1800,
            'meteora': 2200,
            'openbook': 2800
        };
        
        const primaryCost = dexCosts[primaryDex?.toLowerCase()] || 2000;
        const secondaryCost = secondaryDex ? (dexCosts[secondaryDex.toLowerCase()] || 2000) : 0;
        
        return primaryCost + secondaryCost;
    }
}

/**
 * Slippage Calculator
 * Calculates slippage costs based on volume and market conditions
 */
class SlippageCalculator {
    constructor(config) {
        this.config = config;
        this.cache = new Map();
    }

    async calculate(opportunity, options = {}) {
        const { volume, primaryDex, secondaryDex } = opportunity;
        
        const primaryLiquidity = await this.getDexLiquidity(primaryDex, opportunity.tokenMintA, opportunity.tokenMintB);
        const secondaryLiquidity = await this.getDexLiquidity(secondaryDex, opportunity.tokenMintA, opportunity.tokenMintB);
        
        const primaryVolumeImpact = this.calculateVolumeImpact(volume, primaryLiquidity);
        const secondaryVolumeImpact = this.calculateVolumeImpact(volume, secondaryLiquidity);
        
        const baseSlippage = (this.config.baseSlippageBps || 25) / 10000;
        const volatility = await this.getTokenVolatility(opportunity.tokenMintA);
        const volatilityMultiplier = 1 + (volatility * 2);
        
        const primarySlippage = baseSlippage * (1 + primaryVolumeImpact) * volatilityMultiplier;
        const secondarySlippage = baseSlippage * (1 + secondaryVolumeImpact) * volatilityMultiplier;
        
        const totalSlippageCost = (primarySlippage + secondarySlippage) * volume;
        
        return {
            primary: primarySlippage * volume,
            secondary: secondarySlippage * volume,
            total: totalSlippageCost,
            variance: totalSlippageCost * 0.3,
            breakdown: {
                baseSlippage,
                primaryVolumeImpact,
                secondaryVolumeImpact,
                volatilityMultiplier
            }
        };
    }

    async getDexLiquidity(dex, tokenA, tokenB) {
        const cacheKey = `liquidity_${dex}_${tokenA}_${tokenB}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 60000) {
                return cached.data;
            }
        }
        
        // Mock liquidity data - in production, query actual DEX
        const liquidity = {
            totalValueLocked: 100000 + Math.random() * 900000,
            volume24h: 50000 + Math.random() * 200000,
            depth: 0.02 + Math.random() * 0.08
        };
        
        this.cache.set(cacheKey, { data: liquidity, timestamp: Date.now() });
        return liquidity;
    }

    calculateVolumeImpact(volume, liquidity) {
        const liquidityRatio = volume / liquidity.totalValueLocked;
        return Math.min(0.5, liquidityRatio * 2); // Cap at 50% impact
    }

    async getTokenVolatility(tokenMint) {
        // Mock volatility data
        return 0.02 + Math.random() * 0.08; // 2-10% volatility
    }
}

/**
 * Competition Analyzer
 * Analyzes competition probability based on historical data
 */
class CompetitionAnalyzer {
    constructor(config) {
        this.config = config;
        this.peakHours = [9, 10, 11, 14, 15, 16];
    }

    async analyze(opportunity) {
        const currentHour = new Date().getHours();
        const isPeakHour = this.peakHours.includes(currentHour);
        const timeMultiplier = isPeakHour ? 2.5 : 1.0;
        
        const volumeMultiplier = Math.min(2.0, 1 + (opportunity.volume / 1000));
        const strategyMultiplier = this.getStrategyCompetitionMultiplier(opportunity.strategy);
        const historicalFactor = await this.getHistoricalCompetition(opportunity);
        
        const baseRate = 0.15;
        const probability = Math.min(0.9,
            baseRate * timeMultiplier * volumeMultiplier * strategyMultiplier * (1 + historicalFactor)
        );
        
        return {
            probability,
            factors: {
                timeMultiplier,
                volumeMultiplier,
                strategyMultiplier,
                historicalFactor
            }
        };
    }

    getStrategyCompetitionMultiplier(strategy) {
        const multipliers = {
            'arbitrage': 1.5,
            'liquidation': 1.2,
            'sandwich': 2.0,
            'flashloan': 1.8
        };
        return multipliers[strategy] || 1.0;
    }

    async getHistoricalCompetition(opportunity) {
        // Mock historical competition factor
        return Math.random() * 0.3; // 0-30% additional competition
    }
}

/**
 * Risk Calculator
 * Calculates execution risk based on multiple factors
 */
class RiskCalculator {
    constructor(config) {
        this.config = config;
    }

    async calculate(opportunity) {
        const riskFactors = [
            await this.calculateNetworkRisk(),
            await this.calculateLiquidityRisk(opportunity),
            await this.calculateVolatilityRisk(opportunity),
            this.calculateDexReliabilityRisk(opportunity),
            this.calculateTimingRisk(opportunity)
        ];
        
        const weightedScore = riskFactors.reduce((total, factor) => {
            return total + (factor.score * factor.weight);
        }, 0);
        
        return {
            score: Math.min(10, weightedScore),
            factors: riskFactors,
            level: this.getRiskLevel(weightedScore)
        };
    }

    async calculateNetworkRisk() {
        const congestion = Math.random() * 0.8 + 0.1; // 0.1-0.9
        return {
            name: 'networkCongestion',
            score: congestion * 3,
            weight: 0.25
        };
    }

    async calculateLiquidityRisk(opportunity) {
        const liquidityScore = Math.random() * 0.5; // Mock liquidity risk
        return {
            name: 'liquidity',
            score: liquidityScore * 4,
            weight: 0.3
        };
    }

    async calculateVolatilityRisk(opportunity) {
        const volatility = Math.random() * 0.1; // Mock volatility
        return {
            name: 'volatility',
            score: Math.min(3, volatility * 100),
            weight: 0.2
        };
    }

    calculateDexReliabilityRisk(opportunity) {
        const reliability = this.getDexReliabilityScore(opportunity.primaryDex);
        return {
            name: 'dexReliability',
            score: (1 - reliability) * 3,
            weight: 0.15
        };
    }

    calculateTimingRisk(opportunity) {
        const age = opportunity.detectionTime ? Date.now() - opportunity.detectionTime : 0;
        const timingRisk = Math.min(1, age / 10000); // Risk increases with age
        return {
            name: 'timing',
            score: timingRisk * 2,
            weight: 0.1
        };
    }

    getDexReliabilityScore(dex) {
        const scores = {
            'raydium': 0.95,
            'orca': 0.92,
            'serum': 0.88,
            'jupiter': 0.90,
            'meteora': 0.87,
            'openbook': 0.85
        };
        return scores[dex?.toLowerCase()] || 0.8;
    }

    getRiskLevel(score) {
        if (score <= 3) return 'LOW';
        if (score <= 6) return 'MEDIUM';
        if (score <= 8) return 'HIGH';
        return 'EXTREME';
    }
}

module.exports = {
    GasCostCalculator,
    SlippageCalculator,
    CompetitionAnalyzer,
    RiskCalculator
};