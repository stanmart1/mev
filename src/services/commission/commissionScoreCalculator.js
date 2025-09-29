/**
 * Commission Score Calculator
 * 
 * Contains individual scoring algorithms for different aspects
 * of commission optimization analysis
 */
class CommissionScoreCalculator {
    constructor(config) {
        this.config = config;
    }

    /**
     * Calculate rate competitiveness score (35% weight)
     * @param {Object} data - Commission data
     * @returns {number} Rate competitiveness score (0-100)
     */
    calculateRateCompetitivenessScore(data) {
        const { commission_rate = 100 } = data;

        // Base score calculation (lower commission = higher score)
        let baseScore = Math.max(0, 100 - (commission_rate * 2)); // 50% commission = 0 points

        // Apply tier-based bonuses and penalties
        if (commission_rate <= this.config.thresholds.excellentCommission) {
            baseScore = Math.min(100, baseScore * 1.2); // 20% bonus for excellent rates
        } else if (commission_rate <= this.config.thresholds.goodCommission) {
            baseScore = Math.min(100, baseScore * 1.1); // 10% bonus for good rates
        } else if (commission_rate > this.config.thresholds.highCommission) {
            baseScore = Math.max(0, baseScore * 0.7); // 30% penalty for high rates
        }

        // Market position adjustment
        const marketDifference = commission_rate - this.config.thresholds.marketAverageCommission;
        const marketAdjustment = Math.max(-15, Math.min(15, -marketDifference * 2)); // ±15 point adjustment
        
        const finalScore = Math.max(0, Math.min(100, baseScore + marketAdjustment));
        return Math.round(finalScore * 100) / 100;
    }

    /**
     * Calculate performance-to-fee ratio score (25% weight)
     * @param {Object} data - Commission data
     * @returns {number} Performance ratio score (0-100)
     */
    calculatePerformanceToFeeRatio(data) {
        const performanceRatio = data.performance_ratio || 0;

        // Score based on performance ratio (higher ratio = better value)
        let score = Math.min(100, (performanceRatio / 2.0) * 100); // Ratio of 2.0 = 100 points

        // Apply performance thresholds
        if (performanceRatio >= 2.5) {
            score = Math.min(100, score * 1.15); // 15% bonus for exceptional performance
        } else if (performanceRatio >= 2.0) {
            score = Math.min(100, score * 1.1); // 10% bonus for excellent performance
        } else if (performanceRatio < this.config.thresholds.minimumPerformanceRatio) {
            score = Math.max(0, score * 0.6); // 40% penalty for poor performance ratio
        }

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate commission stability score (20% weight)
     * @param {Object} data - Commission data
     * @returns {number} Commission stability score (0-100)
     */
    calculateCommissionStabilityScore(data) {
        const {
            commission_changes = 10,
            commission_variance = 100,
            history_epochs = 1,
            commission_stability = 0
        } = data;

        // Stability components
        const changeFrequencyScore = Math.max(0, 100 - (commission_changes * 10)); // Fewer changes = higher score
        const varianceScore = Math.max(0, 100 - Math.min(100, commission_variance * 10)); // Lower variance = higher score
        const consistencyScore = Math.min(100, commission_stability * 100);
        const dataQualityScore = Math.min(100, history_epochs * 2); // More data = higher confidence

        // Weighted average
        const score = (
            changeFrequencyScore * 0.35 +
            varianceScore * 0.30 +
            consistencyScore * 0.25 +
            dataQualityScore * 0.10
        );

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate value proposition score (12% weight)
     * @param {Object} data - Commission data
     * @returns {number} Value proposition score (0-100)
     */
    calculateValuePropositionScore(data) {
        const {
            commission_rate = 100,
            avg_uptime = 0,
            mev_consistency = 0,
            performance_ratio = 0
        } = data;

        // Value components
        const uptimeValue = Math.min(100, avg_uptime); // Higher uptime = better value
        const mevValue = Math.min(100, mev_consistency * 100); // MEV consistency adds value
        const performanceValue = Math.min(100, performance_ratio * 40); // Performance/fee ratio
        const rateValue = Math.max(0, 100 - (commission_rate * 5)); // Lower rates = higher value

        // Calculate overall value proposition
        const score = (
            uptimeValue * 0.3 +
            performanceValue * 0.3 +
            mevValue * 0.25 +
            rateValue * 0.15
        );

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate yield after fees score (8% weight)
     * @param {Object} data - Commission data
     * @returns {number} Yield after fees score (0-100)
     */
    calculateYieldAfterFeesScore(data) {
        const estimatedYield = data.estimated_yield_after_fees || 0;

        // Score based on yield benchmarks
        let score = 0;
        if (estimatedYield >= this.config.benchmarks.excellentYield) {
            score = 100;
        } else if (estimatedYield >= this.config.benchmarks.goodYield) {
            score = 75 + ((estimatedYield - this.config.benchmarks.goodYield) / 
                         (this.config.benchmarks.excellentYield - this.config.benchmarks.goodYield)) * 25;
        } else if (estimatedYield >= this.config.benchmarks.averageYield) {
            score = 50 + ((estimatedYield - this.config.benchmarks.averageYield) / 
                         (this.config.benchmarks.goodYield - this.config.benchmarks.averageYield)) * 25;
        } else if (estimatedYield > 0) {
            score = (estimatedYield / this.config.benchmarks.averageYield) * 50;
        }

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate composite score from individual components
     * @param {Object} scores - Individual component scores
     * @returns {number} Composite commission score (0-100)
     */
    calculateCompositeScore(scores) {
        const weights = this.config.scoringWeights;
        
        const compositeScore = (
            scores.rate * weights.rateCompetitiveness +
            scores.performanceRatio * weights.performanceToFeeRatio +
            scores.stability * weights.commissionStability +
            scores.value * weights.valueProposition +
            scores.yield * weights.yieldAfterFees
        );

        return Math.round(compositeScore * 100) / 100;
    }

    /**
     * Calculate confidence level for scoring
     * @param {Object} data - Commission data
     * @returns {number} Confidence level (0-100)
     */
    calculateConfidenceLevel(data) {
        const {
            epochs_active = 0,
            performance_epochs = 0,
            history_epochs = 0
        } = data;

        // Base confidence from data quantity
        const epochConfidence = Math.min(100, epochs_active * 2); // 50 epochs = 100% confidence
        const performanceConfidence = Math.min(100, performance_epochs * 4); // 25 performance epochs = 100%
        const historyConfidence = Math.min(100, history_epochs * 2); // 50 history epochs = 100%

        // Weighted average of confidence factors
        const overallConfidence = (
            epochConfidence * 0.4 +
            performanceConfidence * 0.35 +
            historyConfidence * 0.25
        );

        return Math.round(overallConfidence * 100) / 100;
    }

    /**
     * Assign commission grade based on score
     * @param {number} score - Commission optimization score
     * @returns {string} Letter grade
     */
    assignCommissionGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 85) return 'A';
        if (score >= 80) return 'A-';
        if (score >= 75) return 'B+';
        if (score >= 70) return 'B';
        if (score >= 65) return 'B-';
        if (score >= 60) return 'C+';
        if (score >= 55) return 'C';
        if (score >= 50) return 'C-';
        if (score >= 40) return 'D+';
        if (score >= 30) return 'D';
        return 'F';
    }

    /**
     * Get insufficient data score for validators with limited history
     * @param {string} validatorId - Validator ID
     * @param {Object} data - Limited validator data
     * @returns {Object} Default score structure
     */
    getInsufficientDataScore(validatorId, data) {
        const epochs = data?.epochs_active || 0;
        const commission = data?.commission_rate || 100;
        
        // Base score calculation for new validators
        let baseScore = Math.max(10, 60 - commission); // Lower commission gets higher base score
        baseScore = Math.min(50, baseScore + (epochs * 2)); // Add points for each epoch, max 50

        return {
            validator_id: validatorId,
            commission_optimization_score: baseScore,
            score_breakdown: {
                rate_competitiveness: Math.max(0, 70 - commission * 2),
                performance_to_fee_ratio: 30, // Default moderate score
                commission_stability: 40, // Unknown stability
                value_proposition: 35, // Default moderate value
                yield_after_fees: 25 // Conservative yield estimate
            },
            commission_metrics: {
                current_commission_rate: commission,
                avg_commission_rate: commission,
                commission_changes: 0,
                performance_ratio: 0,
                net_yield_estimate: 0,
                epochs_analyzed: epochs
            },
            confidence_level: Math.min(25, epochs * 2.5),
            commission_grade: 'Insufficient Data',
            last_updated: new Date().toISOString()
        };
    }
}

module.exports = CommissionScoreCalculator;