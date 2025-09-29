const { EventEmitter } = require('events');

/**
 * Jito Validator Comparison System
 * Provides detailed comparison between Jito-enabled and regular validators
 */
class JitoValidatorComparison extends EventEmitter {
    constructor(validatorTracker, config = {}) {
        super();
        this.validatorTracker = validatorTracker;
        
        this.config = {
            comparisonInterval: config.comparisonInterval || 900000, // 15 minutes
            historicalPeriods: config.historicalPeriods || 30, // days
            significanceThreshold: config.significanceThreshold || 0.05, // 5%
            ...config
        };
        
        // Comparison data storage
        this.comparisonHistory = new Map();
        this.metrics = {
            current: null,
            trends: new Map(),
            correlations: new Map()
        };
        
        this.comparisonInterval = null;
        this.startComparison();
    }

    /**
     * Start comparison analysis
     */
    startComparison() {
        this.comparisonInterval = setInterval(async () => {
            try {
                await this.performComparison();
            } catch (error) {
                this.emit('error', { message: 'Comparison analysis failed', error });
            }
        }, this.config.comparisonInterval);
        
        // Perform initial comparison
        this.performComparison();
    }

    /**
     * Perform comprehensive comparison analysis
     */
    async performComparison() {
        try {
            const validators = Array.from(this.validatorTracker.validatorData.active.values());
            const jitoValidators = validators.filter(v => v.isJitoEnabled);
            const regularValidators = validators.filter(v => !v.isJitoEnabled);
            
            // Basic metrics comparison
            const basicComparison = this.compareBasicMetrics(jitoValidators, regularValidators);
            
            // Performance comparison
            const performanceComparison = this.comparePerformanceMetrics(jitoValidators, regularValidators);
            
            // MEV-specific comparison
            const mevComparison = this.compareMEVMetrics(jitoValidators);
            
            // Statistical significance testing
            const significanceTests = this.performSignificanceTests(jitoValidators, regularValidators);
            
            // Trend analysis
            const trendAnalysis = this.analyzeTrends();
            
            // Correlation analysis
            const correlationAnalysis = this.analyzeCorrelations(jitoValidators);
            
            const comparisonResult = {
                timestamp: Date.now(),
                epoch: this.validatorTracker.currentEpoch,
                sampleSizes: {
                    jito: jitoValidators.length,
                    regular: regularValidators.length,
                    total: validators.length
                },
                basicComparison,
                performanceComparison,
                mevComparison,
                significanceTests,
                trendAnalysis,
                correlationAnalysis,
                insights: this.generateInsights(basicComparison, performanceComparison, mevComparison)
            };
            
            // Store comparison result
            this.metrics.current = comparisonResult;
            this.comparisonHistory.set(Date.now(), comparisonResult);
            
            // Clean up old data
            this.cleanupOldData();
            
            this.emit('comparisonComplete', comparisonResult);
            
            return comparisonResult;
            
        } catch (error) {
            throw new Error(`Comparison analysis failed: ${error.message}`);
        }
    }

    /**
     * Compare basic metrics between validator groups
     */
    compareBasicMetrics(jitoValidators, regularValidators) {
        const jitoMetrics = this.calculateGroupBasics(jitoValidators);
        const regularMetrics = this.calculateGroupBasics(regularValidators);
        
        return {
            jito: jitoMetrics,
            regular: regularMetrics,
            differences: {
                avgStake: jitoMetrics.avgStake - regularMetrics.avgStake,
                avgCommission: jitoMetrics.avgCommission - regularMetrics.avgCommission,
                medianStake: jitoMetrics.medianStake - regularMetrics.medianStake,
                stakeConcentration: jitoMetrics.stakeConcentration - regularMetrics.stakeConcentration
            },
            ratios: {
                avgStakeRatio: jitoMetrics.avgStake / Math.max(regularMetrics.avgStake, 1),
                commissionRatio: jitoMetrics.avgCommission / Math.max(regularMetrics.avgCommission, 0.01),
                marketShareRatio: jitoMetrics.marketShare / Math.max(regularMetrics.marketShare, 0.001)
            }
        };
    }

    /**
     * Calculate basic metrics for a group of validators
     */
    calculateGroupBasics(validators) {
        if (validators.length === 0) {
            return {
                count: 0,
                totalStake: 0,
                avgStake: 0,
                medianStake: 0,
                avgCommission: 0,
                stakeConcentration: 0,
                marketShare: 0
            };
        }
        
        const stakes = validators.map(v => v.activatedStake).sort((a, b) => a - b);
        const commissions = validators.map(v => v.commission);
        const totalNetworkStake = Array.from(this.validatorTracker.validatorData.active.values())
            .reduce((sum, v) => sum + v.activatedStake, 0);
        
        const totalStake = validators.reduce((sum, v) => sum + v.activatedStake, 0);
        const avgStake = totalStake / validators.length;
        const medianStake = stakes[Math.floor(stakes.length / 2)];
        const avgCommission = commissions.reduce((sum, c) => sum + c, 0) / validators.length;
        
        // Calculate Gini coefficient for stake concentration
        const stakeConcentration = this.calculateGiniCoefficient(stakes);
        
        return {
            count: validators.length,
            totalStake,
            avgStake,
            medianStake,
            avgCommission,
            stakeConcentration,
            marketShare: totalStake / totalNetworkStake,
            stakeDistribution: {
                min: Math.min(...stakes),
                max: Math.max(...stakes),
                q25: stakes[Math.floor(stakes.length * 0.25)],
                q75: stakes[Math.floor(stakes.length * 0.75)]
            }
        };
    }

    /**
     * Compare performance metrics between validator groups
     */
    comparePerformanceMetrics(jitoValidators, regularValidators) {
        const jitoPerf = this.calculateGroupPerformance(jitoValidators);
        const regularPerf = this.calculateGroupPerformance(regularValidators);
        
        return {
            jito: jitoPerf,
            regular: regularPerf,
            differences: {
                avgAPY: jitoPerf.avgAPY - regularPerf.avgAPY,
                avgSkipRate: jitoPerf.avgSkipRate - regularPerf.avgSkipRate,
                avgUptimeScore: jitoPerf.avgUptimeScore - regularPerf.avgUptimeScore,
                avgPerformanceScore: jitoPerf.avgPerformanceScore - regularPerf.avgPerformanceScore
            },
            relativeDifferences: {
                apyImprovement: ((jitoPerf.avgAPY - regularPerf.avgAPY) / Math.max(regularPerf.avgAPY, 0.01)) * 100,
                skipRateImprovement: ((regularPerf.avgSkipRate - jitoPerf.avgSkipRate) / Math.max(regularPerf.avgSkipRate, 0.001)) * 100,
                uptimeImprovement: ((jitoPerf.avgUptimeScore - regularPerf.avgUptimeScore) / Math.max(regularPerf.avgUptimeScore, 0.01)) * 100
            }
        };
    }

    /**
     * Calculate performance metrics for a group of validators
     */
    calculateGroupPerformance(validators) {
        if (validators.length === 0) {
            return {
                avgAPY: 0,
                avgSkipRate: 0,
                avgUptimeScore: 0,
                avgPerformanceScore: 0,
                consistency: 0
            };
        }
        
        const apys = validators.map(v => v.performance.apy);
        const skipRates = validators.map(v => v.performance.skipRate);
        const uptimeScores = validators.map(v => v.performance.uptimeScore);
        const performanceScores = validators.map(v => v.performance.performanceScore);
        
        return {
            avgAPY: apys.reduce((sum, apy) => sum + apy, 0) / validators.length,
            avgSkipRate: skipRates.reduce((sum, sr) => sum + sr, 0) / validators.length,
            avgUptimeScore: uptimeScores.reduce((sum, us) => sum + us, 0) / validators.length,
            avgPerformanceScore: performanceScores.reduce((sum, ps) => sum + ps, 0) / validators.length,
            consistency: {
                apyStdDev: this.calculateStandardDeviation(apys),
                skipRateStdDev: this.calculateStandardDeviation(skipRates),
                uptimeStdDev: this.calculateStandardDeviation(uptimeScores),
                performanceStdDev: this.calculateStandardDeviation(performanceScores)
            }
        };
    }

    /**
     * Compare MEV-specific metrics for Jito validators
     */
    compareMEVMetrics(jitoValidators) {
        if (jitoValidators.length === 0) {
            return {
                avgMevEfficiency: 0,
                avgMevRewards24h: 0,
                avgBundles24h: 0,
                mevPerformanceDistribution: []
            };
        }
        
        const mevEfficiencies = jitoValidators.map(v => v.performance.mevEfficiency);
        const mevMetrics = jitoValidators.map(v => this.validatorTracker.mevMetrics.get(v.votePubkey)).filter(Boolean);
        
        const avgMevEfficiency = mevEfficiencies.reduce((sum, eff) => sum + eff, 0) / jitoValidators.length;
        const avgMevRewards24h = mevMetrics.reduce((sum, m) => sum + (m.mevRewards24h || 0), 0) / Math.max(mevMetrics.length, 1);
        const avgBundles24h = mevMetrics.reduce((sum, m) => sum + (m.bundles24h || 0), 0) / Math.max(mevMetrics.length, 1);
        
        // Performance distribution
        const mevPerformanceDistribution = this.calculatePerformanceDistribution(mevEfficiencies);
        
        // MEV efficiency vs stake correlation
        const stakeVsMevCorrelation = this.calculateCorrelation(
            jitoValidators.map(v => v.activatedStake),
            mevEfficiencies
        );
        
        // Commission impact on MEV
        const commissionVsMevCorrelation = this.calculateCorrelation(
            jitoValidators.map(v => v.commission),
            mevEfficiencies
        );
        
        return {
            avgMevEfficiency,
            avgMevRewards24h,
            avgBundles24h,
            mevPerformanceDistribution,
            correlations: {
                stakeVsMev: stakeVsMevCorrelation,
                commissionVsMev: commissionVsMevCorrelation
            },
            topPerformers: this.getTopMEVPerformers(jitoValidators, 10),
            efficiency: {
                avgMevPerStake: avgMevRewards24h / (jitoValidators.reduce((sum, v) => sum + v.activatedStake, 0) / 1e9),
                avgMevPerBundle: avgMevRewards24h / Math.max(avgBundles24h, 1)
            }
        };
    }

    /**
     * Perform statistical significance tests
     */
    performSignificanceTests(jitoValidators, regularValidators) {
        const tests = {};
        
        // T-test for APY difference
        const jitoAPYs = jitoValidators.map(v => v.performance.apy);
        const regularAPYs = regularValidators.map(v => v.performance.apy);
        tests.apyTTest = this.performTTest(jitoAPYs, regularAPYs);
        
        // T-test for skip rate difference
        const jitoSkipRates = jitoValidators.map(v => v.performance.skipRate);
        const regularSkipRates = regularValidators.map(v => v.performance.skipRate);
        tests.skipRateTTest = this.performTTest(jitoSkipRates, regularSkipRates);
        
        // T-test for uptime difference
        const jitoUptimes = jitoValidators.map(v => v.performance.uptimeScore);
        const regularUptimes = regularValidators.map(v => v.performance.uptimeScore);
        tests.uptimeTTest = this.performTTest(jitoUptimes, regularUptimes);
        
        // T-test for commission difference
        const jitoCommissions = jitoValidators.map(v => v.commission);
        const regularCommissions = regularValidators.map(v => v.commission);
        tests.commissionTTest = this.performTTest(jitoCommissions, regularCommissions);
        
        return tests;
    }

    /**
     * Perform two-sample t-test
     */
    performTTest(sample1, sample2) {
        if (sample1.length < 2 || sample2.length < 2) {
            return { significant: false, reason: 'Insufficient sample size' };
        }
        
        const mean1 = sample1.reduce((sum, x) => sum + x, 0) / sample1.length;
        const mean2 = sample2.reduce((sum, x) => sum + x, 0) / sample2.length;
        
        const var1 = sample1.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (sample1.length - 1);
        const var2 = sample2.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (sample2.length - 1);
        
        const pooledStdError = Math.sqrt(var1 / sample1.length + var2 / sample2.length);
        const tStatistic = (mean1 - mean2) / pooledStdError;
        
        // Degrees of freedom (approximate)
        const df = sample1.length + sample2.length - 2;
        
        // Critical value for 95% confidence (approximate)
        const criticalValue = 1.96; // Simplified
        
        return {
            tStatistic,
            degreesOfFreedom: df,
            significant: Math.abs(tStatistic) > criticalValue,
            meanDifference: mean1 - mean2,
            confidenceInterval: {
                lower: (mean1 - mean2) - criticalValue * pooledStdError,
                upper: (mean1 - mean2) + criticalValue * pooledStdError
            }
        };
    }

    /**
     * Analyze trends over time
     */
    analyzeTrends() {
        const historicalData = Array.from(this.comparisonHistory.values())
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-30); // Last 30 data points
        
        if (historicalData.length < 3) {
            return { insufficient_data: true };
        }
        
        const trends = {
            jitoMarketShare: this.calculateTrend(historicalData.map(d => d.basicComparison.jito.marketShare)),
            apyDifference: this.calculateTrend(historicalData.map(d => d.performanceComparison.differences.avgAPY)),
            skipRateDifference: this.calculateTrend(historicalData.map(d => d.performanceComparison.differences.avgSkipRate)),
            mevEfficiency: this.calculateTrend(historicalData.map(d => d.mevComparison.avgMevEfficiency))
        };
        
        return trends;
    }

    /**
     * Calculate trend (slope) for a series of values
     */
    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const xSum = (n * (n - 1)) / 2; // Sum of indices 0,1,2,...,n-1
        const ySum = values.reduce((sum, y) => sum + y, 0);
        const xySum = values.reduce((sum, y, x) => sum + x * y, 0);
        const xSquaredSum = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices
        
        const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);
        const intercept = (ySum - slope * xSum) / n;
        
        return { slope, intercept, direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable' };
    }

    /**
     * Analyze correlations between different metrics
     */
    analyzeCorrelations(jitoValidators) {
        if (jitoValidators.length < 3) {
            return { insufficient_data: true };
        }
        
        const stakes = jitoValidators.map(v => v.activatedStake);
        const apys = jitoValidators.map(v => v.performance.apy);
        const commissions = jitoValidators.map(v => v.commission);
        const mevEfficiencies = jitoValidators.map(v => v.performance.mevEfficiency);
        const uptimeScores = jitoValidators.map(v => v.performance.uptimeScore);
        
        return {
            stakeVsAPY: this.calculateCorrelation(stakes, apys),
            stakeVsMEV: this.calculateCorrelation(stakes, mevEfficiencies),
            commissionVsAPY: this.calculateCorrelation(commissions, apys),
            commissionVsMEV: this.calculateCorrelation(commissions, mevEfficiencies),
            uptimeVsMEV: this.calculateCorrelation(uptimeScores, mevEfficiencies),
            apyVsMEV: this.calculateCorrelation(apys, mevEfficiencies)
        };
    }

    /**
     * Calculate Pearson correlation coefficient
     */
    calculateCorrelation(x, y) {
        if (x.length !== y.length || x.length < 2) return 0;
        
        const n = x.length;
        const xMean = x.reduce((sum, val) => sum + val, 0) / n;
        const yMean = y.reduce((sum, val) => sum + val, 0) / n;
        
        let numerator = 0;
        let xDenominator = 0;
        let yDenominator = 0;
        
        for (let i = 0; i < n; i++) {
            const xDiff = x[i] - xMean;
            const yDiff = y[i] - yMean;
            
            numerator += xDiff * yDiff;
            xDenominator += xDiff * xDiff;
            yDenominator += yDiff * yDiff;
        }
        
        const denominator = Math.sqrt(xDenominator * yDenominator);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * Calculate Gini coefficient for inequality measurement
     */
    calculateGiniCoefficient(values) {
        if (values.length === 0) return 0;
        
        const sortedValues = values.slice().sort((a, b) => a - b);
        const n = sortedValues.length;
        const sum = sortedValues.reduce((acc, val) => acc + val, 0);
        
        if (sum === 0) return 0;
        
        let gini = 0;
        for (let i = 0; i < n; i++) {
            gini += (2 * (i + 1) - n - 1) * sortedValues[i];
        }
        
        return gini / (n * sum);
    }

    /**
     * Calculate standard deviation
     */
    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        
        return Math.sqrt(variance);
    }

    /**
     * Calculate performance distribution
     */
    calculatePerformanceDistribution(values) {
        if (values.length === 0) return [];
        
        const sorted = values.slice().sort((a, b) => a - b);
        
        return {
            min: sorted[0],
            q25: sorted[Math.floor(sorted.length * 0.25)],
            median: sorted[Math.floor(sorted.length * 0.5)],
            q75: sorted[Math.floor(sorted.length * 0.75)],
            max: sorted[sorted.length - 1],
            mean: values.reduce((sum, val) => sum + val, 0) / values.length,
            stdDev: this.calculateStandardDeviation(values)
        };
    }

    /**
     * Get top MEV performers
     */
    getTopMEVPerformers(jitoValidators, limit = 10) {
        return jitoValidators
            .sort((a, b) => b.performance.mevEfficiency - a.performance.mevEfficiency)
            .slice(0, limit)
            .map((validator, index) => ({
                rank: index + 1,
                votePubkey: validator.votePubkey,
                mevEfficiency: validator.performance.mevEfficiency,
                activatedStake: validator.activatedStake,
                commission: validator.commission,
                apy: validator.performance.apy
            }));
    }

    /**
     * Generate insights from comparison data
     */
    generateInsights(basicComparison, performanceComparison, mevComparison) {
        const insights = [];
        
        // Market share insights
        if (basicComparison.jito.marketShare > 0.15) {
            insights.push({
                type: 'market_dominance',
                message: `Jito validators control ${(basicComparison.jito.marketShare * 100).toFixed(1)}% of network stake`,
                severity: 'info'
            });
        }
        
        // Performance insights
        const apyImprovement = performanceComparison.relativeDifferences.apyImprovement;
        if (Math.abs(apyImprovement) > 5) {
            insights.push({
                type: 'apy_difference',
                message: `Jito validators show ${apyImprovement > 0 ? 'higher' : 'lower'} APY by ${Math.abs(apyImprovement).toFixed(1)}%`,
                severity: apyImprovement > 0 ? 'positive' : 'negative'
            });
        }
        
        // Commission insights
        const commissionDiff = basicComparison.differences.avgCommission;
        if (Math.abs(commissionDiff) > 1) {
            insights.push({
                type: 'commission_difference',
                message: `Jito validators have ${commissionDiff > 0 ? 'higher' : 'lower'} average commission by ${Math.abs(commissionDiff).toFixed(1)}%`,
                severity: commissionDiff > 0 ? 'warning' : 'positive'
            });
        }
        
        // MEV efficiency insights
        if (mevComparison.avgMevEfficiency > 70) {
            insights.push({
                type: 'mev_performance',
                message: `High MEV efficiency observed with average score of ${mevComparison.avgMevEfficiency.toFixed(1)}`,
                severity: 'positive'
            });
        }
        
        return insights;
    }

    /**
     * Get current comparison data
     */
    getCurrentComparison() {
        return this.metrics.current;
    }

    /**
     * Get historical comparison data
     */
    getHistoricalComparison(limit = 100) {
        return Array.from(this.comparisonHistory.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    /**
     * Clean up old comparison data
     */
    cleanupOldData() {
        const cutoff = Date.now() - (this.config.historicalPeriods * 24 * 60 * 60 * 1000);
        
        for (const [timestamp] of this.comparisonHistory) {
            if (timestamp < cutoff) {
                this.comparisonHistory.delete(timestamp);
            }
        }
    }

    /**
     * Stop comparison analysis
     */
    stop() {
        if (this.comparisonInterval) {
            clearInterval(this.comparisonInterval);
            this.comparisonInterval = null;
        }
        
        this.emit('comparisonStopped');
    }
}

module.exports = JitoValidatorComparison;