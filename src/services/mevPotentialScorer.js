const EventEmitter = require('events');

/**
 * MEV Potential Scoring Algorithm
 * 
 * Evaluates validator MEV earning capability using multiple factors:
 * - Historical MEV earnings and consistency
 * - Block production patterns and timing
 * - Network position and connectivity
 * - Market maker relationships and DEX activity
 * - Jito bundle success rates
 */
class MEVPotentialScorer extends EventEmitter {
    constructor(database, historicalTracker, logger) {
        super();
        this.db = database;
        this.historicalTracker = historicalTracker;
        this.logger = logger;

        // MEV scoring configuration
        this.config = {
            scoringWeights: {
                historicalEarnings: 0.35,    // Past MEV performance
                consistencyPattern: 0.20,    // Reliability of MEV extraction
                blockProductionTiming: 0.15, // Optimal block scheduling
                networkPosition: 0.15,       // Validator network connectivity
                jitoBundleSuccess: 0.10,     // Success with MEV bundles
                dexActivityCorrelation: 0.05 // Correlation with DEX volume
            },
            thresholds: {
                excellentMev: 1000,    // SOL per epoch
                goodMev: 500,          // SOL per epoch
                averageMev: 100,       // SOL per epoch
                minimumEpochs: 10,     // Minimum data for reliable scoring
                consistencyThreshold: 0.7, // Minimum consistency score
                jitoBundleMinSuccess: 0.3   // Minimum Jito success rate
            },
            timeWindows: {
                recentPerformance: 30,  // Last 30 epochs
                mediumTerm: 100,        // Last 100 epochs
                longTerm: 300          // Last 300 epochs (historical analysis)
            }
        };
    }

    /**
     * Calculate comprehensive MEV potential score for a validator
     * @param {string} validatorId - Validator vote account
     * @param {Object} options - Scoring options
     * @returns {Promise<Object>} MEV potential score and detailed breakdown
     */
    async calculateMevPotentialScore(validatorId, options = {}) {
        try {
            const {
                includeProjections = true,
                timeframe = 'recent',
                includeRiskAdjustment = true
            } = options;

            // Gather comprehensive validator data
            const validatorData = await this.gatherValidatorMevData(validatorId);
            
            if (!validatorData || validatorData.epochs_active < this.config.thresholds.minimumEpochs) {
                return this.getInsufficientDataScore(validatorId, validatorData);
            }

            // Calculate individual scoring components
            const [
                historicalScore,
                consistencyScore,
                timingScore,
                networkScore,
                jitoScore,
                dexCorrelationScore
            ] = await Promise.all([
                this.calculateHistoricalEarningsScore(validatorData),
                this.calculateConsistencyScore(validatorData),
                this.calculateBlockTimingScore(validatorData),
                this.calculateNetworkPositionScore(validatorData),
                this.calculateJitoBundleScore(validatorData),
                this.calculateDexCorrelationScore(validatorData)
            ]);

            // Calculate weighted composite score
            const compositeScore = this.calculateCompositeScore({
                historical: historicalScore,
                consistency: consistencyScore,
                timing: timingScore,
                network: networkScore,
                jito: jitoScore,
                dexCorrelation: dexCorrelationScore
            });

            // Apply risk adjustments if requested
            const riskAdjustment = includeRiskAdjustment 
                ? await this.calculateRiskAdjustment(validatorData)
                : { factor: 1.0, reasons: [] };

            const finalScore = compositeScore * riskAdjustment.factor;

            // Generate projections if requested
            const projections = includeProjections 
                ? await this.generateMevProjections(validatorData, finalScore)
                : null;

            const result = {
                validator_id: validatorId,
                mev_potential_score: Math.round(finalScore * 100) / 100,
                score_breakdown: {
                    historical_earnings: historicalScore,
                    consistency_pattern: consistencyScore,
                    block_timing: timingScore,
                    network_position: networkScore,
                    jito_bundle_success: jitoScore,
                    dex_correlation: dexCorrelationScore
                },
                composite_score: Math.round(compositeScore * 100) / 100,
                risk_adjustment: riskAdjustment,
                confidence_level: this.calculateConfidenceLevel(validatorData),
                data_quality: this.assessDataQuality(validatorData),
                last_updated: new Date().toISOString()
            };

            if (projections) {
                result.projections = projections;
            }

            // Emit scoring event
            this.emit('mevScoreCalculated', {
                validatorId,
                score: finalScore,
                confidence: result.confidence_level
            });

            return result;

        } catch (error) {
            this.logger.error(`Error calculating MEV potential score for ${validatorId}:`, error);
            throw error;
        }
    }

    /**
     * Gather comprehensive MEV data for a validator
     * @param {string} validatorId - Validator vote account
     * @returns {Promise<Object>} Comprehensive validator MEV data
     */
    async gatherValidatorMevData(validatorId) {
        try {
            const query = `
                WITH validator_base AS (
                    SELECT 
                        v.vote_account,
                        v.identity,
                        v.epochs_active,
                        v.stake_amount,
                        v.commission_rate,
                        v.uptime_percentage
                    FROM validators v
                    WHERE v.vote_account = $1
                ),
                mev_historical AS (
                    SELECT 
                        vh.validator_id,
                        vh.total_mev_rewards,
                        vh.avg_daily_mev,
                        vh.mev_consistency,
                        vh.peak_mev_day,
                        vh.mev_trend_30d,
                        vh.unique_mev_strategies
                    FROM validator_historical_mev vh
                    WHERE vh.validator_id = $1
                ),
                recent_performance AS (
                    SELECT 
                        vmp.validator_id,
                        AVG(vmp.mev_rewards) as avg_recent_mev,
                        STDDEV(vmp.mev_rewards) as mev_variance,
                        COUNT(*) as recent_epochs,
                        SUM(CASE WHEN vmp.mev_rewards > 0 THEN 1 ELSE 0 END) as profitable_epochs
                    FROM validator_mev_performance vmp
                    WHERE vmp.validator_id = $1 
                    AND vmp.epoch_number > (
                        SELECT MAX(epoch_number) - $2 FROM validator_mev_performance
                    )
                    GROUP BY vmp.validator_id
                ),
                block_timing AS (
                    SELECT 
                        bp.validator_id,
                        AVG(bp.avg_block_time) as avg_block_timing,
                        AVG(bp.first_transaction_delay) as avg_first_tx_delay,
                        AVG(bp.mev_bundle_inclusion_rate) as bundle_inclusion_rate,
                        COUNT(DISTINCT bp.epoch_number) as timing_data_epochs
                    FROM block_production bp
                    WHERE bp.validator_id = $1
                    AND bp.epoch_number > (
                        SELECT MAX(epoch_number) - $3 FROM block_production
                    )
                    GROUP BY bp.validator_id
                ),
                jito_performance AS (
                    SELECT 
                        jp.validator_id,
                        AVG(jp.bundle_success_rate) as avg_bundle_success,
                        AVG(jp.bundle_profit_margin) as avg_profit_margin,
                        SUM(jp.total_bundles_processed) as total_bundles,
                        AVG(jp.bundle_acceptance_latency) as avg_acceptance_latency
                    FROM jito_performance jp
                    WHERE jp.validator_id = $1
                    AND jp.date > NOW() - INTERVAL '$4 days'
                    GROUP BY jp.validator_id
                )
                SELECT 
                    vb.*,
                    mh.total_mev_rewards,
                    mh.avg_daily_mev,
                    mh.mev_consistency,
                    mh.peak_mev_day,
                    mh.mev_trend_30d,
                    mh.unique_mev_strategies,
                    rp.avg_recent_mev,
                    rp.mev_variance,
                    rp.recent_epochs,
                    rp.profitable_epochs,
                    bt.avg_block_timing,
                    bt.avg_first_tx_delay,
                    bt.bundle_inclusion_rate,
                    bt.timing_data_epochs,
                    jip.avg_bundle_success,
                    jip.avg_profit_margin,
                    jip.total_bundles,
                    jip.avg_acceptance_latency
                FROM validator_base vb
                LEFT JOIN mev_historical mh ON vb.vote_account = mh.validator_id
                LEFT JOIN recent_performance rp ON vb.vote_account = rp.validator_id
                LEFT JOIN block_timing bt ON vb.vote_account = bt.validator_id
                LEFT JOIN jito_performance jip ON vb.vote_account = jip.validator_id
            `;

            const result = await this.db.query(query, [
                validatorId,
                this.config.timeWindows.recentPerformance,
                this.config.timeWindows.recentPerformance,
                this.config.timeWindows.recentPerformance
            ]);

            return result.rows[0] || null;

        } catch (error) {
            this.logger.error(`Error gathering validator MEV data for ${validatorId}:`, error);
            throw error;
        }
    }

    /**
     * Calculate historical earnings score (35% weight)
     * @param {Object} data - Validator data
     * @returns {number} Historical earnings score (0-100)
     */
    calculateHistoricalEarningsScore(data) {
        const {
            total_mev_rewards = 0,
            epochs_active = 1,
            avg_daily_mev = 0,
            peak_mev_day = 0,
            mev_trend_30d = 0
        } = data;

        // Calculate average MEV per epoch
        const avgMevPerEpoch = total_mev_rewards / epochs_active;

        // Score components (0-100 each)
        const earningsLevel = Math.min(100, (avgMevPerEpoch / this.config.thresholds.excellentMev) * 100);
        const dailyPerformance = Math.min(100, (avg_daily_mev / (this.config.thresholds.excellentMev / 2)) * 100);
        const peakCapability = Math.min(100, (peak_mev_day / this.config.thresholds.excellentMev) * 100);
        const trendMomentum = Math.max(0, Math.min(100, 50 + (mev_trend_30d * 50))); // Trend can be negative

        // Weighted average of components
        const score = (
            earningsLevel * 0.4 +
            dailyPerformance * 0.3 +
            peakCapability * 0.2 +
            trendMomentum * 0.1
        );

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate consistency pattern score (20% weight)
     * @param {Object} data - Validator data
     * @returns {number} Consistency score (0-100)
     */
    calculateConsistencyScore(data) {
        const {
            mev_consistency = 0,
            profitable_epochs = 0,
            recent_epochs = 1,
            mev_variance = 1000000, // High variance indicates inconsistency
            avg_recent_mev = 0
        } = data;

        // Score components
        const overallConsistency = Math.min(100, mev_consistency * 100);
        const profitabilityRate = Math.min(100, (profitable_epochs / recent_epochs) * 100);
        const volatilityScore = Math.max(0, 100 - Math.min(100, Math.sqrt(mev_variance) / 100));
        const recentPerformance = avg_recent_mev > 0 ? 85 : 15;

        // Weighted average
        const score = (
            overallConsistency * 0.4 +
            profitabilityRate * 0.3 +
            volatilityScore * 0.2 +
            recentPerformance * 0.1
        );

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate block production timing score (15% weight)
     * @param {Object} data - Validator data
     * @returns {number} Block timing score (0-100)
     */
    calculateBlockTimingScore(data) {
        const {
            avg_block_timing = 400, // Default to 400ms (average)
            avg_first_tx_delay = 100, // Default to 100ms
            bundle_inclusion_rate = 0,
            timing_data_epochs = 0
        } = data;

        if (timing_data_epochs === 0) {
            return 25; // Default score for no timing data
        }

        // Score components (lower times are better for MEV)
        const blockTimingScore = Math.max(0, 100 - ((avg_block_timing - 200) / 10)); // Optimal ~200ms
        const firstTxScore = Math.max(0, 100 - (avg_first_tx_delay / 2)); // Lower delay better
        const inclusionScore = Math.min(100, bundle_inclusion_rate * 100);
        const dataQuality = Math.min(100, timing_data_epochs * 5); // More data = higher confidence

        // Weighted average
        const score = (
            blockTimingScore * 0.35 +
            firstTxScore * 0.30 +
            inclusionScore * 0.25 +
            dataQuality * 0.10
        );

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate network position score (15% weight)
     * @param {Object} data - Validator data
     * @returns {number} Network position score (0-100)
     */
    calculateNetworkPositionScore(data) {
        const {
            stake_amount = 0,
            uptime_percentage = 0,
            epochs_active = 0,
            commission_rate = 100
        } = data;

        // Network position indicators
        const stakeInfluence = Math.min(100, Math.log10(stake_amount + 1) * 10); // Log scale for stake
        const reliabilityScore = Math.min(100, uptime_percentage);
        const experienceScore = Math.min(100, epochs_active / 10); // Experience factor
        const attractivenessScore = Math.max(0, 100 - commission_rate); // Lower commission attracts more delegation

        // Weighted average
        const score = (
            stakeInfluence * 0.35 +
            reliabilityScore * 0.30 +
            experienceScore * 0.20 +
            attractivenessScore * 0.15
        );

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate Jito bundle success score (10% weight)
     * @param {Object} data - Validator data
     * @returns {number} Jito bundle score (0-100)
     */
    calculateJitoBundleScore(data) {
        const {
            avg_bundle_success = 0,
            avg_profit_margin = 0,
            total_bundles = 0,
            avg_acceptance_latency = 1000 // Default to 1000ms
        } = data;

        if (total_bundles === 0) {
            return 10; // Low score for no Jito activity
        }

        // Score components
        const successRate = Math.min(100, avg_bundle_success * 100);
        const profitabilityScore = Math.min(100, avg_profit_margin * 200); // 50% margin = 100 points
        const volumeScore = Math.min(100, Math.log10(total_bundles + 1) * 25);
        const latencyScore = Math.max(0, 100 - (avg_acceptance_latency / 10)); // Lower latency better

        // Weighted average
        const score = (
            successRate * 0.4 +
            profitabilityScore * 0.3 +
            volumeScore * 0.2 +
            latencyScore * 0.1
        );

        return Math.round(score * 100) / 100;
    }

    /**
     * Calculate DEX activity correlation score (5% weight)
     * @param {Object} data - Validator data
     * @returns {number} DEX correlation score (0-100)
     */
    async calculateDexCorrelationScore(data) {
        try {
            const { vote_account } = data;

            // Get DEX activity correlation data
            const correlationQuery = `
                SELECT 
                    AVG(correlation_coefficient) as avg_correlation,
                    COUNT(*) as correlation_periods,
                    MAX(correlation_coefficient) as peak_correlation
                FROM validator_dex_correlation 
                WHERE validator_id = $1
                AND date > NOW() - INTERVAL '30 days'
            `;

            const result = await this.db.query(correlationQuery, [vote_account]);
            const correlationData = result.rows[0] || {};

            const {
                avg_correlation = 0,
                correlation_periods = 0,
                peak_correlation = 0
            } = correlationData;

            if (correlation_periods === 0) {
                return 30; // Default moderate score for no correlation data
            }

            // Score components
            const avgCorrelationScore = Math.min(100, Math.abs(avg_correlation) * 100);
            const peakCorrelationScore = Math.min(100, Math.abs(peak_correlation) * 100);
            const dataQualityScore = Math.min(100, correlation_periods * 5);

            // Weighted average
            const score = (
                avgCorrelationScore * 0.5 +
                peakCorrelationScore * 0.3 +
                dataQualityScore * 0.2
            );

            return Math.round(score * 100) / 100;

        } catch (error) {
            this.logger.error('Error calculating DEX correlation score:', error);
            return 30; // Default score on error
        }
    }

    /**
     * Calculate composite score from individual components
     * @param {Object} scores - Individual component scores
     * @returns {number} Composite score (0-100)
     */
    calculateCompositeScore(scores) {
        const weights = this.config.scoringWeights;
        
        const compositeScore = (
            scores.historical * weights.historicalEarnings +
            scores.consistency * weights.consistencyPattern +
            scores.timing * weights.blockProductionTiming +
            scores.network * weights.networkPosition +
            scores.jito * weights.jitoBundleSuccess +
            scores.dexCorrelation * weights.dexActivityCorrelation
        );

        return Math.round(compositeScore * 100) / 100;
    }

    /**
     * Calculate risk adjustment factor
     * @param {Object} data - Validator data
     * @returns {Promise<Object>} Risk adjustment factor and reasons
     */
    async calculateRiskAdjustment(data) {
        const adjustments = {
            factor: 1.0,
            reasons: []
        };

        const {
            epochs_active = 0,
            avg_recent_mev = 0,
            mev_consistency = 0,
            uptime_percentage = 0,
            commission_rate = 0
        } = data;

        // New validator penalty
        if (epochs_active < 50) {
            const penalty = (50 - epochs_active) / 500; // Max 10% penalty
            adjustments.factor -= penalty;
            adjustments.reasons.push(`New validator penalty: ${Math.round(penalty * 100)}%`);
        }

        // Inconsistent performance penalty
        if (mev_consistency < this.config.thresholds.consistencyThreshold) {
            const penalty = (this.config.thresholds.consistencyThreshold - mev_consistency) * 0.2;
            adjustments.factor -= penalty;
            adjustments.reasons.push(`Inconsistency penalty: ${Math.round(penalty * 100)}%`);
        }

        // Low recent performance penalty
        if (avg_recent_mev < this.config.thresholds.averageMev) {
            const penalty = 0.1;
            adjustments.factor -= penalty;
            adjustments.reasons.push(`Low recent performance penalty: ${Math.round(penalty * 100)}%`);
        }

        // Poor uptime penalty
        if (uptime_percentage < 95) {
            const penalty = (95 - uptime_percentage) / 1000; // Max 5% penalty
            adjustments.factor -= penalty;
            adjustments.reasons.push(`Uptime penalty: ${Math.round(penalty * 100)}%`);
        }

        // High commission penalty
        if (commission_rate > 10) {
            const penalty = (commission_rate - 10) / 1000; // Gradual penalty above 10%
            adjustments.factor -= penalty;
            adjustments.reasons.push(`High commission penalty: ${Math.round(penalty * 100)}%`);
        }

        // Ensure factor doesn't go below 0.5
        adjustments.factor = Math.max(0.5, adjustments.factor);
        
        return adjustments;
    }

    /**
     * Generate MEV earning projections
     * @param {Object} data - Validator data
     * @param {number} score - MEV potential score
     * @returns {Promise<Object>} MEV projections
     */
    async generateMevProjections(data, score) {
        try {
            const {
                avg_daily_mev = 0,
                mev_trend_30d = 0,
                total_mev_rewards = 0,
                epochs_active = 1
            } = data;

            const avgMevPerEpoch = total_mev_rewards / epochs_active;
            
            // Calculate projections based on score and trends
            const baselineProjection = avgMevPerEpoch;
            const trendAdjustment = baselineProjection * mev_trend_30d;
            const scoreMultiplier = score / 100;

            return {
                next_epoch: {
                    conservative: Math.round((baselineProjection * 0.8 * scoreMultiplier) * 100) / 100,
                    expected: Math.round((baselineProjection + trendAdjustment) * scoreMultiplier * 100) / 100,
                    optimistic: Math.round((baselineProjection * 1.3 * scoreMultiplier) * 100) / 100
                },
                next_30_days: {
                    conservative: Math.round((avg_daily_mev * 30 * 0.8 * scoreMultiplier) * 100) / 100,
                    expected: Math.round((avg_daily_mev * 30 * (1 + trendAdjustment/baselineProjection) * scoreMultiplier) * 100) / 100,
                    optimistic: Math.round((avg_daily_mev * 30 * 1.4 * scoreMultiplier) * 100) / 100
                },
                confidence_intervals: {
                    confidence_level: this.calculateConfidenceLevel(data),
                    margin_of_error: Math.round((baselineProjection * 0.2) * 100) / 100
                }
            };

        } catch (error) {
            this.logger.error('Error generating MEV projections:', error);
            return {
                next_epoch: { conservative: 0, expected: 0, optimistic: 0 },
                next_30_days: { conservative: 0, expected: 0, optimistic: 0 },
                confidence_intervals: { confidence_level: 0, margin_of_error: 0 }
            };
        }
    }

    /**
     * Calculate confidence level for scoring
     * @param {Object} data - Validator data
     * @returns {number} Confidence level (0-100)
     */
    calculateConfidenceLevel(data) {
        const {
            epochs_active = 0,
            recent_epochs = 0,
            timing_data_epochs = 0,
            total_bundles = 0
        } = data;

        // Base confidence from data quantity
        const epochConfidence = Math.min(100, epochs_active * 2); // 50 epochs = 100% confidence
        const recentDataConfidence = Math.min(100, recent_epochs * 5); // 20 recent epochs = 100%
        const timingConfidence = Math.min(100, timing_data_epochs * 10); // 10 timing epochs = 100%
        const jitoConfidence = total_bundles > 0 ? Math.min(100, Math.log10(total_bundles + 1) * 25) : 10;

        // Weighted average of confidence factors
        const overallConfidence = (
            epochConfidence * 0.4 +
            recentDataConfidence * 0.3 +
            timingConfidence * 0.2 +
            jitoConfidence * 0.1
        );

        return Math.round(overallConfidence * 100) / 100;
    }

    /**
     * Assess data quality for scoring reliability
     * @param {Object} data - Validator data
     * @returns {Object} Data quality assessment
     */
    assessDataQuality(data) {
        const {
            epochs_active = 0,
            recent_epochs = 0,
            timing_data_epochs = 0,
            total_bundles = 0,
            mev_consistency = 0
        } = data;

        const quality = {
            historical_data: epochs_active >= this.config.thresholds.minimumEpochs ? 'good' : 'insufficient',
            recent_performance: recent_epochs >= 10 ? 'good' : 'limited',
            timing_analysis: timing_data_epochs >= 5 ? 'available' : 'unavailable',
            jito_data: total_bundles > 0 ? 'available' : 'unavailable',
            consistency_reliability: mev_consistency > 0.5 ? 'reliable' : 'variable',
            overall_rating: 'good' // Will be calculated below
        };

        // Calculate overall rating
        const goodFactors = Object.values(quality).filter(v => 
            v === 'good' || v === 'available' || v === 'reliable'
        ).length;

        if (goodFactors >= 4) {
            quality.overall_rating = 'excellent';
        } else if (goodFactors >= 3) {
            quality.overall_rating = 'good';
        } else if (goodFactors >= 2) {
            quality.overall_rating = 'fair';
        } else {
            quality.overall_rating = 'poor';
        }

        return quality;
    }

    /**
     * Get insufficient data score for validators with limited history
     * @param {string} validatorId - Validator ID
     * @param {Object} data - Limited validator data
     * @returns {Object} Default score structure
     */
    getInsufficientDataScore(validatorId, data) {
        const epochs = data?.epochs_active || 0;
        const baseScore = Math.min(40, epochs * 4); // Max 40 points for new validators

        return {
            validator_id: validatorId,
            mev_potential_score: baseScore,
            score_breakdown: {
                historical_earnings: 0,
                consistency_pattern: 0,
                block_timing: 25, // Default modest score
                network_position: 30, // Based on basic validator metrics
                jito_bundle_success: 0,
                dex_correlation: 30 // Default moderate score
            },
            composite_score: baseScore,
            risk_adjustment: {
                factor: 0.6,
                reasons: ['Insufficient historical data', 'New validator penalty']
            },
            confidence_level: Math.min(20, epochs * 2),
            data_quality: {
                historical_data: 'insufficient',
                recent_performance: 'insufficient',
                timing_analysis: 'unavailable',
                jito_data: 'unavailable',
                consistency_reliability: 'unknown',
                overall_rating: 'poor'
            },
            last_updated: new Date().toISOString()
        };
    }

    /**
     * Batch calculate MEV potential scores for multiple validators
     * @param {Array<string>} validatorIds - Array of validator vote accounts
     * @param {Object} options - Scoring options
     * @returns {Promise<Array>} Array of MEV potential scores
     */
    async batchCalculateScores(validatorIds, options = {}) {
        try {
            const { concurrency = 10 } = options;
            const results = [];
            
            // Process in batches to avoid overwhelming the database
            for (let i = 0; i < validatorIds.length; i += concurrency) {
                const batch = validatorIds.slice(i, i + concurrency);
                const batchPromises = batch.map(id => 
                    this.calculateMevPotentialScore(id, options)
                        .catch(error => {
                            this.logger.error(`Error scoring validator ${id}:`, error);
                            return this.getInsufficientDataScore(id, null);
                        })
                );
                
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                
                // Brief pause between batches
                if (i + concurrency < validatorIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            this.emit('batchScoringComplete', {
                totalValidators: validatorIds.length,
                successful: results.filter(r => r.confidence_level > 20).length,
                averageScore: results.reduce((sum, r) => sum + r.mev_potential_score, 0) / results.length
            });
            
            return results;
            
        } catch (error) {
            this.logger.error('Error in batch MEV scoring:', error);
            throw error;
        }
    }

    /**
     * Get MEV potential rankings
     * @param {Object} filters - Filtering criteria
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Ranked validators by MEV potential
     */
    async getMevPotentialRankings(filters = {}, limit = 50) {
        try {
            const {
                minScore = 0,
                minConfidence = 20,
                excludeNewValidators = false,
                includeProjections = false
            } = filters;

            // Build query with filters
            let whereClause = 'WHERE 1=1';
            const queryParams = [];
            let paramIndex = 1;

            if (minScore > 0) {
                whereClause += ` AND mev_potential_score >= $${paramIndex++}`;
                queryParams.push(minScore);
            }

            if (minConfidence > 0) {
                whereClause += ` AND confidence_level >= $${paramIndex++}`;
                queryParams.push(minConfidence);
            }

            if (excludeNewValidators) {
                whereClause += ` AND data_quality->>'historical_data' != 'insufficient'`;
            }

            const query = `
                SELECT 
                    validator_id,
                    mev_potential_score,
                    score_breakdown,
                    confidence_level,
                    data_quality,
                    last_updated,
                    RANK() OVER (ORDER BY mev_potential_score DESC) as rank
                FROM validator_mev_scores
                ${whereClause}
                ORDER BY mev_potential_score DESC
                LIMIT $${paramIndex}
            `;

            queryParams.push(limit);
            const result = await this.db.query(query, queryParams);
            
            const rankings = result.rows.map(row => ({
                ...row,
                score_breakdown: JSON.parse(row.score_breakdown || '{}'),
                data_quality: JSON.parse(row.data_quality || '{}')
            }));

            // Add projections if requested
            if (includeProjections) {
                for (const ranking of rankings) {
                    const validatorData = await this.gatherValidatorMevData(ranking.validator_id);
                    if (validatorData) {
                        ranking.projections = await this.generateMevProjections(
                            validatorData, 
                            ranking.mev_potential_score
                        );
                    }
                }
            }

            return rankings;

        } catch (error) {
            this.logger.error('Error getting MEV potential rankings:', error);
            throw error;
        }
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

    /**
     * Get scoring statistics
     * @returns {Promise<Object>} Scoring system statistics
     */
    async getSystemStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_scored_validators,
                    AVG(mev_potential_score) as avg_mev_score,
                    STDDEV(mev_potential_score) as score_stddev,
                    AVG(confidence_level) as avg_confidence,
                    COUNT(CASE WHEN mev_potential_score >= 70 THEN 1 END) as high_potential_validators,
                    COUNT(CASE WHEN confidence_level >= 70 THEN 1 END) as high_confidence_scores,
                    MAX(last_updated) as latest_update
                FROM validator_mev_scores
                WHERE last_updated > NOW() - INTERVAL '7 days'
            `;

            const result = await this.db.query(query);
            const stats = result.rows[0] || {};

            return {
                total_validators: parseInt(stats.total_scored_validators) || 0,
                score_distribution: {
                    average: Math.round((stats.avg_mev_score || 0) * 100) / 100,
                    standard_deviation: Math.round((stats.score_stddev || 0) * 100) / 100,
                    high_potential_count: parseInt(stats.high_potential_validators) || 0
                },
                confidence_metrics: {
                    average_confidence: Math.round((stats.avg_confidence || 0) * 100) / 100,
                    high_confidence_count: parseInt(stats.high_confidence_scores) || 0
                },
                system_health: {
                    latest_update: stats.latest_update,
                    scoring_weights: this.config.scoringWeights,
                    active_thresholds: this.config.thresholds
                }
            };

        } catch (error) {
            this.logger.error('Error getting MEV scoring system stats:', error);
            throw error;
        }
    }
}

module.exports = MEVPotentialScorer;