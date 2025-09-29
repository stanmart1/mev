const EventEmitter = require('events');

/**
 * Delegation Analytics Engine
 * Core system that helps users choose validators based on MEV potential, reliability, 
 * commission rates, and stake decentralization
 */
class DelegationAnalyticsEngine extends EventEmitter {
    constructor(database, mevProfiler, historicalTracker) {
        super();
        this.db = database;
        this.mevProfiler = mevProfiler;
        this.historicalTracker = historicalTracker;
        
        // Scoring configuration with configurable weights
        this.config = {
            // Default scoring weights (must sum to 1.0)
            scoringWeights: {
                mevPotential: 0.30,        // 30% - MEV earning potential
                reliability: 0.25,         // 25% - Validator reliability and uptime
                commissionOptimization: 0.20, // 20% - Commission rate optimization
                stakeDecentralization: 0.15,  // 15% - Network decentralization impact
                performanceConsistency: 0.10  // 10% - Performance consistency
            },
            
            // Scoring thresholds and parameters
            thresholds: {
                minEpochsRequired: 10,     // Minimum epochs for reliable scoring
                maxCommissionRate: 0.20,   // 20% maximum commission considered
                minUptimePercentage: 95.0, // 95% minimum uptime for top tier
                maxStakeConcentration: 0.05, // 5% max network stake for decentralization
                minMevConfidence: 0.60     // 60% minimum MEV attribution confidence
            },
            
            // Risk assessment parameters
            riskFactors: {
                newValidatorPenalty: 0.15,    // 15% penalty for validators with limited history
                highCommissionPenalty: 0.10,  // 10% penalty for high commission rates
                lowUptimePenalty: 0.20,       // 20% penalty for poor uptime
                centralizedStakePenalty: 0.25  // 25% penalty for high stake concentration
            },
            
            // Update frequency
            scoringUpdateInterval: 3600000, // 1 hour
            recommendationRefreshInterval: 1800000 // 30 minutes
        };
        
        // Internal caches
        this.validatorScores = new Map();
        this.networkMetrics = null;
        this.lastUpdateTime = null;
    }

    /**
     * Start delegation analytics service
     */
    async startAnalytics() {
        console.log('Starting delegation analytics engine...');
        
        try {
            // Initialize network metrics
            await this.updateNetworkMetrics();
            
            // Initial scoring calculation
            await this.calculateAllValidatorScores();
            
            // Set up periodic updates
            this.scoringInterval = setInterval(async () => {
                try {
                    await this.updateNetworkMetrics();
                    await this.calculateAllValidatorScores();
                } catch (error) {
                    console.error('Error in periodic scoring update:', error);
                    this.emit('error', error);
                }
            }, this.config.scoringUpdateInterval);
            
            this.emit('started');
            console.log('Delegation analytics engine started successfully');
            
        } catch (error) {
            console.error('Error starting delegation analytics:', error);
            throw error;
        }
    }

    /**
     * Stop delegation analytics service
     */
    stopAnalytics() {
        if (this.scoringInterval) {
            clearInterval(this.scoringInterval);
            this.scoringInterval = null;
        }
        
        console.log('Delegation analytics engine stopped');
        this.emit('stopped');
    }

    /**
     * Calculate comprehensive scores for all validators
     */
    async calculateAllValidatorScores() {
        console.log('Calculating validator delegation scores...');
        
        try {
            // Get all active validators
            const validators = await this.getActiveValidators();
            
            if (validators.length === 0) {
                console.log('No active validators found for scoring');
                return;
            }
            
            const results = [];
            
            // Process validators in batches
            const batchSize = 20;
            for (let i = 0; i < validators.length; i += batchSize) {
                const batch = validators.slice(i, i + batchSize);
                
                const batchPromises = batch.map(validator => 
                    this.calculateValidatorScore(validator)
                );
                
                const batchResults = await Promise.allSettled(batchPromises);
                
                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value) {
                        results.push(result.value);
                        this.validatorScores.set(batch[index].validator_address, result.value);
                    } else {
                        console.error(`Error scoring validator ${batch[index].validator_address}:`, result.reason);
                    }
                });
                
                // Small delay between batches
                await this.sleep(100);
            }
            
            // Store scores in database
            await this.storeValidatorScores(results);
            
            this.lastUpdateTime = new Date();
            
            this.emit('scoresCalculated', {
                timestamp: new Date(),
                validatorCount: results.length,
                averageScore: results.reduce((sum, r) => sum + r.overall_score, 0) / results.length
            });
            
            console.log(`Calculated scores for ${results.length} validators`);
            
        } catch (error) {
            console.error('Error calculating validator scores:', error);
            throw error;
        }
    }

    /**
     * Calculate comprehensive delegation score for a single validator
     */
    async calculateValidatorScore(validator) {
        try {
            const validatorAddress = validator.validator_address;
            
            // Get validator data for scoring
            const validatorData = await this.getValidatorData(validatorAddress);
            
            if (!validatorData || validatorData.epochCount < this.config.thresholds.minEpochsRequired) {
                return this.createInsufficientDataScore(validatorAddress);
            }
            
            // Calculate individual component scores
            const mevScore = await this.calculateMEVPotentialScore(validatorData);
            const reliabilityScore = this.calculateReliabilityScore(validatorData);
            const commissionScore = this.calculateCommissionOptimizationScore(validatorData);
            const decentralizationScore = this.calculateStakeDecentralizationScore(validatorData);
            const consistencyScore = this.calculatePerformanceConsistencyScore(validatorData);
            
            // Apply risk adjustments
            const riskAdjustments = this.calculateRiskAdjustments(validatorData);
            
            // Calculate weighted overall score
            const rawScore = (
                mevScore * this.config.scoringWeights.mevPotential +
                reliabilityScore * this.config.scoringWeights.reliability +
                commissionScore * this.config.scoringWeights.commissionOptimization +
                decentralizationScore * this.config.scoringWeights.stakeDecentralization +
                consistencyScore * this.config.scoringWeights.performanceConsistency
            );
            
            // Apply risk penalties
            const adjustedScore = Math.max(0, rawScore - riskAdjustments.totalPenalty);
            
            return {
                validator_address: validatorAddress,
                overall_score: Math.round(adjustedScore * 100) / 100,
                
                // Component scores
                mev_potential_score: Math.round(mevScore * 100) / 100,
                reliability_score: Math.round(reliabilityScore * 100) / 100,
                commission_score: Math.round(commissionScore * 100) / 100,
                decentralization_score: Math.round(decentralizationScore * 100) / 100,
                consistency_score: Math.round(consistencyScore * 100) / 100,
                
                // Risk assessments
                risk_adjustments: riskAdjustments,
                
                // Supporting data
                is_jito_enabled: validatorData.isJitoEnabled,
                current_commission: validatorData.commissionRate,
                stake_amount: validatorData.stakeAmount,
                uptime_percentage: validatorData.uptimePercentage,
                mev_capability_score: validatorData.mevCapabilityScore || 0,
                
                // Metadata
                calculation_timestamp: new Date(),
                data_quality_score: this.calculateDataQualityScore(validatorData),
                recommendation_tier: this.calculateRecommendationTier(adjustedScore)
            };
            
        } catch (error) {
            console.error(`Error calculating score for validator ${validator.validator_address}:`, error);
            return null;
        }
    }

    /**
     * Calculate MEV potential score (0-1)
     */
    async calculateMEVPotentialScore(validatorData) {
        let score = 0;
        
        // Base MEV capability (40%)
        if (validatorData.mevCapabilityScore) {
            score += (validatorData.mevCapabilityScore / 100) * 0.4;
        }
        
        // Jito enablement bonus (30%)
        if (validatorData.isJitoEnabled) {
            score += 0.3;
            
            // Additional scoring for Jito validators
            if (validatorData.avgMevPerBlock > 0) {
                // Normalize MEV per block (assuming 0.01 SOL is excellent)
                const mevBlockScore = Math.min(1, validatorData.avgMevPerBlock / 0.01);
                score += mevBlockScore * 0.2;
            }
            
            if (validatorData.bundleSuccessRate > 0) {
                score += validatorData.bundleSuccessRate * 0.1;
            }
        } else {
            // Regular validators get partial credit for potential MEV capability
            score += 0.15; // 15% base score for regular validators
        }
        
        // MEV consistency bonus (10%)
        if (validatorData.mevConsistencyScore > 0) {
            score += validatorData.mevConsistencyScore * 0.1;
        }
        
        return Math.min(1, score);
    }

    /**
     * Calculate validator reliability score (0-1)
     */
    calculateReliabilityScore(validatorData) {
        let score = 0;
        
        // Uptime score (50%)
        const uptimeScore = Math.min(1, validatorData.uptimePercentage / 100);
        score += uptimeScore * 0.5;
        
        // Performance consistency (30%)
        if (validatorData.performanceConsistency) {
            score += validatorData.performanceConsistency * 0.3;
        }
        
        // Historical presence (20%)
        const epochsNormalized = Math.min(1, validatorData.epochCount / 100); // 100 epochs = perfect
        score += epochsNormalized * 0.2;
        
        return Math.min(1, score);
    }

    /**
     * Calculate commission optimization score (0-1)
     */
    calculateCommissionOptimizationScore(validatorData) {
        const commission = validatorData.commissionRate;
        
        // Optimal commission range is 5-8%
        const optimalLow = 0.05;
        const optimalHigh = 0.08;
        const maxAcceptable = this.config.thresholds.maxCommissionRate;
        
        let score = 0;
        
        if (commission <= optimalHigh && commission >= optimalLow) {
            // Perfect score for optimal range
            score = 1.0;
        } else if (commission < optimalLow) {
            // Lower commission is good but might indicate sustainability issues
            score = 0.9 - (optimalLow - commission) * 2; // Penalty for very low commission
        } else if (commission > optimalHigh && commission <= maxAcceptable) {
            // Linear decrease for higher commission
            score = 1.0 - ((commission - optimalHigh) / (maxAcceptable - optimalHigh)) * 0.7;
        } else {
            // Very high commission gets low score
            score = 0.1;
        }
        
        // Performance bonus: if validator delivers exceptional returns despite higher commission
        if (validatorData.avgRewards && validatorData.networkAvgRewards) {
            const performanceRatio = validatorData.avgRewards / validatorData.networkAvgRewards;
            if (performanceRatio > 1.1) { // 10% above network average
                score += 0.1 * (performanceRatio - 1); // Bonus for outperformance
            }
        }
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Calculate stake decentralization score (0-1)
     */
    calculateStakeDecentralizationScore(validatorData) {
        if (!this.networkMetrics) {
            return 0.5; // Default score if network metrics unavailable
        }
        
        const validatorStakeShare = validatorData.stakeAmount / this.networkMetrics.totalStake;
        const maxDesirableShare = this.config.thresholds.maxStakeConcentration;
        
        let score = 0;
        
        if (validatorStakeShare <= maxDesirableShare) {
            // Excellent decentralization
            score = 1.0;
        } else if (validatorStakeShare <= maxDesirableShare * 2) {
            // Good decentralization with linear decrease
            score = 1.0 - ((validatorStakeShare - maxDesirableShare) / maxDesirableShare);
        } else if (validatorStakeShare <= maxDesirableShare * 4) {
            // Fair decentralization
            score = 0.5 - ((validatorStakeShare - maxDesirableShare * 2) / (maxDesirableShare * 2)) * 0.3;
        } else {
            // Poor decentralization
            score = 0.2;
        }
        
        // Bonus for validators that help decentralization
        if (validatorStakeShare < maxDesirableShare * 0.5) {
            score += 0.05; // Small bonus for very decentralized validators
        }
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Calculate performance consistency score (0-1)
     */
    calculatePerformanceConsistencyScore(validatorData) {
        let score = 0;
        
        // Reward consistency (50%)
        if (validatorData.rewardConsistency) {
            score += validatorData.rewardConsistency * 0.5;
        }
        
        // Block production consistency (30%)
        if (validatorData.blockProductionConsistency) {
            score += validatorData.blockProductionConsistency * 0.3;
        }
        
        // Commission stability (20%)
        if (validatorData.commissionStability) {
            score += validatorData.commissionStability * 0.2;
        }
        
        return Math.min(1, score);
    }

    /**
     * Calculate risk adjustments and penalties
     */
    calculateRiskAdjustments(validatorData) {
        const adjustments = {
            newValidatorPenalty: 0,
            highCommissionPenalty: 0,
            lowUptimePenalty: 0,
            centralizedStakePenalty: 0,
            totalPenalty: 0
        };
        
        // New validator penalty
        if (validatorData.epochCount < 30) {
            adjustments.newValidatorPenalty = this.config.riskFactors.newValidatorPenalty;
        }
        
        // High commission penalty
        if (validatorData.commissionRate > 0.15) { // Above 15%
            adjustments.highCommissionPenalty = this.config.riskFactors.highCommissionPenalty;
        }
        
        // Low uptime penalty
        if (validatorData.uptimePercentage < this.config.thresholds.minUptimePercentage) {
            adjustments.lowUptimePenalty = this.config.riskFactors.lowUptimePenalty;
        }
        
        // Centralized stake penalty
        if (this.networkMetrics) {
            const stakeShare = validatorData.stakeAmount / this.networkMetrics.totalStake;
            if (stakeShare > this.config.thresholds.maxStakeConcentration * 2) {
                adjustments.centralizedStakePenalty = this.config.riskFactors.centralizedStakePenalty;
            }
        }
        
        adjustments.totalPenalty = 
            adjustments.newValidatorPenalty +
            adjustments.highCommissionPenalty +
            adjustments.lowUptimePenalty +
            adjustments.centralizedStakePenalty;
        
        return adjustments;
    }

    /**
     * Get comprehensive validator data for scoring
     */
    async getValidatorData(validatorAddress) {
        try {
            // Get base validator performance data
            const performanceQuery = `
                SELECT 
                    validator_address,
                    AVG(epoch_rewards) as avg_rewards,
                    AVG(stake_amount) as stake_amount,
                    AVG(commission_rate) as commission_rate,
                    AVG(uptime_percentage) as uptime_percentage,
                    COUNT(*) as epoch_count,
                    BOOL_OR(is_jito_enabled) as is_jito_enabled,
                    STDDEV(epoch_rewards) / NULLIF(AVG(epoch_rewards), 0) as reward_cv
                FROM enhanced_validator_performance
                WHERE validator_address = $1
                AND timestamp > NOW() - INTERVAL '90 days'
                GROUP BY validator_address
            `;
            
            const performanceResult = await this.db.query(performanceQuery, [validatorAddress]);
            
            if (performanceResult.rows.length === 0) {
                return null;
            }
            
            const baseData = performanceResult.rows[0];
            
            // Get MEV profile data if available
            let mevData = {};
            try {
                const mevQuery = `
                    SELECT 
                        mev_capability_score,
                        avg_mev_per_block,
                        consistency_score,
                        bundle_success_rate
                    FROM validator_mev_profiles
                    WHERE validator_address = $1
                `;
                
                const mevResult = await this.db.query(mevQuery, [validatorAddress]);
                if (mevResult.rows.length > 0) {
                    mevData = mevResult.rows[0];
                }
            } catch (error) {
                console.log('MEV profile data not available for validator:', validatorAddress);
            }
            
            return {
                validatorAddress: baseData.validator_address,
                avgRewards: parseFloat(baseData.avg_rewards || 0),
                stakeAmount: parseFloat(baseData.stake_amount || 0),
                commissionRate: parseFloat(baseData.commission_rate || 0),
                uptimePercentage: parseFloat(baseData.uptime_percentage || 0),
                epochCount: parseInt(baseData.epoch_count || 0),
                isJitoEnabled: baseData.is_jito_enabled || false,
                
                // MEV data
                mevCapabilityScore: parseFloat(mevData.mev_capability_score || 0),
                avgMevPerBlock: parseFloat(mevData.avg_mev_per_block || 0),
                mevConsistencyScore: parseFloat(mevData.consistency_score || 0),
                bundleSuccessRate: parseFloat(mevData.bundle_success_rate || 0),
                
                // Consistency metrics
                rewardConsistency: baseData.reward_cv ? Math.max(0, 1 - parseFloat(baseData.reward_cv)) : 0,
                performanceConsistency: 0.8, // Placeholder - would calculate from historical data
                blockProductionConsistency: 0.85, // Placeholder
                commissionStability: 0.9, // Placeholder
                
                // Network comparison data
                networkAvgRewards: this.networkMetrics?.avgRewards || 0
            };
            
        } catch (error) {
            console.error(`Error getting validator data for ${validatorAddress}:`, error);
            return null;
        }
    }

    /**
     * Update network-wide metrics for comparative analysis
     */
    async updateNetworkMetrics() {
        try {
            const query = `
                SELECT 
                    COUNT(DISTINCT validator_address) as total_validators,
                    SUM(stake_amount) as total_stake,
                    AVG(epoch_rewards) as avg_rewards,
                    AVG(commission_rate) as avg_commission,
                    AVG(uptime_percentage) as avg_uptime,
                    COUNT(DISTINCT CASE WHEN is_jito_enabled THEN validator_address END) as jito_validators
                FROM enhanced_validator_performance
                WHERE timestamp > NOW() - INTERVAL '7 days'
            `;
            
            const result = await this.db.query(query);
            
            if (result.rows.length > 0) {
                const data = result.rows[0];
                this.networkMetrics = {
                    totalValidators: parseInt(data.total_validators || 0),
                    totalStake: parseFloat(data.total_stake || 0),
                    avgRewards: parseFloat(data.avg_rewards || 0),
                    avgCommission: parseFloat(data.avg_commission || 0),
                    avgUptime: parseFloat(data.avg_uptime || 0),
                    jitoValidators: parseInt(data.jito_validators || 0),
                    lastUpdated: new Date()
                };
                
                console.log('Network metrics updated:', this.networkMetrics);
            }
            
        } catch (error) {
            console.error('Error updating network metrics:', error);
        }
    }

    /**
     * Get active validators for scoring
     */
    async getActiveValidators() {
        try {
            const query = `
                SELECT DISTINCT validator_address
                FROM enhanced_validator_performance
                WHERE timestamp > NOW() - INTERVAL '7 days'
                ORDER BY validator_address
            `;
            
            const result = await this.db.query(query);
            return result.rows;
            
        } catch (error) {
            console.error('Error getting active validators:', error);
            return [];
        }
    }

    /**
     * Store validator scores in database
     */
    async storeValidatorScores(scores) {
        if (scores.length === 0) return;
        
        try {
            for (const score of scores) {
                const query = `
                    INSERT INTO validator_delegation_scores (
                        validator_address, overall_score, mev_potential_score, reliability_score,
                        commission_score, decentralization_score, consistency_score,
                        risk_adjustments, is_jito_enabled, current_commission, stake_amount,
                        uptime_percentage, mev_capability_score, data_quality_score,
                        recommendation_tier, calculation_timestamp
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
                    )
                    ON CONFLICT (validator_address, DATE(calculation_timestamp))
                    DO UPDATE SET
                        overall_score = EXCLUDED.overall_score,
                        mev_potential_score = EXCLUDED.mev_potential_score,
                        reliability_score = EXCLUDED.reliability_score,
                        commission_score = EXCLUDED.commission_score,
                        decentralization_score = EXCLUDED.decentralization_score,
                        consistency_score = EXCLUDED.consistency_score,
                        risk_adjustments = EXCLUDED.risk_adjustments,
                        current_commission = EXCLUDED.current_commission,
                        stake_amount = EXCLUDED.stake_amount,
                        uptime_percentage = EXCLUDED.uptime_percentage,
                        mev_capability_score = EXCLUDED.mev_capability_score,
                        data_quality_score = EXCLUDED.data_quality_score,
                        recommendation_tier = EXCLUDED.recommendation_tier,
                        calculation_timestamp = EXCLUDED.calculation_timestamp
                `;
                
                await this.db.query(query, [
                    score.validator_address,
                    score.overall_score,
                    score.mev_potential_score,
                    score.reliability_score,
                    score.commission_score,
                    score.decentralization_score,
                    score.consistency_score,
                    JSON.stringify(score.risk_adjustments),
                    score.is_jito_enabled,
                    score.current_commission,
                    score.stake_amount,
                    score.uptime_percentage,
                    score.mev_capability_score,
                    score.data_quality_score,
                    score.recommendation_tier,
                    score.calculation_timestamp
                ]);
            }
            
            console.log(`Stored ${scores.length} validator scores`);
            
        } catch (error) {
            console.error('Error storing validator scores:', error);
        }
    }

    // Helper methods
    createInsufficientDataScore(validatorAddress) {
        return {
            validator_address: validatorAddress,
            overall_score: 0,
            mev_potential_score: 0,
            reliability_score: 0,
            commission_score: 0,
            decentralization_score: 0,
            consistency_score: 0,
            risk_adjustments: { totalPenalty: 0.5 }, // High penalty for insufficient data
            data: {
                mev_rewards: 0,
                total_epochs: 0,
                uptime_percentage: 0,
                commission_rate: 100,
                stake_amount: 0
            }
        };
    }

    /**
     * Calculate MEV potential score based on historical MEV earnings
     * @param {Object} validatorData - Validator performance data
     * @returns {Promise<Object>} MEV potential score and breakdown
     */
    async calculateMevPotentialScore(validatorData) {
        try {
            const {
                mev_rewards = 0,
                total_epochs = 0,
                avg_daily_mev = 0,
                mev_consistency = 0,
                market_share = 0
            } = validatorData;

            // Avoid division by zero
            if (total_epochs === 0) {
                return {
                    score: 0,
                    breakdown: {
                        earnings_level: 0,
                        consistency: 0,
                        market_share: 0,
                        growth_trend: 0
                    },
                    confidence: 0
                };
            }

            // Calculate component scores (0-100 scale)
            const avgMevPerEpoch = mev_rewards / total_epochs;
            const earningsLevel = Math.min(100, (avgMevPerEpoch / 1000) * 100); // Normalized to 1000 SOL max
            const consistency = Math.min(100, mev_consistency * 100);
            const marketShareScore = Math.min(100, market_share * 10000); // Market share is typically small
            const growthTrend = Math.min(100, Math.max(0, avg_daily_mev > 0 ? 75 : 25));

            // Calculate weighted score
            const score = (
                earningsLevel * 0.4 +
                consistency * 0.3 +
                marketShareScore * 0.2 +
                growthTrend * 0.1
            );

            return {
                score: Math.round(score * 100) / 100,
                breakdown: {
                    earnings_level: Math.round(earningsLevel * 100) / 100,
                    consistency: Math.round(consistency * 100) / 100,
                    market_share: Math.round(marketShareScore * 100) / 100,
                    growth_trend: Math.round(growthTrend * 100) / 100
                },
                confidence: Math.min(100, total_epochs * 2) // Higher confidence with more data
            };
        } catch (error) {
            this.logger.error('Error calculating MEV potential score:', error);
            return {
                score: 0,
                breakdown: { earnings_level: 0, consistency: 0, market_share: 0, growth_trend: 0 },
                confidence: 0
            };
        }
    }

    /**
     * Calculate validator reliability score
     * @param {Object} validatorData - Validator performance data
     * @returns {Promise<Object>} Reliability score and breakdown
     */
    async calculateReliabilityScore(validatorData) {
        try {
            const {
                uptime_percentage = 0,
                skip_rate = 100,
                vote_success_rate = 0,
                last_vote_distance = 150,
                avg_slot_distance = 150
            } = validatorData;

            // Calculate component scores (0-100 scale)
            const uptimeScore = Math.min(100, uptime_percentage);
            const skipScore = Math.max(0, 100 - (skip_rate * 100));
            const voteScore = Math.min(100, vote_success_rate * 100);
            const voteTimeliness = Math.max(0, 100 - (last_vote_distance / 150 * 100));
            const slotConsistency = Math.max(0, 100 - (avg_slot_distance / 150 * 100));

            // Calculate weighted score
            const score = (
                uptimeScore * 0.3 +
                skipScore * 0.25 +
                voteScore * 0.2 +
                voteTimeliness * 0.15 +
                slotConsistency * 0.1
            );

            return {
                score: Math.round(score * 100) / 100,
                breakdown: {
                    uptime: Math.round(uptimeScore * 100) / 100,
                    skip_rate: Math.round(skipScore * 100) / 100,
                    vote_success: Math.round(voteScore * 100) / 100,
                    vote_timeliness: Math.round(voteTimeliness * 100) / 100,
                    slot_consistency: Math.round(slotConsistency * 100) / 100
                },
                confidence: Math.min(100, uptime_percentage > 0 ? 90 : 10)
            };
        } catch (error) {
            this.logger.error('Error calculating reliability score:', error);
            return {
                score: 0,
                breakdown: { uptime: 0, skip_rate: 0, vote_success: 0, vote_timeliness: 0, slot_consistency: 0 },
                confidence: 0
            };
        }
    }

    /**
     * Calculate commission optimization score
     * @param {Object} validatorData - Validator performance data
     * @returns {Promise<Object>} Commission score and breakdown
     */
    async calculateCommissionScore(validatorData) {
        try {
            const {
                commission_rate = 100,
                performance_vs_commission = 0,
                commission_stability = 0,
                yield_after_fees = 0
            } = validatorData;

            // Calculate component scores (0-100 scale)
            const rateScore = Math.max(0, 100 - commission_rate); // Lower commission = higher score
            const valueScore = Math.min(100, performance_vs_commission * 100);
            const stabilityScore = Math.min(100, commission_stability * 100);
            const yieldScore = Math.min(100, yield_after_fees * 20); // Assuming 5% is excellent yield

            // Calculate weighted score
            const score = (
                rateScore * 0.3 +
                valueScore * 0.3 +
                yieldScore * 0.25 +
                stabilityScore * 0.15
            );

            return {
                score: Math.round(score * 100) / 100,
                breakdown: {
                    commission_rate: Math.round(rateScore * 100) / 100,
                    value_proposition: Math.round(valueScore * 100) / 100,
                    yield_after_fees: Math.round(yieldScore * 100) / 100,
                    stability: Math.round(stabilityScore * 100) / 100
                },
                confidence: Math.min(100, commission_rate < 100 ? 85 : 10)
            };
        } catch (error) {
            this.logger.error('Error calculating commission score:', error);
            return {
                score: 0,
                breakdown: { commission_rate: 0, value_proposition: 0, yield_after_fees: 0, stability: 0 },
                confidence: 0
            };
        }
    }

    /**
     * Calculate stake decentralization score
     * @param {Object} validatorData - Validator performance data
     * @returns {Promise<Object>} Decentralization score and breakdown
     */
    async calculateDecentralizationScore(validatorData) {
        try {
            const {
                stake_concentration = 1,
                geographic_diversity = 0,
                infrastructure_diversity = 0,
                delegation_count = 0,
                nakamoto_coefficient_impact = 0
            } = validatorData;

            // Calculate component scores (0-100 scale)
            const concentrationScore = Math.max(0, 100 - (stake_concentration * 100));
            const geoScore = Math.min(100, geographic_diversity * 100);
            const infraScore = Math.min(100, infrastructure_diversity * 100);
            const delegationScore = Math.min(100, Math.log10(delegation_count + 1) * 25);
            const nakamotoScore = Math.min(100, (1 - nakamoto_coefficient_impact) * 100);

            // Calculate weighted score
            const score = (
                concentrationScore * 0.3 +
                nakamotoScore * 0.25 +
                geoScore * 0.2 +
                infraScore * 0.15 +
                delegationScore * 0.1
            );

            return {
                score: Math.round(score * 100) / 100,
                breakdown: {
                    stake_concentration: Math.round(concentrationScore * 100) / 100,
                    nakamoto_impact: Math.round(nakamotoScore * 100) / 100,
                    geographic_diversity: Math.round(geoScore * 100) / 100,
                    infrastructure_diversity: Math.round(infraScore * 100) / 100,
                    delegation_spread: Math.round(delegationScore * 100) / 100
                },
                confidence: Math.min(100, delegation_count > 0 ? 80 : 20)
            };
        } catch (error) {
            this.logger.error('Error calculating decentralization score:', error);
            return {
                score: 0,
                breakdown: { stake_concentration: 0, nakamoto_impact: 0, geographic_diversity: 0, infrastructure_diversity: 0, delegation_spread: 0 },
                confidence: 0
            };
        }
    }

    /**
     * Calculate performance consistency score
     * @param {Object} validatorData - Validator performance data
     * @returns {Promise<Object>} Consistency score and breakdown
     */
    async calculateConsistencyScore(validatorData) {
        try {
            const {
                reward_variance = 1,
                performance_stability = 0,
                uptime_consistency = 0,
                mev_consistency = 0
            } = validatorData;

            // Calculate component scores (0-100 scale)
            const varianceScore = Math.max(0, 100 - (reward_variance * 100));
            const stabilityScore = Math.min(100, performance_stability * 100);
            const uptimeConsistencyScore = Math.min(100, uptime_consistency * 100);
            const mevConsistencyScore = Math.min(100, mev_consistency * 100);

            // Calculate weighted score
            const score = (
                stabilityScore * 0.35 +
                varianceScore * 0.25 +
                uptimeConsistencyScore * 0.25 +
                mevConsistencyScore * 0.15
            );

            return {
                score: Math.round(score * 100) / 100,
                breakdown: {
                    performance_stability: Math.round(stabilityScore * 100) / 100,
                    reward_variance: Math.round(varianceScore * 100) / 100,
                    uptime_consistency: Math.round(uptimeConsistencyScore * 100) / 100,
                    mev_consistency: Math.round(mevConsistencyScore * 100) / 100
                },
                confidence: 85
            };
        } catch (error) {
            this.logger.error('Error calculating consistency score:', error);
            return {
                score: 0,
                breakdown: { performance_stability: 0, reward_variance: 0, uptime_consistency: 0, mev_consistency: 0 },
                confidence: 0
            };
        }
    }

    /**
     * Apply risk adjustments to scores
     * @param {Object} scores - Individual component scores
     * @param {Object} validatorData - Validator data for risk assessment
     * @returns {Object} Risk adjustment factors
     */
    calculateRiskAdjustments(scores, validatorData) {
        const adjustments = {
            newValidatorPenalty: 0,
            lowStakePenalty: 0,
            highConcentrationPenalty: 0,
            poorHistoryPenalty: 0,
            totalPenalty: 0
        };

        try {
            const {
                epochs_active = 0,
                stake_amount = 0,
                stake_concentration = 0,
                recent_performance = 1
            } = validatorData;

            // New validator penalty (less than 10 epochs)
            if (epochs_active < 10) {
                adjustments.newValidatorPenalty = Math.max(0, (10 - epochs_active) * 0.05);
            }

            // Low stake penalty (less than 100K SOL)
            if (stake_amount < 100000) {
                adjustments.lowStakePenalty = Math.max(0, (100000 - stake_amount) / 100000 * 0.1);
            }

            // High concentration penalty
            if (stake_concentration > 0.01) { // More than 1% of total stake
                adjustments.highConcentrationPenalty = (stake_concentration - 0.01) * 5;
            }

            // Poor recent performance penalty
            if (recent_performance < 0.8) {
                adjustments.poorHistoryPenalty = (0.8 - recent_performance) * 0.5;
            }

            // Calculate total penalty (cap at 0.5)
            adjustments.totalPenalty = Math.min(0.5, 
                adjustments.newValidatorPenalty + 
                adjustments.lowStakePenalty + 
                adjustments.highConcentrationPenalty + 
                adjustments.poorHistoryPenalty
            );

            return adjustments;
        } catch (error) {
            this.logger.error('Error calculating risk adjustments:', error);
            return adjustments;
        }
    }

    /**
     * Generate validator recommendations based on user preferences
     * @param {Object} preferences - User delegation preferences
     * @param {number} limit - Maximum number of recommendations
     * @returns {Promise<Array>} Recommended validators
     */
    async generateRecommendations(preferences = {}, limit = 10) {
        try {
            const {
                riskTolerance = 'medium', // low, medium, high
                prioritizeMev = true,
                maxCommission = 10,
                minStake = 50000,
                preferDecentralized = true,
                excludeValidators = []
            } = preferences;

            // Adjust scoring weights based on preferences
            const adjustedWeights = { ...this.config.scoringWeights };
            
            if (prioritizeMev) {
                adjustedWeights.mevPotential *= 1.5;
                adjustedWeights.reliability *= 0.8;
            }
            
            if (preferDecentralized) {
                adjustedWeights.stakeDecentralization *= 1.3;
                adjustedWeights.mevPotential *= 0.9;
            }

            // Apply risk tolerance adjustments
            switch (riskTolerance) {
                case 'low':
                    adjustedWeights.reliability *= 1.4;
                    adjustedWeights.performanceConsistency *= 1.3;
                    adjustedWeights.mevPotential *= 0.7;
                    break;
                case 'high':
                    adjustedWeights.mevPotential *= 1.3;
                    adjustedWeights.reliability *= 0.8;
                    adjustedWeights.performanceConsistency *= 0.8;
                    break;
            }

            // Normalize weights
            const totalWeight = Object.values(adjustedWeights).reduce((sum, weight) => sum + weight, 0);
            Object.keys(adjustedWeights).forEach(key => {
                adjustedWeights[key] /= totalWeight;
            });

            // Get all validator scores with filters
            const query = `
                SELECT 
                    vs.*,
                    v.vote_account,
                    v.identity,
                    v.commission_rate,
                    v.stake_amount
                FROM validator_scores vs
                JOIN validators v ON vs.validator_id = v.vote_account
                WHERE v.commission_rate <= $1
                AND v.stake_amount >= $2
                AND v.vote_account != ALL($3)
                AND vs.last_updated > NOW() - INTERVAL '24 hours'
                ORDER BY vs.composite_score DESC
                LIMIT $4
            `;

            const result = await this.db.query(query, [
                maxCommission,
                minStake,
                excludeValidators,
                limit * 2 // Get more candidates for better filtering
            ]);

            // Re-score with user preferences and sort
            const recommendations = result.rows
                .map(validator => {
                    const personalizedScore = (
                        validator.mev_score * adjustedWeights.mevPotential +
                        validator.reliability_score * adjustedWeights.reliability +
                        validator.commission_score * adjustedWeights.commissionOptimization +
                        validator.decentralization_score * adjustedWeights.stakeDecentralization +
                        validator.consistency_score * adjustedWeights.performanceConsistency
                    ) * (1 - validator.risk_penalty);

                    return {
                        validator_id: validator.validator_id,
                        vote_account: validator.vote_account,
                        identity: validator.identity,
                        personalized_score: Math.round(personalizedScore * 100) / 100,
                        composite_score: validator.composite_score,
                        scores: {
                            mev_potential: validator.mev_score,
                            reliability: validator.reliability_score,
                            commission: validator.commission_score,
                            decentralization: validator.decentralization_score,
                            consistency: validator.consistency_score
                        },
                        validator_info: {
                            commission_rate: validator.commission_rate,
                            stake_amount: validator.stake_amount
                        },
                        risk_penalty: validator.risk_penalty,
                        recommendation_reason: this.generateRecommendationReason(
                            validator, preferences, adjustedWeights
                        )
                    };
                })
                .sort((a, b) => b.personalized_score - a.personalized_score)
                .slice(0, limit);

            this.emit('recommendationsGenerated', {
                preferences,
                count: recommendations.length,
                averageScore: recommendations.reduce((sum, r) => sum + r.personalized_score, 0) / recommendations.length
            });

            return recommendations;
        } catch (error) {
            this.logger.error('Error generating recommendations:', error);
            throw error;
        }
    }

    /**
     * Generate explanation for recommendation
     */
    generateRecommendationReason(validator, preferences, weights) {
        const reasons = [];
        const scores = {
            mev: validator.mev_score,
            reliability: validator.reliability_score,
            commission: validator.commission_score,
            decentralization: validator.decentralization_score,
            consistency: validator.consistency_score
        };

        // Find top strengths
        const sortedScores = Object.entries(scores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2);

        sortedScores.forEach(([category, score]) => {
            if (score > 75) {
                switch (category) {
                    case 'mev':
                        reasons.push('Excellent MEV earning potential');
                        break;
                    case 'reliability':
                        reasons.push('Outstanding reliability and uptime');
                        break;
                    case 'commission':
                        reasons.push('Competitive commission with good value');
                        break;
                    case 'decentralization':
                        reasons.push('Supports network decentralization');
                        break;
                    case 'consistency':
                        reasons.push('Consistent performance over time');
                        break;
                }
            }
        });

        if (reasons.length === 0) {
            reasons.push('Balanced performance across all metrics');
        }

        return reasons.join(', ');
    }

    /**
     * Get detailed analytics for a specific validator
     * @param {string} validatorId - Validator vote account
     * @returns {Promise<Object>} Detailed validator analytics
     */
    async getValidatorAnalytics(validatorId) {
        try {
            const query = `
                SELECT 
                    vs.*,
                    v.vote_account,
                    v.identity,
                    v.commission_rate,
                    v.stake_amount,
                    v.epochs_active,
                    vh.total_mev_rewards,
                    vh.avg_daily_mev,
                    vh.mev_consistency,
                    vh.uptime_percentage
                FROM validator_scores vs
                JOIN validators v ON vs.validator_id = v.vote_account
                LEFT JOIN validator_historical_mev vh ON v.vote_account = vh.validator_id
                WHERE v.vote_account = $1
            `;

            const result = await this.db.query(query, [validatorId]);
            
            if (result.rows.length === 0) {
                throw new Error('Validator not found');
            }

            const validator = result.rows[0];
            
            // Get score breakdowns
            const scoreBreakdowns = {
                mev_potential: JSON.parse(validator.mev_breakdown || '{}'),
                reliability: JSON.parse(validator.reliability_breakdown || '{}'),
                commission: JSON.parse(validator.commission_breakdown || '{}'),
                decentralization: JSON.parse(validator.decentralization_breakdown || '{}'),
                consistency: JSON.parse(validator.consistency_breakdown || '{}')
            };

            // Calculate percentile rankings
            const percentileQuery = `
                SELECT 
                    PERCENT_RANK() OVER (ORDER BY composite_score) as composite_percentile,
                    PERCENT_RANK() OVER (ORDER BY mev_score) as mev_percentile,
                    PERCENT_RANK() OVER (ORDER BY reliability_score) as reliability_percentile
                FROM validator_scores
                WHERE validator_id = $1
            `;
            
            const percentileResult = await this.db.query(percentileQuery, [validatorId]);
            const percentiles = percentileResult.rows[0] || {};

            return {
                validator_info: {
                    vote_account: validator.vote_account,
                    identity: validator.identity,
                    commission_rate: validator.commission_rate,
                    stake_amount: validator.stake_amount,
                    epochs_active: validator.epochs_active
                },
                scores: {
                    composite_score: validator.composite_score,
                    mev_potential: validator.mev_score,
                    reliability: validator.reliability_score,
                    commission: validator.commission_score,
                    decentralization: validator.decentralization_score,
                    consistency: validator.consistency_score
                },
                score_breakdowns: scoreBreakdowns,
                percentile_rankings: {
                    composite: Math.round(percentiles.composite_percentile * 100),
                    mev_potential: Math.round(percentiles.mev_percentile * 100),
                    reliability: Math.round(percentiles.reliability_percentile * 100)
                },
                mev_analytics: {
                    total_mev_rewards: validator.total_mev_rewards || 0,
                    avg_daily_mev: validator.avg_daily_mev || 0,
                    mev_consistency: validator.mev_consistency || 0
                },
                risk_assessment: {
                    risk_penalty: validator.risk_penalty,
                    risk_factors: JSON.parse(validator.risk_factors || '{}')
                },
                last_updated: validator.last_updated
            };
        } catch (error) {
            this.logger.error('Error getting validator analytics:', error);
            throw error;
        }
    }

    /**
     * Update configuration weights
     * @param {Object} newWeights - New scoring weights
     */
    updateScoringWeights(newWeights) {
        this.config.scoringWeights = { ...this.config.scoringWeights, ...newWeights };
        
        // Normalize weights to sum to 1
        const totalWeight = Object.values(this.config.scoringWeights).reduce((sum, weight) => sum + weight, 0);
        Object.keys(this.config.scoringWeights).forEach(key => {
            this.config.scoringWeights[key] /= totalWeight;
        });

        this.emit('configUpdated', { scoringWeights: this.config.scoringWeights });
    }

    /**
     * Get system statistics
     * @returns {Promise<Object>} System statistics
     */
    async getSystemStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_validators,
                    AVG(composite_score) as avg_composite_score,
                    AVG(mev_score) as avg_mev_score,
                    AVG(reliability_score) as avg_reliability_score,
                    MAX(last_updated) as last_score_update
                FROM validator_scores
                WHERE last_updated > NOW() - INTERVAL '24 hours'
            `;

            const result = await this.db.query(query);
            const stats = result.rows[0] || {};

            return {
                total_validators: parseInt(stats.total_validators) || 0,
                average_scores: {
                    composite: Math.round((stats.avg_composite_score || 0) * 100) / 100,
                    mev_potential: Math.round((stats.avg_mev_score || 0) * 100) / 100,
                    reliability: Math.round((stats.avg_reliability_score || 0) * 100) / 100
                },
                last_update: stats.last_score_update,
                scoring_weights: this.config.scoringWeights,
                system_health: {
                    active_validators: parseInt(stats.total_validators) || 0,
                    data_freshness: stats.last_score_update ? 'current' : 'stale'
                }
            };
        } catch (error) {
            this.logger.error('Error getting system stats:', error);
            throw error;
        }
    }
}

module.exports = DelegationAnalyticsEngine;