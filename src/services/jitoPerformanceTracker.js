const { EventEmitter } = require('events');

/**
 * Jito Performance Tracking System
 * Tracks simulated vs actual performance metrics with detailed analytics
 */
class JitoPerformanceTracker extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            metricsRetentionDays: config.metricsRetentionDays || 30,
            updateInterval: config.updateInterval || 60000, // 1 minute
            alertThresholds: {
                accuracyDrop: config.accuracyDrop || 0.1,
                latencyIncrease: config.latencyIncrease || 50, // 50% increase
                successRateDrop: config.successRateDrop || 0.15
            },
            ...config
        };

        // Performance data storage
        this.metrics = {
            realTime: {
                simulated: new Map(),
                actual: new Map(),
                comparison: new Map()
            },
            historical: {
                daily: new Map(),
                hourly: new Map(),
                trends: []
            },
            alerts: []
        };

        // Current performance snapshot
        this.currentMetrics = {
            accuracy: 0,
            latencyAccuracy: 0,
            successRatePrediction: 0,
            tipOptimizationEffectiveness: 0,
            modelConfidence: 0,
            lastUpdated: Date.now()
        };

        this.startTracking();
    }

    /**
     * Track bundle submission (simulated)
     */
    trackSimulatedSubmission(bundleId, prediction, submissionData) {
        const entry = {
            bundleId,
            timestamp: Date.now(),
            prediction: {
                successProbability: prediction.successProbability,
                estimatedLatency: prediction.estimatedLatency || 1000,
                recommendedTip: prediction.recommendedTip,
                confidence: prediction.confidence
            },
            submissionData: {
                actualTip: submissionData.tipAmount,
                bundleSize: submissionData.bundleSize,
                networkConditions: submissionData.networkConditions
            },
            status: 'pending_actual'
        };

        this.metrics.realTime.simulated.set(bundleId, entry);
        this.emit('simulatedSubmission', entry);
    }

    /**
     * Track actual bundle result
     */
    trackActualResult(bundleId, actualResult) {
        const entry = {
            bundleId,
            timestamp: Date.now(),
            result: {
                success: actualResult.success,
                actualLatency: actualResult.latency,
                confirmationSlot: actualResult.confirmationSlot,
                failureReason: actualResult.failureReason
            },
            status: 'completed'
        };

        this.metrics.realTime.actual.set(bundleId, entry);
        
        // Create comparison if we have simulated data
        if (this.metrics.realTime.simulated.has(bundleId)) {
            this.createComparison(bundleId);
        }
        
        this.emit('actualResult', entry);
    }

    /**
     * Create comparison between simulated and actual results
     */
    createComparison(bundleId) {
        const simulated = this.metrics.realTime.simulated.get(bundleId);
        const actual = this.metrics.realTime.actual.get(bundleId);
        
        if (!simulated || !actual) return;

        const comparison = {
            bundleId,
            timestamp: Date.now(),
            accuracy: {
                successPrediction: this.calculateSuccessAccuracy(simulated, actual),
                latencyPrediction: this.calculateLatencyAccuracy(simulated, actual),
                tipEffectiveness: this.calculateTipEffectiveness(simulated, actual)
            },
            deviations: {
                successDeviation: actual.result.success ? 1 : 0 - simulated.prediction.successProbability,
                latencyDeviation: actual.result.actualLatency - simulated.prediction.estimatedLatency,
                tipDeviation: simulated.submissionData.actualTip - (simulated.prediction.recommendedTip || 15000)
            },
            insights: this.generateInsights(simulated, actual)
        };

        this.metrics.realTime.comparison.set(bundleId, comparison);
        this.updateCurrentMetrics();
        this.checkForAlerts(comparison);
        
        this.emit('comparisonCreated', comparison);
    }

    /**
     * Calculate success prediction accuracy
     */
    calculateSuccessAccuracy(simulated, actual) {
        const predicted = simulated.prediction.successProbability > 0.5;
        const actualSuccess = actual.result.success;
        
        return {
            correct: predicted === actualSuccess,
            confidenceScore: simulated.prediction.confidence,
            predictionStrength: Math.abs(simulated.prediction.successProbability - 0.5)
        };
    }

    /**
     * Calculate latency prediction accuracy
     */
    calculateLatencyAccuracy(simulated, actual) {
        const predicted = simulated.prediction.estimatedLatency;
        const actualLatency = actual.result.actualLatency;
        const deviation = Math.abs(predicted - actualLatency);
        const accuracy = Math.max(0, 1 - (deviation / predicted));
        
        return {
            accuracy,
            deviation,
            relativeError: deviation / predicted,
            acceptable: deviation < predicted * 0.3 // Within 30%
        };
    }

    /**
     * Calculate tip effectiveness
     */
    calculateTipEffectiveness(simulated, actual) {
        const recommended = simulated.prediction.recommendedTip || 15000;
        const used = simulated.submissionData.actualTip;
        const success = actual.result.success;
        
        return {
            followedRecommendation: Math.abs(used - recommended) < recommended * 0.2,
            tipOptimal: success && used <= recommended * 1.1,
            overPaid: success && used > recommended * 1.5,
            underPaid: !success && used < recommended * 0.8
        };
    }

    /**
     * Generate insights from comparison
     */
    generateInsights(simulated, actual) {
        const insights = [];
        
        // Success prediction insights
        if (simulated.prediction.successProbability > 0.8 && !actual.result.success) {
            insights.push({
                type: 'false_positive',
                message: 'High confidence prediction failed - model may be overconfident',
                severity: 'high'
            });
        }
        
        if (simulated.prediction.successProbability < 0.3 && actual.result.success) {
            insights.push({
                type: 'false_negative',
                message: 'Low confidence prediction succeeded - model may be too conservative',
                severity: 'medium'
            });
        }
        
        // Latency insights
        const latencyRatio = actual.result.actualLatency / simulated.prediction.estimatedLatency;
        if (latencyRatio > 2) {
            insights.push({
                type: 'latency_underestimate',
                message: 'Actual latency significantly higher than predicted',
                severity: 'medium'
            });
        }
        
        // Tip insights
        const tipRatio = simulated.submissionData.actualTip / (simulated.prediction.recommendedTip || 15000);
        if (!actual.result.success && tipRatio < 0.8) {
            insights.push({
                type: 'insufficient_tip',
                message: 'Bundle failed likely due to insufficient tip',
                severity: 'high'
            });
        }
        
        return insights;
    }

    /**
     * Update current performance metrics
     */
    updateCurrentMetrics() {
        const comparisons = Array.from(this.metrics.realTime.comparison.values());
        if (comparisons.length === 0) return;

        // Calculate accuracy metrics
        const successAccuracies = comparisons.map(c => c.accuracy.successPrediction.correct ? 1 : 0);
        this.currentMetrics.accuracy = successAccuracies.reduce((sum, a) => sum + a, 0) / successAccuracies.length;

        const latencyAccuracies = comparisons.map(c => c.accuracy.latencyPrediction.accuracy);
        this.currentMetrics.latencyAccuracy = latencyAccuracies.reduce((sum, a) => sum + a, 0) / latencyAccuracies.length;

        // Model confidence
        const confidences = comparisons.map(c => {
            const simulated = this.metrics.realTime.simulated.get(c.bundleId);
            return simulated?.prediction.confidence || 0;
        });
        this.currentMetrics.modelConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

        this.currentMetrics.lastUpdated = Date.now();
        this.emit('metricsUpdated', this.currentMetrics);
    }

    /**
     * Check for performance alerts
     */
    checkForAlerts(comparison) {
        const alerts = [];
        
        // Accuracy drop alert
        if (this.currentMetrics.accuracy < (1 - this.config.alertThresholds.accuracyDrop)) {
            alerts.push({
                type: 'accuracy_drop',
                severity: 'high',
                message: `Model accuracy dropped to ${(this.currentMetrics.accuracy * 100).toFixed(1)}%`,
                threshold: this.config.alertThresholds.accuracyDrop,
                currentValue: this.currentMetrics.accuracy
            });
        }

        // Latency prediction alert
        if (comparison.accuracy.latencyPrediction.relativeError > this.config.alertThresholds.latencyIncrease) {
            alerts.push({
                type: 'latency_prediction_error',
                severity: 'medium',
                message: `Latency prediction error: ${(comparison.accuracy.latencyPrediction.relativeError * 100).toFixed(1)}%`,
                bundleId: comparison.bundleId
            });
        }

        // Store and emit alerts
        alerts.forEach(alert => {
            alert.timestamp = Date.now();
            this.metrics.alerts.push(alert);
            this.emit('alert', alert);
        });
    }

    /**
     * Get comprehensive performance report
     */
    getPerformanceReport(timeframe = '24h') {
        const cutoff = this.getTimeCutoff(timeframe);
        const relevantComparisons = Array.from(this.metrics.realTime.comparison.values())
            .filter(c => c.timestamp >= cutoff);

        if (relevantComparisons.length === 0) {
            return { error: 'No data available for the specified timeframe' };
        }

        return {
            summary: {
                totalComparisons: relevantComparisons.length,
                timeframe,
                generatedAt: Date.now()
            },
            accuracy: this.calculateAccuracyMetrics(relevantComparisons),
            latency: this.calculateLatencyMetrics(relevantComparisons),
            tips: this.calculateTipMetrics(relevantComparisons),
            trends: this.calculateTrends(relevantComparisons),
            insights: this.generateReportInsights(relevantComparisons),
            alerts: this.getRecentAlerts(cutoff)
        };
    }

    /**
     * Calculate accuracy metrics for report
     */
    calculateAccuracyMetrics(comparisons) {
        const successPredictions = comparisons.map(c => c.accuracy.successPrediction.correct ? 1 : 0);
        const highConfidencePredictions = comparisons.filter(c => {
            const simulated = this.metrics.realTime.simulated.get(c.bundleId);
            return simulated?.prediction.confidence > 0.8;
        });

        return {
            overall: successPredictions.reduce((sum, a) => sum + a, 0) / successPredictions.length,
            highConfidence: highConfidencePredictions.length > 0 ? 
                highConfidencePredictions.filter(c => c.accuracy.successPrediction.correct).length / highConfidencePredictions.length : 0,
            falsePositives: comparisons.filter(c => !c.accuracy.successPrediction.correct && 
                this.metrics.realTime.simulated.get(c.bundleId)?.prediction.successProbability > 0.5).length,
            falseNegatives: comparisons.filter(c => !c.accuracy.successPrediction.correct && 
                this.metrics.realTime.simulated.get(c.bundleId)?.prediction.successProbability <= 0.5).length
        };
    }

    /**
     * Calculate latency metrics for report
     */
    calculateLatencyMetrics(comparisons) {
        const latencyAccuracies = comparisons.map(c => c.accuracy.latencyPrediction.accuracy);
        const deviations = comparisons.map(c => Math.abs(c.deviations.latencyDeviation));

        return {
            averageAccuracy: latencyAccuracies.reduce((sum, a) => sum + a, 0) / latencyAccuracies.length,
            averageDeviation: deviations.reduce((sum, d) => sum + d, 0) / deviations.length,
            within30Percent: comparisons.filter(c => c.accuracy.latencyPrediction.acceptable).length / comparisons.length,
            maxDeviation: Math.max(...deviations),
            minDeviation: Math.min(...deviations)
        };
    }

    /**
     * Calculate tip optimization metrics
     */
    calculateTipMetrics(comparisons) {
        const tipEffectiveness = comparisons.map(c => c.accuracy.tipEffectiveness);
        
        return {
            followedRecommendations: tipEffectiveness.filter(t => t.followedRecommendation).length / tipEffectiveness.length,
            optimalTips: tipEffectiveness.filter(t => t.tipOptimal).length / tipEffectiveness.length,
            overpaid: tipEffectiveness.filter(t => t.overPaid).length / tipEffectiveness.length,
            underpaid: tipEffectiveness.filter(t => t.underPaid).length / tipEffectiveness.length
        };
    }

    /**
     * Calculate performance trends
     */
    calculateTrends(comparisons) {
        if (comparisons.length < 10) return { insufficient_data: true };

        // Sort by timestamp
        const sorted = comparisons.sort((a, b) => a.timestamp - b.timestamp);
        const midpoint = Math.floor(sorted.length / 2);
        
        const firstHalf = sorted.slice(0, midpoint);
        const secondHalf = sorted.slice(midpoint);
        
        const firstAccuracy = firstHalf.filter(c => c.accuracy.successPrediction.correct).length / firstHalf.length;
        const secondAccuracy = secondHalf.filter(c => c.accuracy.successPrediction.correct).length / secondHalf.length;
        
        return {
            accuracyTrend: secondAccuracy - firstAccuracy,
            improving: secondAccuracy > firstAccuracy,
            stable: Math.abs(secondAccuracy - firstAccuracy) < 0.05
        };
    }

    /**
     * Generate insights for report
     */
    generateReportInsights(comparisons) {
        const insights = [];
        
        const accuracy = this.calculateAccuracyMetrics(comparisons);
        if (accuracy.overall < 0.6) {
            insights.push('Model accuracy is below acceptable threshold - consider retraining');
        }
        
        if (accuracy.falsePositives > comparisons.length * 0.2) {
            insights.push('High false positive rate - model may be overconfident');
        }
        
        const latency = this.calculateLatencyMetrics(comparisons);
        if (latency.within30Percent < 0.7) {
            insights.push('Latency predictions need improvement - less than 70% within acceptable range');
        }
        
        const tips = this.calculateTipMetrics(comparisons);
        if (tips.underpaid > 0.3) {
            insights.push('Tip recommendations may be too low - 30%+ resulted in underpayment');
        }
        
        return insights;
    }

    /**
     * Get alerts for timeframe
     */
    getRecentAlerts(cutoff) {
        return this.metrics.alerts.filter(alert => alert.timestamp >= cutoff);
    }

    /**
     * Export performance data
     */
    exportData(format = 'json') {
        const exportData = {
            currentMetrics: this.currentMetrics,
            comparisons: Array.from(this.metrics.realTime.comparison.values()),
            alerts: this.metrics.alerts,
            exportedAt: Date.now(),
            config: this.config
        };

        if (format === 'csv') {
            return this.convertToCSV(exportData);
        }
        
        return exportData;
    }

    /**
     * Helper methods
     */
    getTimeCutoff(timeframe) {
        const now = Date.now();
        const timeframes = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };
        
        return now - (timeframes[timeframe] || timeframes['24h']);
    }

    convertToCSV(data) {
        // Simplified CSV conversion
        const headers = ['bundleId', 'timestamp', 'successAccuracy', 'latencyAccuracy', 'tipFollowed'];
        const rows = data.comparisons.map(c => [
            c.bundleId,
            new Date(c.timestamp).toISOString(),
            c.accuracy.successPrediction.correct ? 1 : 0,
            c.accuracy.latencyPrediction.accuracy.toFixed(3),
            c.accuracy.tipEffectiveness.followedRecommendation ? 1 : 0
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    startTracking() {    
        // Periodic cleanup and metrics update
        setInterval(() => {
            this.cleanupOldData();
            this.updateCurrentMetrics();
        }, this.config.updateInterval);
    }

    cleanupOldData() {
        const cutoff = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
        
        // Clean up old comparisons
        for (const [id, comparison] of this.metrics.realTime.comparison.entries()) {
            if (comparison.timestamp < cutoff) {
                this.metrics.realTime.comparison.delete(id);
                this.metrics.realTime.simulated.delete(id);
                this.metrics.realTime.actual.delete(id);
            }
        }
        
        // Clean up old alerts
        this.metrics.alerts = this.metrics.alerts.filter(alert => alert.timestamp >= cutoff);
    }

    stop() {
        this.removeAllListeners();
    }
}

module.exports = JitoPerformanceTracker;