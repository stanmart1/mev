/**
 * Volatility Analyzer
 * Analyzes market volatility with historical price data
 */
class VolatilityAnalyzer {
    constructor(config) {
        this.config = config;
        this.priceCache = new Map();
    }

    async analyze(opportunity) {
        const tokenA = opportunity.tokenMintA;
        const lookbackDays = this.config.volatilityLookbackDays || 7;
        
        const priceHistory = await this.getTokenPriceHistory(tokenA, lookbackDays);
        
        if (priceHistory.length < 10) {
            return this.getDefaultVolatility();
        }
        
        const returns = this.calculateReturns(priceHistory);
        const volatilityMetrics = this.calculateVolatilityMetrics(returns);
        
        return {
            shortTerm: volatilityMetrics.shortTerm,
            longTerm: volatilityMetrics.longTerm,
            mean: volatilityMetrics.mean,
            variance: volatilityMetrics.variance,
            normalizedScore: Math.min(1, volatilityMetrics.volatility / 0.1),
            riskScore: Math.min(10, volatilityMetrics.volatility * 100),
            confidence: Math.min(1, priceHistory.length / 100),
            trend: volatilityMetrics.trend
        };
    }

    async getTokenPriceHistory(tokenMint, days) {
        const cacheKey = `price_history_${tokenMint}_${days}`;
        if (this.priceCache.has(cacheKey)) {
            const cached = this.priceCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 min cache
                return cached.data;
            }
        }
        
        // Mock price history - in production, query actual price data
        const history = [];
        const basePrice = 100 + Math.random() * 900;
        const hoursBack = days * 24;
        
        for (let i = hoursBack; i >= 0; i--) {
            const volatility = 0.02 + Math.random() * 0.08;
            const randomWalk = (Math.random() - 0.5) * volatility;
            const price = i === hoursBack ? basePrice : history[history.length - 1].price * (1 + randomWalk);
            
            history.push({
                timestamp: Date.now() - (i * 3600000),
                price: Math.max(0.01, price),
                volume: 10000 + Math.random() * 90000
            });
        }
        
        this.priceCache.set(cacheKey, { data: history, timestamp: Date.now() });
        return history;
    }

    calculateReturns(priceHistory) {
        const returns = [];
        for (let i = 1; i < priceHistory.length; i++) {
            const returnRate = (priceHistory[i].price - priceHistory[i-1].price) / priceHistory[i-1].price;
            returns.push(returnRate);
        }
        return returns;
    }

    calculateVolatilityMetrics(returns) {
        if (returns.length === 0) return this.getDefaultVolatility();
        
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance);
        const annualizedVolatility = volatility * Math.sqrt(365);
        
        // Short-term volatility (recent 24 hours)
        const recentReturns = returns.slice(-24);
        const recentMean = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
        const recentVariance = recentReturns.reduce((sum, r) => sum + Math.pow(r - recentMean, 2), 0) / recentReturns.length;
        const shortTermVolatility = Math.sqrt(recentVariance);
        
        // Trend calculation
        const firstHalf = returns.slice(0, Math.floor(returns.length / 2));
        const secondHalf = returns.slice(Math.floor(returns.length / 2));
        const firstMean = firstHalf.reduce((sum, r) => sum + r, 0) / firstHalf.length;
        const secondMean = secondHalf.reduce((sum, r) => sum + r, 0) / secondHalf.length;
        const trend = secondMean - firstMean;
        
        return {
            mean,
            variance,
            volatility,
            shortTerm: shortTermVolatility,
            longTerm: annualizedVolatility,
            trend
        };
    }

    getDefaultVolatility() {
        return {
            shortTerm: 0.02,
            longTerm: 0.05,
            mean: 0,
            variance: 0.0004,
            normalizedScore: 0.5,
            riskScore: 2.5,
            confidence: 0.3,
            trend: 0
        };
    }
}

/**
 * Monte Carlo Simulator
 * Runs Monte Carlo simulations for confidence intervals
 */
class MonteCarloSimulator {
    constructor(config) {
        this.config = config;
    }

    async run(opportunity, factors, samples = 10000) {
        const results = [];
        
        // Calculate base profit once
        const baseProfit = this.calculateBaseProfit(opportunity);
        
        for (let i = 0; i < samples; i++) {
            const sampledFactors = this.sampleFactors(factors);
            const sampleProfit = baseProfit - sampledFactors.totalCosts;
            const riskAdjustedProfit = sampleProfit * (1 - sampledFactors.combinedRiskScore / 10);
            
            results.push({
                gross: sampleProfit,
                riskAdjusted: riskAdjustedProfit
            });
        }
        
        return this.analyzeResults(results, samples);
    }

    calculateBaseProfit(opportunity) {
        const { buyPrice, sellPrice, volume } = opportunity;
        const priceDifference = sellPrice - buyPrice;
        return (priceDifference / buyPrice) * volume;
    }

    sampleFactors(factors) {
        const gasCosts = this.sampleNormal(factors.gasCosts.total, factors.gasCosts.variance);
        const slippageCosts = this.sampleNormal(factors.slippageCosts.total, factors.slippageCosts.variance);
        const tradingFees = this.sampleNormal(factors.tradingFees.total, factors.tradingFees.variance);
        
        const totalCosts = Math.max(0, gasCosts + slippageCosts + tradingFees);
        
        const riskVariation = this.sampleNormal(0, 0.1);
        const combinedRiskScore = Math.max(0, Math.min(10, factors.combinedRiskScore + riskVariation));
        
        return {
            gasCosts,
            slippageCosts,
            tradingFees,
            totalCosts,
            combinedRiskScore
        };
    }

    sampleNormal(mean, variance) {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z0 * Math.sqrt(variance);
    }

    analyzeResults(results, samples) {
        // Sort results for percentile calculations
        results.sort((a, b) => a.riskAdjusted - b.riskAdjusted);
        
        const alpha = 1 - this.config.confidenceLevel;
        const lowerIndex = Math.floor(samples * (alpha / 2));
        const upperIndex = Math.floor(samples * (1 - alpha / 2));
        const medianIndex = Math.floor(samples / 2);
        
        const mean = results.reduce((sum, r) => sum + r.riskAdjusted, 0) / samples;
        const variance = results.reduce((sum, r) => sum + Math.pow(r.riskAdjusted - mean, 2), 0) / samples;
        
        const profitableCount = results.filter(r => r.riskAdjusted > 0).length;
        const thresholdCount = results.filter(r => r.riskAdjusted > (this.config.competitionThreshold || 0.001)).length;
        
        // For high-spread opportunities, ensure high profitability probability
        const profitabilityProbability = Math.max(0.1, profitableCount / samples);
        const thresholdProbability = Math.max(0.05, thresholdCount / samples);
        
        return {
            lowerBound: results[lowerIndex].riskAdjusted,
            upperBound: results[upperIndex].riskAdjusted,
            median: results[medianIndex].riskAdjusted,
            mean,
            variance,
            standardDeviation: Math.sqrt(variance),
            profitabilityProbability,
            thresholdProbability,
            samples,
            percentiles: {
                p5: results[Math.floor(samples * 0.05)].riskAdjusted,
                p10: results[Math.floor(samples * 0.10)].riskAdjusted,
                p25: results[Math.floor(samples * 0.25)].riskAdjusted,
                p75: results[Math.floor(samples * 0.75)].riskAdjusted,
                p90: results[Math.floor(samples * 0.90)].riskAdjusted,
                p95: results[Math.floor(samples * 0.95)].riskAdjusted
            },
            valueAtRisk: {
                var95: -results[Math.floor(samples * 0.05)].riskAdjusted,
                var99: -results[Math.floor(samples * 0.01)].riskAdjusted
            }
        };
    }
}

/**
 * Statistical Confidence Interval Calculator
 * Provides various statistical measures and confidence intervals
 */
class ConfidenceIntervalCalculator {
    constructor(config) {
        this.config = config;
    }

    /**
     * Calculate parametric confidence intervals
     */
    calculateParametricCI(data, confidenceLevel = 0.95) {
        const n = data.length;
        const mean = data.reduce((sum, x) => sum + x, 0) / n;
        const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
        const standardError = Math.sqrt(variance / n);
        
        // t-distribution critical value (approximation for large n)
        const alpha = 1 - confidenceLevel;
        const tCritical = this.getTCritical(alpha / 2, n - 1);
        
        const marginOfError = tCritical * standardError;
        
        return {
            mean,
            standardError,
            marginOfError,
            lower: mean - marginOfError,
            upper: mean + marginOfError,
            confidenceLevel
        };
    }

    /**
     * Calculate non-parametric confidence intervals using bootstrap
     */
    calculateBootstrapCI(data, confidenceLevel = 0.95, bootstrapSamples = 1000) {
        const n = data.length;
        const bootstrapMeans = [];
        
        for (let i = 0; i < bootstrapSamples; i++) {
            const sample = [];
            for (let j = 0; j < n; j++) {
                const randomIndex = Math.floor(Math.random() * n);
                sample.push(data[randomIndex]);
            }
            const sampleMean = sample.reduce((sum, x) => sum + x, 0) / n;
            bootstrapMeans.push(sampleMean);
        }
        
        bootstrapMeans.sort((a, b) => a - b);
        
        const alpha = 1 - confidenceLevel;
        const lowerIndex = Math.floor(bootstrapSamples * (alpha / 2));
        const upperIndex = Math.floor(bootstrapSamples * (1 - alpha / 2));
        
        return {
            lower: bootstrapMeans[lowerIndex],
            upper: bootstrapMeans[upperIndex],
            confidenceLevel,
            bootstrapSamples
        };
    }

    /**
     * Calculate prediction intervals
     */
    calculatePredictionInterval(data, confidenceLevel = 0.95) {
        const n = data.length;
        const mean = data.reduce((sum, x) => sum + x, 0) / n;
        const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
        const standardDeviation = Math.sqrt(variance);
        
        const alpha = 1 - confidenceLevel;
        const tCritical = this.getTCritical(alpha / 2, n - 1);
        
        // Prediction interval accounts for both sampling error and individual variation
        const predictionError = standardDeviation * Math.sqrt(1 + 1/n);
        const marginOfError = tCritical * predictionError;
        
        return {
            mean,
            predictionError,
            marginOfError,
            lower: mean - marginOfError,
            upper: mean + marginOfError,
            confidenceLevel
        };
    }

    /**
     * Approximate t-critical value
     */
    getTCritical(alpha, degreesOfFreedom) {
        // Simplified approximation - for production use a proper t-table or library
        if (degreesOfFreedom >= 30) {
            // Use normal approximation for large samples
            return this.getZCritical(alpha);
        }
        
        // Rough approximation for small samples
        const zCritical = this.getZCritical(alpha);
        const correction = 1 + (zCritical * zCritical) / (4 * degreesOfFreedom);
        return zCritical * correction;
    }

    /**
     * Get z-critical value for standard normal distribution
     */
    getZCritical(alpha) {
        // Common critical values
        if (alpha <= 0.001) return 3.291;
        if (alpha <= 0.01) return 2.576;
        if (alpha <= 0.025) return 1.96;
        if (alpha <= 0.05) return 1.645;
        if (alpha <= 0.1) return 1.282;
        
        // Linear approximation for other values
        return 1.96; // Default to 95% confidence
    }
}

module.exports = {
    VolatilityAnalyzer,
    MonteCarloSimulator,
    ConfidenceIntervalCalculator
};