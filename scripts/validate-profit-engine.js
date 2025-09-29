#!/usr/bin/env node

/**
 * Profit Calculation Engine Validation Suite
 * Tests the comprehensive profit calculation system
 */

const { performance } = require('perf_hooks');

class ProfitEngineValidator {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
        this.startTime = performance.now();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async test(name, testFn) {
        try {
            this.log(`Testing: ${name}`, 'info');
            const testStart = performance.now();
            
            await testFn();
            
            const duration = performance.now() - testStart;
            this.testResults.passed++;
            this.log(`✅ ${name} (${duration.toFixed(2)}ms)`, 'success');
        } catch (error) {
            this.testResults.failed++;
            this.testResults.errors.push({ test: name, error: error.message });
            this.log(`❌ ${name}: ${error.message}`, 'error');
        }
    }

    async validateCore() {
        this.log('=== PROFIT ENGINE CORE VALIDATION ===');

        await this.test('Profit Engine Initialization', async () => {
            const ComprehensiveProfitCalculationEngine = require('../src/services/comprehensiveProfitCalculationEngine');
            const engine = new ComprehensiveProfitCalculationEngine(null, null);
            
            if (!engine.gasCostCalculator) {
                throw new Error('Gas cost calculator not initialized');
            }
            
            if (!engine.monteCarloSimulator) {
                throw new Error('Monte Carlo simulator not initialized');
            }
        });

        await this.test('Basic Profit Calculation', async () => {
            const ComprehensiveProfitCalculationEngine = require('../src/services/comprehensiveProfitCalculationEngine');
            const engine = new ComprehensiveProfitCalculationEngine(null, null);
            
            const opportunity = {
                buyPrice: 100,
                sellPrice: 105,
                volume: 1000,
                primaryDex: 'raydium',
                secondaryDex: 'orca',
                strategy: 'arbitrage'
            };
            
            const result = await engine.calculateComprehensiveProfit(opportunity);
            
            if (!result.baseProfit) {
                throw new Error('Base profit not calculated');
            }
            
            if (result.baseProfit.gross <= 0) {
                throw new Error('Expected positive gross profit');
            }
            
            if (!result.confidenceIntervals) {
                throw new Error('Confidence intervals not calculated');
            }
        });

        await this.test('Input Validation', async () => {
            const ComprehensiveProfitCalculationEngine = require('../src/services/comprehensiveProfitCalculationEngine');
            const engine = new ComprehensiveProfitCalculationEngine(null, null);
            
            // Test missing required fields
            try {
                await engine.calculateComprehensiveProfit({});
                throw new Error('Should have thrown validation error');
            } catch (error) {
                if (!error.message.includes('Missing required field')) {
                    throw new Error('Wrong validation error type');
                }
            }
            
            // Test invalid price relationship
            try {
                await engine.calculateComprehensiveProfit({
                    buyPrice: 105,
                    sellPrice: 100,
                    volume: 1000,
                    primaryDex: 'raydium'
                });
                throw new Error('Should have thrown price validation error');
            } catch (error) {
                if (!error.message.includes('Buy price must be less than sell price')) {
                    throw new Error('Wrong price validation error');
                }
            }
        });
    }

    async validateModules() {
        this.log('=== PROFIT CALCULATION MODULES VALIDATION ===');

        await this.test('Gas Cost Calculator', async () => {
            const { GasCostCalculator } = require('../src/services/profitCalculationModules');
            const calculator = new GasCostCalculator({ basePriorityFee: 5000 });
            
            const opportunity = {
                strategy: 'arbitrage',
                primaryDex: 'raydium',
                secondaryDex: 'orca'
            };
            
            const result = await calculator.calculate(opportunity);
            
            if (!result.total || result.total <= 0) {
                throw new Error('Invalid gas cost calculation');
            }
            
            if (!result.breakdown) {
                throw new Error('Gas cost breakdown missing');
            }
        });

        await this.test('Slippage Calculator', async () => {
            const { SlippageCalculator } = require('../src/services/profitCalculationModules');
            const calculator = new SlippageCalculator({ baseSlippageBps: 25 });
            
            const opportunity = {
                volume: 1000,
                primaryDex: 'raydium',
                secondaryDex: 'orca',
                tokenMintA: 'SOL',
                tokenMintB: 'USDC'
            };
            
            const result = await calculator.calculate(opportunity);
            
            if (!result.total || result.total < 0) {
                throw new Error('Invalid slippage calculation');
            }
            
            if (!result.breakdown) {
                throw new Error('Slippage breakdown missing');
            }
        });

        await this.test('Competition Analyzer', async () => {
            const { CompetitionAnalyzer } = require('../src/services/profitCalculationModules');
            const analyzer = new CompetitionAnalyzer({});
            
            const opportunity = {
                volume: 1000,
                strategy: 'arbitrage'
            };
            
            const result = await analyzer.analyze(opportunity);
            
            if (result.probability < 0 || result.probability > 1) {
                throw new Error('Competition probability out of valid range');
            }
            
            if (!result.factors) {
                throw new Error('Competition factors missing');
            }
        });

        await this.test('Risk Calculator', async () => {
            const { RiskCalculator } = require('../src/services/profitCalculationModules');
            const calculator = new RiskCalculator({});
            
            const opportunity = {
                primaryDex: 'raydium',
                detectionTime: Date.now() - 5000
            };
            
            const result = await calculator.calculate(opportunity);
            
            if (result.score < 0 || result.score > 10) {
                throw new Error('Risk score out of valid range');
            }
            
            if (!result.level) {
                throw new Error('Risk level not determined');
            }
        });
    }

    async validateStatistical() {
        this.log('=== STATISTICAL ANALYSIS VALIDATION ===');

        await this.test('Volatility Analyzer', async () => {
            const { VolatilityAnalyzer } = require('../src/services/statisticalAnalysisModules');
            const analyzer = new VolatilityAnalyzer({ volatilityLookbackDays: 7 });
            
            const opportunity = {
                tokenMintA: 'SOL'
            };
            
            const result = await analyzer.analyze(opportunity);
            
            if (result.normalizedScore < 0 || result.normalizedScore > 1) {
                throw new Error('Normalized volatility score out of range');
            }
            
            if (!result.confidence) {
                throw new Error('Confidence level missing');
            }
        });

        await this.test('Monte Carlo Simulator', async () => {
            const { MonteCarloSimulator } = require('../src/services/statisticalAnalysisModules');
            const simulator = new MonteCarloSimulator({ confidenceLevel: 0.95 });
            
            const opportunity = {
                buyPrice: 100,
                sellPrice: 105,
                volume: 1000
            };
            
            const factors = {
                gasCosts: { total: 0.01, variance: 0.002 },
                slippageCosts: { total: 0.005, variance: 0.001 },
                tradingFees: { total: 0.003, variance: 0.0005 },
                combinedRiskScore: 3
            };
            
            const result = await simulator.run(opportunity, factors, 1000);
            
            if (!result.lowerBound || !result.upperBound) {
                throw new Error('Confidence bounds not calculated');
            }
            
            if (result.lowerBound >= result.upperBound) {
                throw new Error('Invalid confidence interval');
            }
            
            if (result.profitabilityProbability < 0 || result.profitabilityProbability > 1) {
                throw new Error('Profitability probability out of range');
            }
        });

        await this.test('Confidence Interval Calculator', async () => {
            const { ConfidenceIntervalCalculator } = require('../src/services/statisticalAnalysisModules');
            const calculator = new ConfidenceIntervalCalculator({});
            
            const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            
            const parametricCI = calculator.calculateParametricCI(data, 0.95);
            
            if (!parametricCI.lower || !parametricCI.upper) {
                throw new Error('Parametric CI not calculated');
            }
            
            if (parametricCI.lower >= parametricCI.upper) {
                throw new Error('Invalid parametric confidence interval');
            }
            
            const bootstrapCI = calculator.calculateBootstrapCI(data, 0.95, 100);
            
            if (!bootstrapCI.lower || !bootstrapCI.upper) {
                throw new Error('Bootstrap CI not calculated');
            }
        });
    }

    async validatePerformance() {
        this.log('=== PERFORMANCE VALIDATION ===');

        await this.test('Single Calculation Performance', async () => {
            const ComprehensiveProfitCalculationEngine = require('../src/services/comprehensiveProfitCalculationEngine');
            const engine = new ComprehensiveProfitCalculationEngine(null, null);
            
            const opportunity = {
                buyPrice: 100,
                sellPrice: 105,
                volume: 1000,
                primaryDex: 'raydium',
                secondaryDex: 'orca',
                strategy: 'arbitrage'
            };
            
            const startTime = performance.now();
            const result = await engine.calculateComprehensiveProfit(opportunity, { samples: 1000 });
            const duration = performance.now() - startTime;
            
            if (duration > 5000) { // 5 seconds max
                throw new Error(`Calculation too slow: ${duration}ms`);
            }
            
            if (!result.calculationTime && result.calculationTime !== 0) {
                throw new Error('Calculation time not recorded');
            }
        });

        await this.test('Batch Calculation Performance', async () => {
            const ComprehensiveProfitCalculationEngine = require('../src/services/comprehensiveProfitCalculationEngine');
            const engine = new ComprehensiveProfitCalculationEngine(null, null);
            
            const opportunities = [];
            for (let i = 0; i < 10; i++) {
                opportunities.push({
                    buyPrice: 100 + i,
                    sellPrice: 105 + i,
                    volume: 1000,
                    primaryDex: 'raydium',
                    secondaryDex: 'orca',
                    strategy: 'arbitrage'
                });
            }
            
            const startTime = performance.now();
            const promises = opportunities.map(opp => 
                engine.calculateComprehensiveProfit(opp, { samples: 500 })
            );
            const results = await Promise.all(promises);
            const duration = performance.now() - startTime;
            
            if (duration > 10000) { // 10 seconds max for 10 calculations
                throw new Error(`Batch calculation too slow: ${duration}ms`);
            }
            
            if (results.length !== 10) {
                throw new Error(`Expected 10 results, got ${results.length}`);
            }
        });
    }

    async validateAccuracy() {
        this.log('=== ACCURACY VALIDATION ===');

        await this.test('Profit Calculation Accuracy', async () => {
            const ComprehensiveProfitCalculationEngine = require('../src/services/comprehensiveProfitCalculationEngine');
            const engine = new ComprehensiveProfitCalculationEngine(null, null);
            
            // Test with known profitable opportunity
            const profitableOpp = {
                buyPrice: 100,
                sellPrice: 110, // 10% spread
                volume: 1000,
                primaryDex: 'raydium',
                secondaryDex: 'orca',
                strategy: 'arbitrage'
            };
            
            const profitableResult = await engine.calculateComprehensiveProfit(profitableOpp);
            
            if (profitableResult.baseProfit.percentage !== 10) {
                throw new Error(`Expected 10% profit, got ${profitableResult.baseProfit.percentage}%`);
            }
            
            if (profitableResult.probabilities.profitability < 0.1) {
                throw new Error(`High-spread opportunity should have reasonable profitability probability, got ${profitableResult.probabilities.profitability}`);
            }
            
            // Test with marginal opportunity
            const marginalOpp = {
                buyPrice: 100,
                sellPrice: 100.5, // 0.5% spread
                volume: 1000,
                primaryDex: 'raydium',
                secondaryDex: 'orca',
                strategy: 'arbitrage'
            };
            
            const marginalResult = await engine.calculateComprehensiveProfit(marginalOpp);
            
            if (marginalResult.netProfit.expected >= profitableResult.netProfit.expected) {
                throw new Error('Marginal opportunity should have lower expected profit');
            }
        });

        await this.test('Risk Assessment Accuracy', async () => {
            const ComprehensiveProfitCalculationEngine = require('../src/services/comprehensiveProfitCalculationEngine');
            const engine = new ComprehensiveProfitCalculationEngine(null, null);
            
            // High volume = higher risk
            const highVolumeOpp = {
                buyPrice: 100,
                sellPrice: 105,
                volume: 10000, // 10x volume
                primaryDex: 'raydium',
                secondaryDex: 'orca',
                strategy: 'arbitrage'
            };
            
            const lowVolumeOpp = {
                buyPrice: 100,
                sellPrice: 105,
                volume: 100, // Lower volume
                primaryDex: 'raydium',
                secondaryDex: 'orca',
                strategy: 'arbitrage'
            };
            
            const highVolumeResult = await engine.calculateComprehensiveProfit(highVolumeOpp);
            const lowVolumeResult = await engine.calculateComprehensiveProfit(lowVolumeOpp);
            
            if (highVolumeResult.risks.combinedRiskScore <= lowVolumeResult.risks.combinedRiskScore) {
                throw new Error('High volume should result in higher risk score');
            }
        });
    }

    async runAllTests() {
        this.log('🚀 Starting Profit Engine Validation');
        
        try {
            await this.validateCore();
            await this.validateModules();
            await this.validateStatistical();
            await this.validatePerformance();
            await this.validateAccuracy();
        } catch (error) {
            this.log(`Unexpected error during testing: ${error.message}`, 'error');
            this.testResults.failed++;
        }
        
        this.generateReport();
    }

    generateReport() {
        const totalTime = performance.now() - this.startTime;
        const totalTests = this.testResults.passed + this.testResults.failed;
        
        this.log('=== TEST RESULTS ===');
        this.log(`Total Tests: ${totalTests}`);
        this.log(`Passed: ${this.testResults.passed}`, 'success');
        this.log(`Failed: ${this.testResults.failed}`, this.testResults.failed > 0 ? 'error' : 'success');
        this.log(`Success Rate: ${((this.testResults.passed / totalTests) * 100).toFixed(1)}%`);
        this.log(`Total Time: ${totalTime.toFixed(2)}ms`);
        
        if (this.testResults.errors.length > 0) {
            this.log('=== ERRORS ===', 'error');
            this.testResults.errors.forEach(({ test, error }) => {
                this.log(`${test}: ${error}`, 'error');
            });
        }
        
        const success = this.testResults.failed === 0;
        this.log(`\n${success ? '🎉' : '💥'} Profit Calculation Engine: ${success ? 'VALIDATED' : 'VALIDATION FAILED'}`, success ? 'success' : 'error');
        
        process.exit(success ? 0 : 1);
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new ProfitEngineValidator();
    validator.runAllTests().catch(error => {
        console.error('Fatal error during validation:', error);
        process.exit(1);
    });
}

module.exports = ProfitEngineValidator;