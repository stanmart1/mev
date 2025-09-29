const { EventEmitter } = require('events');

/**
 * Core Jito Integration Service
 * Main orchestrator for MEV bundle creation, submission, and performance tracking
 */
class JitoIntegrationService extends EventEmitter {
    constructor(solanaService, databasePool, config = {}) {
        super();
        this.solanaService = solanaService;
        this.databasePool = databasePool;
        this.config = config;
        
        // Lazy-loaded components to avoid circular dependencies
        this._bundleConstructor = null;
        this._bundleComposer = null;
        this._jitoSimulator = null;
        this._mockSubmissionService = null;
        this._successRateEstimator = null;
        this._performanceTracker = null;
        
        this.stats = {
            bundlesCreated: 0,
            bundlesSubmitted: 0,
            bundlesSuccessful: 0,
            totalProfitSimulated: 0,
            averageSuccessRate: 0
        };
        
        this.isRunning = false;
    }

    /**
     * Initialize all components
     */
    async initialize() {
        if (this.isRunning) return;

        // Load dependencies
        const MEVBundleConstructor = require('./mevBundleConstructor');
        const OptimalBundleComposer = require('./optimalBundleComposer');
        const JitoBlockEngineSimulator = require('./jitoBlockEngineSimulator');
        const MockJitoSubmissionService = require('./mockJitoSubmissionService');
        const BundleSuccessRateEstimator = require('./bundleSuccessRateEstimator');
        const JitoPerformanceTracker = require('./jitoPerformanceTracker');

        // Initialize components
        this._bundleConstructor = new MEVBundleConstructor(this.solanaService, this.databasePool);
        this._bundleComposer = new OptimalBundleComposer(this._bundleConstructor);
        this._jitoSimulator = new JitoBlockEngineSimulator(this.solanaService, this.config.simulator);
        this._mockSubmissionService = new MockJitoSubmissionService(this.solanaService, {
            ...this.config.mockService,
            simulator: this.config.simulator
        });
        this._successRateEstimator = new BundleSuccessRateEstimator(this.config.estimator);
        this._performanceTracker = new JitoPerformanceTracker(this.config.tracker);

        this.setupEventHandlers();
        this.isRunning = true;
        
        this.emit('initialized');
    }

    /**
     * Set up event handlers between components
     */
    setupEventHandlers() {
        this._bundleConstructor.on('bundleCreated', (bundle) => {
            this.stats.bundlesCreated++;
            this.emit('bundleCreated', bundle);
        });

        this._successRateEstimator.on('modelUpdated', (metrics) => {
            this.emit('modelUpdated', metrics);
        });

        this._performanceTracker.on('alert', (alert) => {
            this.emit('performanceAlert', alert);
        });
    }

    /**
     * Create and submit optimized MEV bundle
     */
    async createAndSubmitOptimizedBundle(opportunities, constraints = {}, options = {}) {
        if (!this.isRunning) await this.initialize();

        try {
            // Step 1: Compose optimal bundle
            const bundleComposition = await this._bundleComposer.composeOptimalBundle(
                opportunities, 
                {
                    maxBundleSize: 5,
                    minProfitThreshold: 0.001,
                    riskTolerance: 'medium',
                    ...constraints
                },
                options.strategy || 'balanced'
            );

            if (!bundleComposition || !bundleComposition.success) {
                return {
                    success: false,
                    error: 'Failed to compose viable bundle',
                    details: bundleComposition
                };
            }

            // Step 2: Get network context and estimate success rate
            const networkContext = await this.getCurrentNetworkContext();
            const successEstimation = await this._successRateEstimator.estimateSuccessRate(
                bundleComposition.bundle,
                networkContext
            );

            // Step 3: Optimize bundle if needed
            let optimizedBundle = bundleComposition.bundle;
            if (successEstimation.successProbability < 0.6) {
                optimizedBundle = await this.optimizeBundleForSuccess(
                    bundleComposition.bundle,
                    successEstimation.recommendations
                );
            }

            // Step 4: Calculate submission parameters
            const submissionOptions = {
                tipAmount: this.calculateOptimalTip(optimizedBundle, successEstimation),
                priority: this.determinePriority(successEstimation),
                strategy: options.strategy,
                expectedProfit: bundleComposition.estimatedProfit,
                realSubmission: options.realSubmission || false
            };

            // Step 5: Submit to Jito simulation
            const submissionResult = await this._mockSubmissionService.submitBundle(
                optimizedBundle.transactions,
                submissionOptions
            );

            // Step 6: Track performance
            this._performanceTracker.trackSimulatedSubmission(
                submissionResult.bundleId,
                {
                    ...successEstimation,
                    estimatedLatency: submissionResult.estimatedConfirmationTime,
                    recommendedTip: submissionOptions.tipAmount
                },
                {
                    tipAmount: submissionOptions.tipAmount,
                    bundleSize: optimizedBundle.transactions.length,
                    networkConditions: networkContext
                }
            );

            // Update stats
            this.stats.bundlesSubmitted++;
            this.updateAverageSuccessRate(successEstimation.successProbability);

            const result = {
                success: true,
                bundleId: submissionResult.bundleId,
                originalComposition: bundleComposition,
                successEstimation,
                submissionResult,
                optimization: {
                    applied: optimizedBundle !== bundleComposition.bundle,
                    tipAmount: submissionOptions.tipAmount,
                    priority: submissionOptions.priority
                },
                expectedOutcome: {
                    successProbability: successEstimation.successProbability,
                    estimatedProfit: bundleComposition.estimatedProfit,
                    estimatedLatency: submissionResult.estimatedConfirmationTime
                }
            };

            // Store in database
            await this.storeBundleSubmission(result);
            
            return result;

        } catch (error) {
            console.error('Error in createAndSubmitOptimizedBundle:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Submit batch of bundles with optimization
     */
    async submitOptimizedBatch(opportunityBatches, options = {}) {
        if (!this.isRunning) await this.initialize();

        const batchId = `batch_${Date.now()}`;
        const results = [];
        
        // Analyze and optimize batch timing
        const batchAnalysis = await this.analyzeBatchOpportunities(opportunityBatches);
        
        for (let i = 0; i < opportunityBatches.length; i++) {
            const opportunities = opportunityBatches[i];
            const batchOptions = {
                ...options,
                batchIndex: i,
                batchTotal: opportunityBatches.length,
                batchAnalysis
            };

            const result = await this.createAndSubmitOptimizedBundle(
                opportunities,
                options.constraints,
                batchOptions
            );

            results.push(result);

            // Add delay between submissions if recommended
            if (batchAnalysis.recommendedDelay && i < opportunityBatches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, batchAnalysis.recommendedDelay));
            }
        }

        const batchResult = {
            batchId,
            totalBundles: opportunityBatches.length,
            results,
            batchMetrics: {
                successCount: results.filter(r => r.success).length,
                totalExpectedProfit: results.reduce((sum, r) => 
                    sum + (r.expectedOutcome?.estimatedProfit || 0), 0),
                averageSuccessRate: results.reduce((sum, r) => 
                    sum + (r.successEstimation?.successProbability || 0), 0) / results.length
            }
        };

        await this.storeBatchSubmission(batchResult);
        return batchResult;
    }

    /**
     * Get current network context for predictions
     */
    async getCurrentNetworkContext() {
        const simulatorMetrics = this._jitoSimulator.getSimulationMetrics();
        
        return {
            currentSlot: simulatorMetrics.networkStats.currentSlot,
            networkCongestion: simulatorMetrics.networkStats.networkCongestion,
            jitoValidatorRatio: simulatorMetrics.networkStats.jitoValidators / 
                              simulatorMetrics.networkStats.totalValidators,
            activeValidators: simulatorMetrics.networkStats.totalValidators,
            blockTime: 400
        };
    }

    /**
     * Optimize bundle based on success rate recommendations
     */
    async optimizeBundleForSuccess(bundle, recommendations) {
        let optimizedBundle = { ...bundle };
        
        for (const rec of recommendations) {
            switch (rec.type) {
                case 'tip':
                    if (rec.action === 'increase') {
                        optimizedBundle.recommendedTip = (optimizedBundle.recommendedTip || 15000) * 1.3;
                    }
                    break;
                case 'size':
                    if (rec.action === 'reduce' && bundle.transactions.length > 3) {
                        // Remove lowest priority transactions
                        optimizedBundle.transactions = bundle.transactions.slice(0, 3);
                    }
                    break;
                case 'timing':
                    if (rec.action === 'delay') {
                        optimizedBundle.delayRecommended = rec.suggestedDelay || 2000;
                    }
                    break;
            }
        }
        
        return optimizedBundle;
    }

    /**
     * Calculate optimal tip amount
     */
    calculateOptimalTip(bundle, estimation) {
        const baseTip = this._jitoSimulator.getOptimalTipRecommendation(
            bundle.transactions.length, 
            'normal'
        );
        
        // Adjust based on success probability
        if (estimation.successProbability < 0.5) {
            return Math.floor(baseTip * 1.5);
        } else if (estimation.successProbability > 0.8) {
            return baseTip;
        }
        
        return Math.floor(baseTip * 1.2);
    }

    /**
     * Determine submission priority
     */
    determinePriority(estimation) {
        if (estimation.successProbability > 0.8) return 'normal';
        if (estimation.successProbability > 0.6) return 'high';
        return 'urgent';
    }

    /**
     * Analyze batch opportunities for optimization
     */
    async analyzeBatchOpportunities(batches) {
        const totalBundles = batches.length;
        const avgBundleSize = batches.reduce((sum, b) => sum + b.length, 0) / totalBundles;
        
        return {
            totalBundles,
            avgBundleSize,
            recommendedDelay: totalBundles > 5 ? 200 : 100, // ms between submissions
            riskLevel: avgBundleSize > 4 ? 'high' : 'medium',
            batchOptimizations: [
                'Stagger submissions to avoid validator overload',
                'Prioritize higher profit bundles first'
            ]
        };
    }

    /**
     * Update running average success rate
     */
    updateAverageSuccessRate(newRate) {
        const weight = 0.1; // Exponential moving average
        this.stats.averageSuccessRate = 
            this.stats.averageSuccessRate * (1 - weight) + newRate * weight;
    }

    /**
     * Store bundle submission in database
     */
    async storeBundleSubmission(result) {
        try {
            const query = `
                INSERT INTO jito_bundle_submissions 
                (bundle_id, success_probability, estimated_profit, tip_amount, priority, created_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
            `;
            
            await this.databasePool.query(query, [
                result.bundleId,
                result.successEstimation.successProbability,
                result.expectedOutcome.estimatedProfit,
                result.optimization.tipAmount,
                result.optimization.priority
            ]);
        } catch (error) {
            console.error('Error storing bundle submission:', error);
        }
    }

    /**
     * Store batch submission in database
     */
    async storeBatchSubmission(batchResult) {
        try {
            const query = `
                INSERT INTO jito_batch_submissions 
                (batch_id, total_bundles, success_count, total_expected_profit, average_success_rate, created_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
            `;
            
            await this.databasePool.query(query, [
                batchResult.batchId,
                batchResult.totalBundles,
                batchResult.batchMetrics.successCount,
                batchResult.batchMetrics.totalExpectedProfit,
                batchResult.batchMetrics.averageSuccessRate
            ]);
        } catch (error) {
            console.error('Error storing batch submission:', error);
        }
    }

    /**
     * Get comprehensive system status
     */
    getSystemStatus() {
        return {
            isRunning: this.isRunning,
            stats: this.stats,
            simulatorMetrics: this._jitoSimulator?.getSimulationMetrics(),
            performanceMetrics: this._performanceTracker?.getPerformanceComparison(),
            modelPerformance: this._successRateEstimator?.getModelPerformance()
        };
    }

    /**
     * Get bundle status
     */
    async getBundleStatus(bundleId) {
        if (!this._jitoSimulator) return { error: 'System not initialized' };
        return await this._jitoSimulator.getBundleStatus(bundleId);
    }

    /**
     * Get performance report
     */
    getPerformanceReport(timeframe = '24h') {
        if (!this._performanceTracker) return { error: 'Performance tracking not initialized' };
        return this._performanceTracker.getPerformanceReport(timeframe);
    }

    /**
     * Stop all services
     */
    async stop() {
        if (this._jitoSimulator) this._jitoSimulator.stop();
        if (this._mockSubmissionService) this._mockSubmissionService.stop();
        if (this._successRateEstimator) this._successRateEstimator.stop();
        if (this._performanceTracker) this._performanceTracker.stop();
        
        this.isRunning = false;
        this.emit('stopped');
    }
}

module.exports = JitoIntegrationService;