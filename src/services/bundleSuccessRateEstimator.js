const { EventEmitter } = require('events');

/**
 * Bundle Success Rate Estimation Engine
 * Uses machine learning-inspired algorithms to predict bundle success rates
 */
class BundleSuccessRateEstimator extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            historyWindowDays: config.historyWindowDays || 30,
            minDataPoints: config.minDataPoints || 50,
            modelUpdateInterval: config.modelUpdateInterval || 300000, // 5 minutes
            predictionConfidenceThreshold: config.predictionConfidenceThreshold || 0.7,
            ...config
        };

        // Historical data storage
        this.historicalData = {
            submissions: new Map(),
            validatorPerformance: new Map(),
            networkConditions: [],
            tipEffectiveness: new Map()
        };

        // Model parameters (simplified ML approach)
        this.model = {
            tipWeights: { base: 0.3, multiplier: 0.4, threshold: 0.1 },
            sizeWeights: { optimal: 3, penalty: 0.15 },
            networkWeights: { congestion: -0.6, validators: 0.2 },
            timeWeights: { hour: new Array(24).fill(0), day: new Array(7).fill(0) },
            validatorWeights: new Map(),
            lastUpdated: Date.now()
        };

        this.initializeModel();
        this.startModelUpdates();
    }

    /**
     * Initialize model with default values
     */
    initializeModel() {
        // Initialize hourly patterns (business hours typically worse)
        for (let hour = 0; hour < 24; hour++) {
            this.model.timeWeights.hour[hour] = 
                (hour >= 9 && hour <= 16) ? -0.1 : 0.1; // Penalize business hours
        }

        // Initialize daily patterns (weekends slightly better)
        for (let day = 0; day < 7; day++) {
            this.model.timeWeights.day[day] = 
                (day === 0 || day === 6) ? 0.05 : 0; // Weekend bonus
        }
    }

    /**
     * Main prediction function
     */
    async estimateSuccessRate(bundle, context = {}) {
        const features = this.extractFeatures(bundle, context);
        const prediction = this.calculatePrediction(features);
        const confidence = this.calculateConfidence(features, prediction);
        
        const result = {
            bundleId: bundle.id || 'unknown',
            successProbability: Math.max(0, Math.min(1, prediction.score)),
            confidence: confidence,
            factors: prediction.factors,
            recommendations: this.generateRecommendations(features, prediction),
            modelVersion: this.model.lastUpdated,
            timestamp: Date.now()
        };

        // Store for model training
        this.storeForTraining(bundle, features, result);
        
        return result;
    }

    /**
     * Extract features from bundle and context
     */
    extractFeatures(bundle, context) {
        const now = new Date();
        
        return {
            // Bundle characteristics
            bundleSize: bundle.transactions?.length || 1,
            tipAmount: bundle.tipAmount || 10000,
            gasEstimate: bundle.estimatedGas || 50000,
            priority: bundle.priority || 'normal',
            
            // Network conditions
            networkCongestion: context.networkCongestion || 0.5,
            currentSlot: context.currentSlot || 0,
            jitoValidatorRatio: context.jitoValidatorRatio || 0.17,
            
            // Temporal features
            hour: now.getHours(),
            dayOfWeek: now.getDay(),
            timestamp: now.getTime(),
            
            // Historical context
            recentSuccessRate: this.getRecentSuccessRate(),
            tipPercentile: this.calculateTipPercentile(bundle.tipAmount || 10000),
            
            // Validator features
            topValidatorAvailable: this.isTopValidatorActive(context),
            validatorDiversity: context.activeValidators || 25
        };
    }

    /**
     * Calculate prediction using weighted features
     */
    calculatePrediction(features) {
        const factors = {};
        let score = 0.5; // Base probability
        
        // Tip factor
        const tipFactor = this.calculateTipFactor(features.tipAmount);
        factors.tip = tipFactor;
        score += tipFactor * this.model.tipWeights.base;
        
        // Bundle size factor
        const sizeFactor = this.calculateSizeFactor(features.bundleSize);
        factors.size = sizeFactor;
        score += sizeFactor * this.model.sizeWeights.penalty;
        
        // Network congestion factor
        const networkFactor = -features.networkCongestion * this.model.networkWeights.congestion;
        factors.network = networkFactor;
        score += networkFactor;
        
        // Time-based factors
        const hourFactor = this.model.timeWeights.hour[features.hour];
        const dayFactor = this.model.timeWeights.day[features.dayOfWeek];
        factors.timing = hourFactor + dayFactor;
        score += factors.timing;
        
        // Validator factor
        const validatorFactor = features.jitoValidatorRatio * this.model.networkWeights.validators;
        factors.validators = validatorFactor;
        score += validatorFactor;
        
        // Priority boost
        const priorityBoost = this.getPriorityBoost(features.priority);
        factors.priority = priorityBoost;
        score += priorityBoost;
        
        return { score, factors };
    }

    /**
     * Calculate tip effectiveness factor
     */
    calculateTipFactor(tipAmount) {
        const recentAvg = this.getRecentAverageTip();
        const ratio = tipAmount / recentAvg;
        
        if (ratio >= 2.0) return 0.4;      // Excellent tip
        if (ratio >= 1.5) return 0.25;     // Good tip
        if (ratio >= 1.0) return 0.1;      // Average tip
        if (ratio >= 0.7) return -0.1;     // Below average
        return -0.3;                       // Poor tip
    }

    /**
     * Calculate bundle size factor
     */
    calculateSizeFactor(size) {
        if (size <= 3) return 0.1;         // Optimal size
        if (size <= 5) return 0;           // Good size
        return -(size - 5) * 0.05;         // Penalty for large bundles
    }

    /**
     * Get priority boost
     */
    getPriorityBoost(priority) {
        const boosts = { urgent: 0.15, high: 0.1, normal: 0, low: -0.05 };
        return boosts[priority] || 0;
    }

    /**
     * Calculate prediction confidence
     */
    calculateConfidence(features, prediction) {
        let confidence = 0.7; // Base confidence
        
        // More data = higher confidence
        const dataPoints = this.historicalData.submissions.size;
        if (dataPoints >= this.config.minDataPoints) {
            confidence += Math.min(0.2, dataPoints / 1000);
        } else {
            confidence -= 0.3; // Reduce confidence with little data
        }
        
        // Network stability affects confidence
        const networkStability = 1 - features.networkCongestion;
        confidence += networkStability * 0.1;
        
        // Extreme values reduce confidence
        if (features.tipAmount > this.getRecentAverageTip() * 3) {
            confidence -= 0.1;
        }
        
        return Math.max(0.1, Math.min(0.95, confidence));
    }

    /**
     * Generate recommendations based on prediction
     */
    generateRecommendations(features, prediction) {
        const recommendations = [];
        
        if (prediction.score < 0.6) {
            if (prediction.factors.tip < 0) {
                recommendations.push({
                    type: 'tip',
                    action: 'increase',
                    message: `Increase tip to ${Math.floor(features.tipAmount * 1.5)} lamports`,
                    impact: 'high',
                    expectedImprovement: 0.15
                });
            }
            
            if (prediction.factors.size < -0.1) {
                recommendations.push({
                    type: 'size',
                    action: 'reduce',
                    message: 'Consider splitting large bundle into smaller ones',
                    impact: 'medium',
                    expectedImprovement: 0.1
                });
            }
        }
        
        if (prediction.factors.timing < -0.05) {
            recommendations.push({
                type: 'timing',
                action: 'delay',
                message: 'Consider delaying submission by 1-2 hours',
                impact: 'low',
                expectedImprovement: 0.05
            });
        }
        
        if (features.networkCongestion > 0.7) {
            recommendations.push({
                type: 'network',
                action: 'wait',
                message: 'High network congestion - consider waiting',
                impact: 'medium',
                expectedImprovement: 0.12
            });
        }
        
        return recommendations;
    }

    /**
     * Batch prediction for multiple bundles
     */
    async estimateBatchSuccessRates(bundles, context = {}) {
        const results = [];
        
        for (const bundle of bundles) {
            const prediction = await this.estimateSuccessRate(bundle, context);
            results.push(prediction);
        }
        
        // Add batch-specific insights
        const batchAnalysis = this.analyzeBatch(results);
        
        return {
            individual: results,
            batch: batchAnalysis,
            recommendations: this.generateBatchRecommendations(results, batchAnalysis)
        };
    }

    /**
     * Analyze batch characteristics
     */
    analyzeBatch(predictions) {
        const scores = predictions.map(p => p.successProbability);
        const confidences = predictions.map(p => p.confidence);
        
        return {
            averageSuccessRate: scores.reduce((sum, s) => sum + s, 0) / scores.length,
            averageConfidence: confidences.reduce((sum, c) => sum + c, 0) / confidences.length,
            highConfidencePredictions: predictions.filter(p => p.confidence > 0.8).length,
            lowSuccessPredictions: predictions.filter(p => p.successProbability < 0.5).length,
            totalBundles: predictions.length
        };
    }

    /**
     * Generate batch-specific recommendations
     */
    generateBatchRecommendations(predictions, batchAnalysis) {
        const recommendations = [];
        
        if (batchAnalysis.averageSuccessRate < 0.6) {
            recommendations.push({
                type: 'batch_optimization',
                message: 'Consider optimizing batch: low average success rate',
                actions: ['increase_tips', 'reduce_bundle_sizes', 'improve_timing']
            });
        }
        
        if (batchAnalysis.lowSuccessPredictions > predictions.length * 0.3) {
            recommendations.push({
                type: 'bundle_filtering',
                message: 'Remove or optimize bundles with success rate < 50%',
                affectedBundles: predictions
                    .filter(p => p.successProbability < 0.5)
                    .map(p => p.bundleId)
            });
        }
        
        return recommendations;
    }

    /**
     * Update model with actual results
     */
    updateModelWithResults(bundleId, actualSuccess, actualLatency) {
        const historicalData = this.historicalData.submissions.get(bundleId);
        if (!historicalData) return;
        
        // Simple learning: adjust weights based on prediction accuracy
        const prediction = historicalData.prediction;
        const error = actualSuccess ? 1 : 0 - prediction.successProbability;
        
        // Update model weights (simplified gradient descent)
        const learningRate = 0.01;
        
        if (Math.abs(error) > 0.1) {
            // Adjust tip weights if tip prediction was wrong
            if (prediction.factors.tip !== 0) {
                this.model.tipWeights.base += error * learningRate * Math.sign(prediction.factors.tip);
            }
            
            // Adjust network weights
            if (prediction.factors.network !== 0) {
                this.model.networkWeights.congestion += error * learningRate;
            }
        }
        
        this.model.lastUpdated = Date.now();
        this.emit('modelUpdated', { bundleId, error, actualSuccess });
    }

    /**
     * Get model performance metrics
     */
    getModelPerformance() {
        const submissions = Array.from(this.historicalData.submissions.values());
        const completed = submissions.filter(s => s.actualResult !== undefined);
        
        if (completed.length === 0) {
            return { accuracy: 0, totalPredictions: 0, dataPoints: submissions.length };
        }
        
        const correct = completed.filter(s => {
            const predicted = s.prediction.successProbability > 0.5;
            return predicted === s.actualResult.success;
        }).length;
        
        return {
            accuracy: correct / completed.length,
            totalPredictions: completed.length,
            dataPoints: submissions.length,
            averageConfidence: completed.reduce((sum, s) => sum + s.prediction.confidence, 0) / completed.length
        };
    }

    /**
     * Helper methods
     */
    getRecentSuccessRate() {
        const recent = Array.from(this.historicalData.submissions.values())
            .filter(s => Date.now() - s.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
            .filter(s => s.actualResult !== undefined);
        
        if (recent.length === 0) return 0.7; // Default
        
        return recent.filter(s => s.actualResult.success).length / recent.length;
    }

    getRecentAverageTip() {
        const recent = Array.from(this.historicalData.submissions.values())
            .filter(s => Date.now() - s.timestamp < 24 * 60 * 60 * 1000);
        
        if (recent.length === 0) return 15000; // Default
        
        return recent.reduce((sum, s) => sum + s.features.tipAmount, 0) / recent.length;
    }

    calculateTipPercentile(tipAmount) {
        const recent = Array.from(this.historicalData.submissions.values())
            .map(s => s.features?.tipAmount || 15000)
            .sort((a, b) => a - b);
        
        if (recent.length === 0) return 0.5;
        
        const index = recent.findIndex(t => t >= tipAmount);
        return index === -1 ? 1 : index / recent.length;
    }

    isTopValidatorActive(context) {
        return context.topValidatorActive || Math.random() > 0.3; // Mock for now
    }

    storeForTraining(bundle, features, prediction) {
        this.historicalData.submissions.set(bundle.id || Date.now().toString(), {
            bundle,
            features,
            prediction,
            timestamp: Date.now(),
            actualResult: undefined // Will be updated when results come in
        });
        
        // Cleanup old data
        const cutoff = Date.now() - (this.config.historyWindowDays * 24 * 60 * 60 * 1000);
        for (const [id, data] of this.historicalData.submissions.entries()) {
            if (data.timestamp < cutoff) {
                this.historicalData.submissions.delete(id);
            }
        }
    }

    startModelUpdates() {
        setInterval(() => {
            this.emit('modelUpdate', this.getModelPerformance());
        }, this.config.modelUpdateInterval);
    }

    stop() {
        this.removeAllListeners();
    }
}

module.exports = BundleSuccessRateEstimator;