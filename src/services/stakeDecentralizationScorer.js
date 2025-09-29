const EventEmitter = require('events');
const DecentralizationDataGatherer = require('./decentralization/decentralizationDataGatherer');

/**
 * Stake Decentralization Scoring System
 * 
 * Main orchestrator for decentralization scoring that evaluates validator impact
 * on network health and decentralization
 */
class StakeDecentralizationScorer extends EventEmitter {
    constructor(database, logger) {
        super();
        this.db = database;
        this.logger = logger;

        // Decentralization scoring configuration
        this.config = {
            scoringWeights: {
                stakeConcentration: 0.30,      // Validator's share of total stake
                nakamotoImpact: 0.25,         // Impact on Nakamoto coefficient
                delegatorDiversity: 0.20,     // Number and diversity of delegators
                geographicDiversity: 0.15,    // Geographic distribution
                infrastructureDiversity: 0.10 // Infrastructure provider diversity
            },
            thresholds: {
                maxHealthyStakeShare: 0.01,    // 1% of total stake is healthy max
                concerningStakeShare: 0.02,    // 2% starts to be concerning
                dangerousStakeShare: 0.05,     // 5% is dangerous for network
                minimumDelegators: 50,         // Minimum delegators for good score
                excellentDelegators: 500,      // Excellent delegator count
                minimumEpochs: 10             // Minimum epochs for reliable scoring
            },
            networkHealthFactors: {
                totalActiveValidators: 2000,   // Estimated active validators
                idealNakamotoCoefficient: 33,  // Target Nakamoto coefficient
                currentNakamotoCoefficient: 20 // Current network Nakamoto coefficient
            }
        };

        // Initialize data gatherer
        this.dataGatherer = new DecentralizationDataGatherer(database, logger);
    }

    /**
     * Calculate comprehensive decentralization score for a validator
     * @param {string} validatorId - Validator vote account
     * @param {Object} options - Scoring options
     * @returns {Promise<Object>} Decentralization score and detailed breakdown
     */
    async calculateDecentralizationScore(validatorId, options = {}) {
        try {
            const {
                includeNetworkAnalysis = true,
                includeGeographicData = true,
                timeframe = 'recent'
            } = options;

            // Gather comprehensive decentralization data
            const decentralizationData = await this.dataGatherer.gatherDecentralizationData(validatorId, timeframe);
            
            if (!decentralizationData || decentralizationData.epochs_active < this.config.thresholds.minimumEpochs) {
                return this.getInsufficientDataScore(validatorId, decentralizationData);
            }

            // Calculate individual scoring components
            const stakeConcentrationScore = await this.calculateStakeConcentrationScore(decentralizationData);
            const nakamotoImpactScore = await this.calculateNakamotoImpactScore(decentralizationData);
            const delegatorDiversityScore = this.calculateDelegatorDiversityScore(decentralizationData);
            const geographicScore = includeGeographicData 
                ? await this.dataGatherer.calculateGeographicDiversityScore(validatorId)
                : 50; // Default moderate score
            const infrastructureScore = await this.dataGatherer.calculateInfrastructureDiversityScore(validatorId);

            // Calculate weighted composite score
            const compositeScore = this.calculateCompositeScore({
                stakeConcentration: stakeConcentrationScore,
                nakamotoImpact: nakamotoImpactScore,
                delegatorDiversity: delegatorDiversityScore,
                geographic: geographicScore,
                infrastructure: infrastructureScore
            });

            const result = {
                validator_id: validatorId,
                decentralization_score: Math.round(compositeScore * 100) / 100,
                score_breakdown: {
                    stake_concentration: stakeConcentrationScore,
                    nakamoto_impact: nakamotoImpactScore,
                    delegator_diversity: delegatorDiversityScore,
                    geographic_diversity: geographicScore,
                    infrastructure_diversity: infrastructureScore
                },
                decentralization_metrics: {
                    stake_share_percentage: decentralizationData.stake_share_percentage,
                    delegator_count: decentralizationData.delegator_count,
                    avg_delegation_size: decentralizationData.avg_delegation_size,
                    stake_concentration_rank: decentralizationData.stake_concentration_rank,
                    epochs_analyzed: decentralizationData.epochs_active
                },
                network_health_impact: this.assessNetworkHealthImpact(compositeScore, decentralizationData),
                confidence_level: this.calculateConfidenceLevel(decentralizationData),
                decentralization_grade: this.assignDecentralizationGrade(compositeScore),
                last_updated: new Date().toISOString()
            };

            this.emit('decentralizationScoreCalculated', {
                validatorId,
                score: compositeScore,
                stakeShare: decentralizationData.stake_share_percentage,
                grade: result.decentralization_grade
            });

            return result;

        } catch (error) {
            this.logger.error(`Error calculating decentralization score for ${validatorId}:`, error);
            throw error;
        }
    }

    /**
     * Calculate stake concentration score (30% weight)
     * @param {Object} data - Decentralization data
     * @returns {Promise<number>} Stake concentration score (0-100)
     */
    async calculateStakeConcentrationScore(data) {
        const {
            stake_share_percentage = 0,
            stake_concentration_rank = 1000,
            total_active_validators = 2000
        } = data;

        const stakeShareDecimal = stake_share_percentage / 100;

        // Base score calculation (lower stake share = higher score)
        let baseScore = 100;
        
        if (stakeShareDecimal <= this.config.thresholds.maxHealthyStakeShare) {
            baseScore = 100; // Perfect score for healthy stake share
        } else if (stakeShareDecimal <= this.config.thresholds.concerningStakeShare) {
            // Linear penalty between healthy and concerning thresholds
            const penaltyFactor = (stakeShareDecimal - this.config.thresholds.maxHealthyStakeShare) / 
                                (this.config.thresholds.concerningStakeShare - this.config.thresholds.maxHealthyStakeShare);
            baseScore = 100 - (penaltyFactor * 30); // Max 30 point penalty
        } else if (stakeShareDecimal <= this.config.thresholds.dangerousStakeShare) {
            // Steeper penalty between concerning and dangerous thresholds
            const penaltyFactor = (stakeShareDecimal - this.config.thresholds.concerningStakeShare) / 
                                (this.config.thresholds.dangerousStakeShare - this.config.thresholds.concerningStakeShare);
            baseScore = 70 - (penaltyFactor * 40); // Additional 40 point penalty
        } else {
            // Heavy penalty for dangerous concentration levels
            baseScore = Math.max(10, 30 - (stakeShareDecimal - this.config.thresholds.dangerousStakeShare) * 500);
        }

        // Add ranking bonus for lower concentration rankings
        const rankingBonus = Math.min(10, (total_active_validators - stake_concentration_rank) / total_active_validators * 20);
        
        const finalScore = Math.min(100, Math.max(0, baseScore + rankingBonus));
        return Math.round(finalScore * 100) / 100;
    }

    /**
     * Calculate Nakamoto coefficient impact score (25% weight)
     * @param {Object} data - Decentralization data
     * @returns {Promise<number>} Nakamoto impact score (0-100)
     */
    async calculateNakamotoImpactScore(data) {
        const {
            stake_share_percentage = 0,
            stake_concentration_rank = 1000
        } = data;

        // Get current Nakamoto coefficient information
        const nakamotoData = await this.dataGatherer.getNakamotoCoefficient();
        const currentNakamoto = nakamotoData.coefficient;
        const validatorPosition = nakamotoData.validators.findIndex(v => v.rank <= stake_concentration_rank);

        let score = 85; // Default good score for non-top validators

        if (validatorPosition !== -1 && validatorPosition < currentNakamoto) {
            // This validator is part of the Nakamoto coefficient
            const impactPenalty = (currentNakamoto - validatorPosition) / currentNakamoto * 50; // Up to 50 point penalty
            score = Math.max(25, 85 - impactPenalty);
        } else if (stake_share_percentage > 0.5) {
            // Large validators outside Nakamoto coefficient still get some penalty
            const sizePenalty = (stake_share_percentage - 0.5) * 20; // Penalty for size
            score = Math.max(70, 85 - sizePenalty);
        }

        // Bonus for improving Nakamoto coefficient
        if (currentNakamoto < this.config.networkHealthFactors.idealNakamotoCoefficient) {
            const improvementBonus = Math.min(10, (this.config.networkHealthFactors.idealNakamotoCoefficient - currentNakamoto) / 5);
            score = Math.min(100, score + improvementBonus);
        }

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate delegator diversity score (20% weight)
     * @param {Object} data - Decentralization data
     * @returns {number} Delegator diversity score (0-100)
     */
    calculateDelegatorDiversityScore(data) {
        const {
            delegator_count = 0,
            avg_delegation_size = 0,
            delegation_variance = 0,
            large_delegators = 0,
            small_delegators = 0
        } = data;

        if (delegator_count === 0) {
            return 20; // Low score for no delegators
        }

        // Score components
        const countScore = Math.min(100, (delegator_count / this.config.thresholds.excellentDelegators) * 100);
        
        // Diversity bonus for having many small delegators vs few large ones
        const diversityRatio = delegator_count > 0 ? small_delegators / delegator_count : 0;
        const diversityScore = Math.min(100, diversityRatio * 120); // Bonus for small delegator ratio
        
        // Penalty for high concentration in few large delegators
        const concentrationPenalty = large_delegators > 0 ? Math.min(20, (large_delegators / delegator_count) * 40) : 0;
        
        // Variance score (lower variance = better distribution)
        const varianceScore = delegation_variance > 0 ? 
            Math.max(0, 100 - Math.min(100, Math.sqrt(delegation_variance) / 1000)) : 70;

        // Weighted average
        const score = (
            countScore * 0.4 +
            diversityScore * 0.3 +
            varianceScore * 0.2 +
            Math.max(0, 100 - concentrationPenalty) * 0.1
        );

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate composite score from individual components
     * @param {Object} scores - Individual component scores
     * @returns {number} Composite decentralization score (0-100)
     */
    calculateCompositeScore(scores) {
        const weights = this.config.scoringWeights;
        
        const compositeScore = (
            scores.stakeConcentration * weights.stakeConcentration +
            scores.nakamotoImpact * weights.nakamotoImpact +
            scores.delegatorDiversity * weights.delegatorDiversity +
            scores.geographic * weights.geographicDiversity +
            scores.infrastructure * weights.infrastructureDiversity
        );

        return Math.round(compositeScore * 100) / 100;
    }

    /**
     * Assess network health impact
     * @param {number} score - Decentralization score
     * @param {Object} data - Decentralization data
     * @returns {Object} Network health impact assessment
     */
    assessNetworkHealthImpact(score, data) {
        const { stake_share_percentage = 0, delegator_count = 0 } = data;

        return {
            overall_impact: score >= 80 ? 'Positive' : score >= 60 ? 'Neutral' : 'Negative',
            centralization_risk: this.assessCentralizationRisk(stake_share_percentage),
            resilience_contribution: this.assessResilienceContribution(data),
            decentralization_benefit: this.calculateDecentralizationBenefit(data)
        };
    }

    /**
     * Assess centralization risk level
     * @param {number} stakeSharePercentage - Validator's stake share
     * @returns {string} Risk level
     */
    assessCentralizationRisk(stakeSharePercentage) {
        if (stakeSharePercentage >= 5) return 'High Risk';
        if (stakeSharePercentage >= 2) return 'Moderate Risk';
        if (stakeSharePercentage >= 1) return 'Low Risk';
        return 'Minimal Risk';
    }

    /**
     * Assess network resilience contribution
     * @param {Object} data - Decentralization data
     * @returns {string} Resilience contribution level
     */
    assessResilienceContribution(data) {
        const { stake_share_percentage = 0, delegator_count = 0 } = data;
        
        if (stake_share_percentage < 0.5 && delegator_count > 200) return 'High Contribution';
        if (stake_share_percentage < 1 && delegator_count > 100) return 'Good Contribution';
        if (stake_share_percentage < 2 && delegator_count > 50) return 'Moderate Contribution';
        return 'Low Contribution';
    }

    /**
     * Calculate decentralization benefit score
     * @param {Object} data - Decentralization data
     * @returns {number} Benefit score (0-100)
     */
    calculateDecentralizationBenefit(data) {
        const {
            stake_share_percentage = 0,
            delegator_count = 0,
            stake_concentration_rank = 1000
        } = data;

        // Higher benefit for smaller validators with good delegator diversity
        let benefit = 80; // Base benefit score

        if (stake_share_percentage < 0.5) {
            benefit += 15; // Bonus for small validators
        } else if (stake_share_percentage > 2) {
            benefit -= 30; // Penalty for large validators
        }

        if (delegator_count > 100) {
            benefit += 10; // Bonus for good delegator count
        }

        if (stake_concentration_rank > 500) {
            benefit += 5; // Bonus for lower concentration
        }

        return Math.min(100, Math.max(0, benefit));
    }

    /**
     * Calculate confidence level for scoring
     * @param {Object} data - Decentralization data
     * @returns {number} Confidence level (0-100)
     */
    calculateConfidenceLevel(data) {
        const {
            epochs_active = 0,
            delegator_count = 0,
            total_active_validators = 0
        } = data;

        // Base confidence from data quantity
        const epochConfidence = Math.min(100, epochs_active * 2);
        const delegatorConfidence = Math.min(100, delegator_count / 10);
        const networkDataConfidence = total_active_validators > 1000 ? 90 : 60;

        // Weighted average of confidence factors
        const overallConfidence = (
            epochConfidence * 0.4 +
            delegatorConfidence * 0.35 +
            networkDataConfidence * 0.25
        );

        return Math.round(overallConfidence * 100) / 100;
    }

    /**
     * Assign decentralization grade based on score
     * @param {number} score - Decentralization score
     * @returns {string} Letter grade
     */
    assignDecentralizationGrade(score) {
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
        const stakeShare = data?.stake_share_percentage || 0;
        
        // Base score - smaller validators get higher base scores
        let baseScore = Math.max(30, 70 - (stakeShare * 10));
        baseScore = Math.min(60, baseScore + (epochs * 2));

        return {
            validator_id: validatorId,
            decentralization_score: baseScore,
            score_breakdown: {
                stake_concentration: Math.max(20, 80 - (stakeShare * 10)),
                nakamoto_impact: 60, // Default moderate impact
                delegator_diversity: 40, // Unknown diversity
                geographic_diversity: 50, // Unknown geography
                infrastructure_diversity: 60 // Default infrastructure score
            },
            decentralization_metrics: {
                stake_share_percentage: stakeShare,
                delegator_count: data?.delegator_count || 0,
                avg_delegation_size: data?.avg_delegation_size || 0,
                stake_concentration_rank: data?.stake_concentration_rank || 1000,
                epochs_analyzed: epochs
            },
            network_health_impact: {
                overall_impact: 'Unknown',
                centralization_risk: this.assessCentralizationRisk(stakeShare),
                resilience_contribution: 'Unknown',
                decentralization_benefit: 50
            },
            confidence_level: Math.min(25, epochs * 2.5),
            decentralization_grade: 'Insufficient Data',
            last_updated: new Date().toISOString()
        };
    }

    /**
     * Batch calculate decentralization scores for multiple validators
     * @param {Array<string>} validatorIds - Array of validator vote accounts
     * @param {Object} options - Scoring options
     * @returns {Promise<Array>} Array of decentralization scores
     */
    async batchCalculateScores(validatorIds, options = {}) {
        try {
            const { concurrency = 10 } = options;
            const results = [];
            
            for (let i = 0; i < validatorIds.length; i += concurrency) {
                const batch = validatorIds.slice(i, i + concurrency);
                const batchPromises = batch.map(id => 
                    this.calculateDecentralizationScore(id, options)
                        .catch(error => {
                            this.logger.error(`Error scoring validator ${id}:`, error);
                            return this.getInsufficientDataScore(id, null);
                        })
                );
                
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                
                if (i + concurrency < validatorIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            this.emit('batchScoringComplete', {
                totalValidators: validatorIds.length,
                averageScore: results.reduce((sum, r) => sum + r.decentralization_score, 0) / results.length
            });
            
            return results;
            
        } catch (error) {
            this.logger.error('Error in batch decentralization scoring:', error);
            throw error;
        }
    }

    /**
     * Get decentralization rankings
     * @param {Object} filters - Filtering criteria
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Ranked validators by decentralization
     */
    async getDecentralizationRankings(filters = {}, limit = 50) {
        return await this.dataGatherer.getDecentralizationRankings(filters, limit);
    }

    /**
     * Update scoring configuration
     * @param {Object} newConfig - New configuration parameters
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Normalize scoring weights if provided
        if (newConfig.scoringWeights) {
            const totalWeight = Object.values(this.config.scoringWeights).reduce((sum, weight) => sum + weight, 0);
            if (totalWeight !== 1.0) {
                Object.keys(this.config.scoringWeights).forEach(key => {
                    this.config.scoringWeights[key] /= totalWeight;
                });
            }
        }
        
        this.emit('configUpdated', this.config);
    }
}

module.exports = StakeDecentralizationScorer;