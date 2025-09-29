/**
 * Reliability Score Calculator
 * 
 * Contains individual scoring algorithms for different aspects
 * of validator reliability analysis
 */
class ReliabilityScoreCalculator {
    constructor(config) {
        this.config = config;
    }

    /**
     * Calculate uptime score (35% weight)
     * @param {Object} data - Validator reliability data
     * @returns {number} Uptime score (0-100)
     */
    calculateUptimeScore(data) {
        const {
            uptime_percentage = 0,
            avg_recent_uptime = 0,
            good_uptime_epochs = 0,
            recent_epochs = 1
        } = data;

        const overallUptimeScore = Math.min(100, uptime_percentage);
        const recentUptimeScore = Math.min(100, avg_recent_uptime);
        const consistencyScore = Math.min(100, (good_uptime_epochs / recent_epochs) * 100);
        
        // Apply performance thresholds with bonus/penalty system
        let performanceMultiplier = 1.0;
        if (uptime_percentage >= this.config.thresholds.excellentUptime) {
            performanceMultiplier = 1.1; // 10% bonus for excellent uptime
        } else if (uptime_percentage < this.config.thresholds.acceptableUptime) {
            performanceMultiplier = 0.8; // 20% penalty for poor uptime
        }

        const score = (
            overallUptimeScore * 0.5 +
            recentUptimeScore * 0.3 +
            consistencyScore * 0.2
        ) * performanceMultiplier;

        return Math.min(100, Math.round(score * 100) / 100);
    }

    /**
     * Calculate vote reliability score (25% weight)
     * @param {Object} data - Validator reliability data
     * @returns {number} Vote reliability score (0-100)
     */
    calculateVoteReliabilityScore(data) {
        const {
            vote_success_rate = 0,
            avg_vote_distance = this.config.thresholds.maxVoteDistance,
            avg_vote_credits = 0,
            last_vote_distance = this.config.thresholds.maxVoteDistance
        } = data;

        const successRateScore = Math.min(100, vote_success_rate * 100);
        const timelinessScore = Math.max(0, 100 - (avg_vote_distance / this.config.thresholds.maxVoteDistance * 100));
        const currentTimelinessScore = Math.max(0, 100 - (last_vote_distance / this.config.thresholds.maxVoteDistance * 100));
        const voteCreditsScore = Math.min(100, (avg_vote_credits / 1000) * 100);

        // Apply performance bonuses/penalties
        let performanceMultiplier = 1.0;
        if (vote_success_rate >= this.config.thresholds.excellentVoteSuccess / 100) {
            performanceMultiplier = 1.08;
        } else if (vote_success_rate < this.config.thresholds.goodVoteSuccess / 100) {
            performanceMultiplier = 0.85;
        }

        const score = (
            successRateScore * 0.4 +
            timelinessScore * 0.25 +
            currentTimelinessScore * 0.20 +
            voteCreditsScore * 0.15
        ) * performanceMultiplier;

        return Math.min(100, Math.round(score * 100) / 100);
    }

    /**
     * Calculate block production reliability score (20% weight)
     * @param {Object} data - Validator reliability data
     * @returns {number} Block production score (0-100)
     */
    calculateBlockProductionScore(data) {
        const {
            avg_blocks_produced = 0,
            avg_expected_blocks = 1,
            avg_production_rate = 0,
            production_epochs = 0,
            skip_rate = 100
        } = data;

        if (production_epochs === 0) {
            return 50; // Neutral score for validators without block production data
        }

        const productionEfficiency = Math.min(100, (avg_blocks_produced / avg_expected_blocks) * 100);
        const productionRateScore = Math.min(100, avg_production_rate * 100);
        const skipRateScore = Math.max(0, 100 - (skip_rate * 2));
        const consistencyScore = Math.min(100, production_epochs * 5);

        // Apply skip rate penalties
        let skipMultiplier = 1.0;
        if (skip_rate <= this.config.thresholds.acceptableSkipRate) {
            skipMultiplier = 1.05;
        } else if (skip_rate > 15) {
            skipMultiplier = 0.8;
        }

        const score = (
            productionEfficiency * 0.35 +
            skipRateScore * 0.30 +
            productionRateScore * 0.20 +
            consistencyScore * 0.15
        ) * skipMultiplier;

        return Math.min(100, Math.round(score * 100) / 100);
    }

    /**
     * Calculate network participation score (12% weight)
     * @param {Object} data - Validator reliability data
     * @returns {number} Network participation score (0-100)
     */
    calculateNetworkParticipationScore(data) {
        const {
            total_network_events = 0,
            participated_events = 0,
            avg_response_time = 1000
        } = data;

        if (total_network_events === 0) {
            // Use uptime and vote performance as proxy metrics
            const uptimeScore = Math.min(100, data.uptime_percentage || 0);
            const voteScore = Math.min(100, (data.vote_success_rate || 0) * 100);
            return Math.round((uptimeScore * 0.6 + voteScore * 0.4) * 100) / 100;
        }

        const participationRate = Math.min(100, (participated_events / total_network_events) * 100);
        const responseTimeScore = Math.max(0, 100 - (avg_response_time / 10));
        const activityScore = Math.min(100, Math.log10(total_network_events + 1) * 25);

        const score = (
            participationRate * 0.5 +
            responseTimeScore * 0.3 +
            activityScore * 0.2
        );

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate recovery resilience score (8% weight)
     * @param {Object} recoveryData - Recovery pattern data
     * @returns {number} Recovery score (0-100)
     */
    calculateRecoveryScore(recoveryData) {
        if (!recoveryData) {
            return 75; // Default moderate score for no recovery data
        }

        const {
            downtime_frequency = 0,
            recovery_ratio = 1.0,
            resilience_score = 75,
            recovery_quality = 0
        } = recoveryData;

        // Lower downtime frequency is better
        const frequencyScore = Math.max(0, 100 - (downtime_frequency * 10));
        
        // Higher recovery ratio is better
        const ratioScore = Math.min(100, recovery_ratio * 100);
        
        // Recovery quality score
        const qualityScore = Math.min(100, recovery_quality);

        const score = (
            frequencyScore * 0.4 +
            ratioScore * 0.3 +
            qualityScore * 0.2 +
            resilience_score * 0.1
        );

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate composite score from individual components
     * @param {Object} scores - Individual component scores
     * @returns {number} Composite reliability score (0-100)
     */
    calculateCompositeScore(scores) {
        const weights = this.config.scoringWeights;
        
        const compositeScore = (
            scores.uptime * weights.uptimeScore +
            scores.voting * weights.voteReliability +
            scores.blockProduction * weights.blockProductionReliability +
            scores.participation * weights.networkParticipation +
            scores.recovery * weights.recoveryResilience
        );

        return Math.round(compositeScore * 100) / 100;
    }

    /**
     * Calculate confidence level for scoring
     * @param {Object} data - Reliability data
     * @returns {number} Confidence level (0-100)
     */
    calculateConfidenceLevel(data) {
        const {
            epochs_active = 0,
            recent_epochs = 0,
            production_epochs = 0
        } = data;

        const epochConfidence = Math.min(100, epochs_active * 2);
        const recentDataConfidence = Math.min(100, recent_epochs * 5);
        const productionConfidence = production_epochs > 0 ? Math.min(100, production_epochs * 10) : 50;

        return Math.round((epochConfidence * 0.5 + recentDataConfidence * 0.3 + productionConfidence * 0.2) * 100) / 100;
    }

    /**
     * Assign reliability grade based on score
     * @param {number} score - Reliability score
     * @returns {string} Letter grade
     */
    assignReliabilityGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 85) return 'A';
        if (score >= 80) return 'A-';
        if (score >= 75) return 'B+';
        if (score >= 70) return 'B';
        if (score >= 65) return 'B-';
        if (score >= 60) return 'C+';
        if (score >= 55) return 'C';
        if (score >= 50) return 'C-';
        return 'D';
    }

    /**
     * Get insufficient data score for validators with limited history
     * @param {string} validatorId - Validator ID
     * @param {Object} data - Limited validator data
     * @returns {Object} Default score structure
     */
    getInsufficientDataScore(validatorId, data) {
        const epochs = data?.epochs_active || 0;
        const baseScore = Math.min(50, epochs * 2.5);

        return {
            validator_id: validatorId,
            reliability_score: baseScore,
            score_breakdown: {
                uptime_score: Math.min(50, (data?.uptime_percentage || 0) * 0.5),
                vote_reliability: 25,
                block_production: 30,
                network_participation: 25,
                recovery_resilience: 40
            },
            performance_metrics: {
                uptime_percentage: data?.uptime_percentage || 0,
                vote_success_rate: data?.vote_success_rate || 0,
                skip_rate: data?.skip_rate || 100,
                avg_vote_distance: data?.avg_vote_distance || 150,
                epochs_analyzed: epochs
            },
            confidence_level: Math.min(30, epochs * 1.5),
            reliability_grade: 'Insufficient Data',
            last_updated: new Date().toISOString()
        };
    }

    /**
     * Perform comprehensive reliability assessment
     * @param {Object} reliabilityScore - Basic reliability score
     * @param {Object} trends - Historical trends
     * @param {Object} recovery - Recovery patterns
     * @returns {Object} Comprehensive assessment
     */
    performComprehensiveAssessment(reliabilityScore, trends, recovery) {
        const assessmentScore = this.calculateAssessmentScore({
            reliabilityScore: reliabilityScore.reliability_score,
            trendDirection: trends?.trend_direction,
            resilienceScore: recovery?.resilience_score || 75
        });

        return {
            comprehensive_score: assessmentScore,
            assessment_grade: this.assignAssessmentGrade(assessmentScore),
            risk_factors: this.identifyRiskFactors(reliabilityScore, trends, recovery),
            recommendations: this.generateRecommendations(reliabilityScore, trends, recovery)
        };
    }

    /**
     * Calculate composite assessment score
     * @param {Object} factors - Assessment factors
     * @returns {number} Assessment score (0-100)
     */
    calculateAssessmentScore(factors) {
        const {
            reliabilityScore = 50,
            trendDirection = 'stable',
            resilienceScore = 75
        } = factors;

        let assessmentScore = reliabilityScore * 0.6;
        
        if (trendDirection === 'improving') {
            assessmentScore += 10;
        } else if (trendDirection === 'declining') {
            assessmentScore -= 15;
        }
        
        assessmentScore += (resilienceScore * 0.3);
        
        return Math.max(0, Math.min(100, Math.round(assessmentScore)));
    }

    /**
     * Assign assessment grade
     * @param {number} score - Assessment score
     * @returns {string} Assessment grade
     */
    assignAssessmentGrade(score) {
        if (score >= 95) return 'A+';
        if (score >= 90) return 'A';
        if (score >= 85) return 'A-';
        if (score >= 80) return 'B+';
        if (score >= 75) return 'B';
        if (score >= 70) return 'B-';
        if (score >= 65) return 'C+';
        if (score >= 60) return 'C';
        if (score >= 55) return 'C-';
        if (score >= 50) return 'D+';
        if (score >= 40) return 'D';
        return 'F';
    }

    /**
     * Identify risk factors from analysis
     * @param {Object} reliabilityScore - Reliability analysis
     * @param {Object} trends - Trend analysis
     * @param {Object} recovery - Recovery analysis
     * @returns {Array<string>} Risk factors
     */
    identifyRiskFactors(reliabilityScore, trends, recovery) {
        const riskFactors = [];
        
        if (reliabilityScore.reliability_score < 70) {
            riskFactors.push('Low overall reliability score');
        }
        
        if (reliabilityScore.performance_metrics.uptime_percentage < 95) {
            riskFactors.push('Below-average uptime performance');
        }
        
        if (reliabilityScore.performance_metrics.skip_rate > 10) {
            riskFactors.push('High block skip rate');
        }
        
        if (trends?.trend_direction === 'declining') {
            riskFactors.push('Declining performance trend');
        }
        
        if (recovery?.downtime_frequency > 5) {
            riskFactors.push('Frequent downtime events');
        }
        
        if (recovery?.recovery_ratio < 0.8) {
            riskFactors.push('Poor recovery from downtime');
        }
        
        if (reliabilityScore.confidence_level < 50) {
            riskFactors.push('Insufficient data for reliable assessment');
        }
        
        return riskFactors;
    }

    /**
     * Generate recommendations based on analysis
     * @param {Object} reliabilityScore - Reliability analysis
     * @param {Object} trends - Trend analysis
     * @param {Object} recovery - Recovery analysis
     * @returns {Array<string>} Recommendations
     */
    generateRecommendations(reliabilityScore, trends, recovery) {
        const recommendations = [];
        
        if (reliabilityScore.reliability_score >= 85) {
            recommendations.push('Excellent reliability - suitable for large delegations');
        } else if (reliabilityScore.reliability_score >= 75) {
            recommendations.push('Good reliability - suitable for most delegators');
        } else if (reliabilityScore.reliability_score >= 60) {
            recommendations.push('Moderate reliability - monitor performance closely');
        } else {
            recommendations.push('Low reliability - consider alternative validators');
        }
        
        if (trends?.trend_direction === 'improving') {
            recommendations.push('Performance trending upward - positive outlook');
        } else if (trends?.trend_direction === 'declining') {
            recommendations.push('Performance declining - reassess delegation periodically');
        }
        
        if (recovery?.resilience_score >= 80) {
            recommendations.push('Strong recovery patterns - good resilience');
        } else if (recovery?.resilience_score < 60) {
            recommendations.push('Weak recovery patterns - higher risk during network issues');
        }
        
        if (reliabilityScore.confidence_level < 50) {
            recommendations.push('Limited historical data - reassess after more epochs');
        }
        
        return recommendations;
    }
}

module.exports = ReliabilityScoreCalculator;