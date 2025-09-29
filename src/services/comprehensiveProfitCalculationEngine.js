const { EventEmitter } = require('events');
const { 
    GasCostCalculator, 
    SlippageCalculator, 
    CompetitionAnalyzer, 
    RiskCalculator 
} = require('./profitCalculationModules');
const { 
    VolatilityAnalyzer, 
    MonteCarloSimulator,
    ConfidenceIntervalCalculator 
} = require('./statisticalAnalysisModules');

/**
 * Comprehensive Profit Calculation Engine
 * Advanced profit estimation with gas costs, slippage, competition, risk, and confidence intervals
 */
class ComprehensiveProfitCalculationEngine extends EventEmitter {
    constructor(solanaService, databasePool, config = {}) {
        super();
        this.solanaService = solanaService;
        this.databasePool = databasePool;
        
        this.config = {
            basePriorityFee: config.basePriorityFee || 5000,
            baseSlippageBps: config.baseSlippageBps || 25,
            competitionDecayFactor: config.competitionDecayFactor || 0.3,
            confidenceLevel: config.confidenceLevel || 0.95,
            monteCarloSamples: config.monteCarloSamples || 10000,
            volatilityLookbackDays: config.volatilityLookbackDays || 7,
            ...config
        };
        
        // Initialize submodules
        this.gasCostCalculator = new GasCostCalculator(this.config);
        this.slippageCalculator = new SlippageCalculator(this.config);
        this.competitionAnalyzer = new CompetitionAnalyzer(this.config);
        this.riskCalculator = new RiskCalculator(this.config);
        this.volatilityAnalyzer = new VolatilityAnalyzer(this.config);
        this.monteCarloSimulator = new MonteCarloSimulator(this.config);
        
        this.initializeModels();
    }

    /**
     * Main profit calculation method
     */
    async calculateComprehensiveProfit(opportunity, options = {}) {
        const startTime = Date.now();
        
        try {
            this.validateInputs(opportunity);
            
            // Calculate base profit
            const baseProfit = this.calculateBaseProfit(
                opportunity.buyPrice, 
                opportunity.sellPrice, 
                opportunity.volume
            );
            
            // Calculate all factors in parallel
            const factors = await this.calculateAllFactors(opportunity, options);
            
            // Run Monte Carlo simulation
            const confidenceAnalysis = await this.monteCarloSimulator.run(
                opportunity, 
                factors, 
                options.samples || this.config.monteCarloSamples
            );
            
            // Generate final result
            const result = this.buildResult(baseProfit, factors, confidenceAnalysis, startTime);
            
            await this.storeProfitCalculation(result);
            this.emit('profitCalculated', result);
            
            return result;
            
        } catch (error) {
            this.emit('calculationError', { opportunity, error: error.message });
            throw new Error(`Profit calculation failed: ${error.message}`);
        }
    }

    /**
     * Calculate base profit before costs and risks
     */
    calculateBaseProfit(buyPrice, sellPrice, volume) {
        const priceDifference = sellPrice - buyPrice;
        const grossProfit = (priceDifference / buyPrice) * volume;
        const percentage = (priceDifference / buyPrice) * 100;
        
        return {
            gross: grossProfit,
            percentage: percentage,
            priceDifference: priceDifference,
            spread: priceDifference / buyPrice
        };
    }

    /**
     * Calculate all cost and risk factors
     */
    async calculateAllFactors(opportunity, options) {
        const [
            gasCosts,
            slippageCosts,
            tradingFees,
            competitionProbability,
            executionRisk,
            volatility
        ] = await Promise.all([
            this.gasCostCalculator.calculate(opportunity, options),
            this.slippageCalculator.calculate(opportunity, options),
            this.calculateTradingFees(opportunity),
            this.competitionAnalyzer.analyze(opportunity),
            this.riskCalculator.calculate(opportunity),
            this.volatilityAnalyzer.analyze(opportunity)
        ]);
        
        const totalCosts = gasCosts.total + slippageCosts.total + tradingFees.total;
        const combinedRiskScore = this.calculateCombinedRiskScore({
            executionRisk: executionRisk.score,
            competitionProbability: competitionProbability.probability,
            volatility: volatility.normalizedScore
        });
        
        return {
            gasCosts,
            slippageCosts,
            tradingFees,
            totalCosts,
            competitionProbability: competitionProbability.probability,
            executionRisk: executionRisk.score,
            combinedRiskScore,
            volatility
        };
    }

    /**
     * Calculate trading fees
     */
    async calculateTradingFees(opportunity) {
        const { volume, primaryDex, secondaryDex } = opportunity;
        
        const primaryFee = this.getDexTradingFee(primaryDex);
        const secondaryFee = this.getDexTradingFee(secondaryDex);
        
        return {
            primary: volume * primaryFee,
            secondary: volume * secondaryFee,
            total: volume * (primaryFee + secondaryFee),
            variance: volume * (primaryFee + secondaryFee) * 0.05
        };
    }

    /**
     * Calculate combined risk score
     */
    calculateCombinedRiskScore(risks) {
        const weights = {
            executionRisk: 0.4,
            competitionProbability: 0.3,
            volatility: 0.3
        };
        
        return (risks.executionRisk * weights.executionRisk) +
               (risks.competitionProbability * 10 * weights.competitionProbability) +
               (risks.volatility * 10 * weights.volatility);
    }

    /**
     * Build comprehensive result object
     */
    buildResult(baseProfit, factors, confidenceAnalysis, startTime) {
        const netProfit = baseProfit.gross - factors.totalCosts;
        const riskAdjustedProfit = netProfit * (1 - factors.combinedRiskScore / 10);
        
        return {
            timestamp: Date.now(),
            baseProfit,
            costs: {
                gasCosts: factors.gasCosts,
                slippageCosts: factors.slippageCosts,
                tradingFees: factors.tradingFees,
                totalCosts: factors.totalCosts
            },
            risks: {
                executionRisk: factors.executionRisk,
                competitionProbability: factors.competitionProbability,
                combinedRiskScore: factors.combinedRiskScore
            },
            netProfit: {
                expected: netProfit,
                riskAdjusted: riskAdjustedProfit,
                minimum: confidenceAnalysis.lowerBound,
                maximum: confidenceAnalysis.upperBound
            },
            confidenceIntervals: {
                level: this.config.confidenceLevel,
                lower: confidenceAnalysis.lowerBound,
                upper: confidenceAnalysis.upperBound,
                median: confidenceAnalysis.median
            },
            probabilities: {
                profitability: confidenceAnalysis.profitabilityProbability,
                competitionLoss: factors.competitionProbability,
                executionSuccess: 1 - (factors.executionRisk / 10)
            },
            volatility: factors.volatility,
            calculationTime: Date.now() - startTime
        };
    }

    /**
     * Validate input parameters
     */
    validateInputs(opportunity) {
        const required = ['buyPrice', 'sellPrice', 'volume', 'primaryDex'];
        for (const field of required) {
            if (!opportunity[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        if (opportunity.buyPrice >= opportunity.sellPrice) {
            throw new Error('Buy price must be less than sell price');
        }
        
        if (opportunity.volume <= 0) {
            throw new Error('Volume must be positive');
        }
    }

    /**
     * Get DEX trading fee
     */
    getDexTradingFee(dex) {
        const fees = {
            'raydium': 0.0025,
            'orca': 0.003,
            'serum': 0.0022,
            'jupiter': 0.002,
            'meteora': 0.0025,
            'openbook': 0.0022
        };
        return fees[dex?.toLowerCase()] || 0.0025;
    }

    /**
     * Initialize statistical models
     */
    initializeModels() {
        // Initialize with default values
        this.models = {
            gasPrice: { mean: 8000, stdDev: 2000 },
            competition: { baseRate: 0.15, peakMultiplier: 2.5 },
            volatility: { shortTerm: 0.02, longTerm: 0.05 }
        };
    }

    /**
     * Store calculation for learning
     */
    async storeProfitCalculation(result) {
        try {
            if (!this.databasePool) return;
            
            const query = `
                INSERT INTO profit_calculations 
                (calculation_id, base_profit, total_costs, risk_score, expected_profit, confidence_lower, confidence_upper, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `;
            
            await this.databasePool.query(query, [
                `calc_${Date.now()}`,
                result.baseProfit.gross,
                result.costs.totalCosts,
                result.risks.combinedRiskScore,
                result.netProfit.expected,
                result.confidenceIntervals.lower,
                result.confidenceIntervals.upper
            ]);
        } catch (error) {
            console.error('Error storing profit calculation:', error);
        }
    }
}

module.exports = ComprehensiveProfitCalculationEngine;