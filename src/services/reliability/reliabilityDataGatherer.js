/**
 * Reliability Data Gatherer
 * 
 * Responsible for gathering comprehensive reliability and performance data
 * for validator reliability scoring analysis
 */
class ReliabilityDataGatherer {
    constructor(database, logger) {
        this.db = database;
        this.logger = logger;
    }

    /**
     * Gather comprehensive reliability data for a validator
     * @param {string} validatorId - Validator vote account
     * @param {string} timeframe - Time window for analysis
     * @returns {Promise<Object>} Comprehensive reliability data
     */
    async gatherReliabilityData(validatorId, timeframe = 'recent') {
        try {
            const query = `
                WITH validator_base AS (
                    SELECT 
                        v.vote_account,
                        v.epochs_active,
                        v.uptime_percentage,
                        v.skip_rate,
                        v.vote_success_rate,
                        v.last_vote_distance
                    FROM validators v
                    WHERE v.vote_account = $1
                ),
                recent_performance AS (
                    SELECT 
                        vp.validator_id,
                        AVG(vp.uptime) as avg_recent_uptime,
                        AVG(vp.vote_credits) as avg_vote_credits,
                        AVG(vp.skip_rate) as avg_skip_rate,
                        AVG(vp.vote_distance) as avg_vote_distance,
                        STDDEV(vp.epoch_rewards) as reward_variance,
                        COUNT(*) as recent_epochs,
                        SUM(CASE WHEN vp.uptime > 95 THEN 1 ELSE 0 END) as good_uptime_epochs
                    FROM validator_performance vp
                    WHERE vp.validator_id = $1 
                    AND vp.epoch_number > (
                        SELECT MAX(epoch_number) - 30 FROM validator_performance
                    )
                    GROUP BY vp.validator_id
                ),
                block_production AS (
                    SELECT 
                        bp.validator_id,
                        AVG(bp.blocks_produced) as avg_blocks_produced,
                        AVG(bp.expected_blocks) as avg_expected_blocks,
                        AVG(bp.block_production_rate) as avg_production_rate,
                        COUNT(*) as production_epochs
                    FROM block_production bp
                    WHERE bp.validator_id = $1
                    AND bp.epoch_number > (
                        SELECT MAX(epoch_number) - 30 FROM block_production
                    )
                    GROUP BY bp.validator_id
                ),
                network_events AS (
                    SELECT 
                        ne.validator_id,
                        COUNT(*) as total_network_events,
                        SUM(CASE WHEN ne.participated THEN 1 ELSE 0 END) as participated_events,
                        AVG(CASE WHEN ne.participated THEN ne.response_time_ms END) as avg_response_time
                    FROM network_events ne
                    WHERE ne.validator_id = $1
                    AND ne.event_time > NOW() - INTERVAL '60 days'
                    GROUP BY ne.validator_id
                )
                SELECT 
                    vb.*,
                    rp.avg_recent_uptime,
                    rp.avg_vote_credits,
                    rp.avg_skip_rate,
                    rp.avg_vote_distance,
                    rp.reward_variance,
                    rp.recent_epochs,
                    rp.good_uptime_epochs,
                    bp.avg_blocks_produced,
                    bp.avg_expected_blocks,
                    bp.avg_production_rate,
                    bp.production_epochs,
                    ne.total_network_events,
                    ne.participated_events,
                    ne.avg_response_time
                FROM validator_base vb
                LEFT JOIN recent_performance rp ON vb.vote_account = rp.validator_id
                LEFT JOIN block_production bp ON vb.vote_account = bp.validator_id
                LEFT JOIN network_events ne ON vb.vote_account = ne.validator_id
            `;

            const result = await this.db.query(query, [validatorId]);
            return result.rows[0] || null;

        } catch (error) {
            this.logger.error(`Error gathering reliability data for ${validatorId}:`, error);
            throw error;
        }
    }

    /**
     * Analyze historical reliability trends for a validator
     * @param {string} validatorId - Validator vote account
     * @returns {Promise<Object>} Historical trend analysis
     */
    async analyzeHistoricalTrends(validatorId) {
        try {
            const query = `
                WITH monthly_performance AS (
                    SELECT 
                        DATE_TRUNC('month', vp.created_at) as month,
                        AVG(vp.uptime) as avg_uptime,
                        AVG(vp.vote_credits) as avg_vote_credits,
                        AVG(vp.skip_rate) as avg_skip_rate,
                        STDDEV(vp.uptime) as uptime_variance
                    FROM validator_performance vp
                    WHERE vp.validator_id = $1
                    AND vp.created_at > NOW() - INTERVAL '12 months'
                    GROUP BY DATE_TRUNC('month', vp.created_at)
                    ORDER BY month
                )
                SELECT 
                    month,
                    avg_uptime,
                    avg_vote_credits,
                    avg_skip_rate,
                    uptime_variance,
                    LAG(avg_uptime) OVER (ORDER BY month) as prev_uptime,
                    LAG(avg_vote_credits) OVER (ORDER BY month) as prev_vote_credits
                FROM monthly_performance
            `;

            const result = await this.db.query(query, [validatorId]);
            const trends = result.rows;

            if (trends.length < 3) {
                return {
                    trend_direction: 'insufficient_data',
                    uptime_trend: 'stable',
                    vote_trend: 'stable',
                    reliability_assessment: 'unknown',
                    data_points: trends.length
                };
            }

            // Calculate trend directions
            const uptimeTrend = this.calculateTrendDirection(trends.map(t => t.avg_uptime));
            const voteTrend = this.calculateTrendDirection(trends.map(t => t.avg_vote_credits));
            const skipTrend = this.calculateTrendDirection(trends.map(t => t.avg_skip_rate));

            return {
                trend_direction: this.getOverallTrendDirection(uptimeTrend, voteTrend, skipTrend),
                uptime_trend: uptimeTrend,
                vote_trend: voteTrend,
                skip_trend: skipTrend,
                variance_analysis: this.analyzeVariance(trends),
                data_points: trends.length,
                reliability_assessment: this.assessTrendReliability(trends)
            };

        } catch (error) {
            this.logger.error('Error analyzing historical trends:', error);
            return null;
        }
    }

    /**
     * Analyze recovery patterns after downtime events
     * @param {string} validatorId - Validator vote account
     * @returns {Promise<Object>} Recovery pattern analysis
     */
    async analyzeRecoveryPatterns(validatorId) {
        try {
            const query = `
                WITH downtime_events AS (
                    SELECT 
                        vp.epoch_number,
                        vp.uptime,
                        vp.skip_rate,
                        LAG(vp.uptime) OVER (ORDER BY vp.epoch_number) as prev_uptime,
                        LEAD(vp.uptime) OVER (ORDER BY vp.epoch_number) as next_uptime,
                        LEAD(vp.uptime, 2) OVER (ORDER BY vp.epoch_number) as uptime_plus_2,
                        CASE 
                            WHEN vp.uptime < 90 AND LAG(vp.uptime) OVER (ORDER BY vp.epoch_number) >= 90 
                            THEN 'downtime_start'
                            WHEN vp.uptime >= 90 AND LAG(vp.uptime) OVER (ORDER BY vp.epoch_number) < 90 
                            THEN 'recovery_start'
                            WHEN vp.uptime < 90 THEN 'downtime_continues'
                            ELSE 'normal'
                        END as event_type
                    FROM validator_performance vp
                    WHERE vp.validator_id = $1
                    AND vp.epoch_number > (
                        SELECT MAX(epoch_number) - 200 FROM validator_performance
                    )
                    ORDER BY vp.epoch_number
                ),
                recovery_analysis AS (
                    SELECT 
                        event_type,
                        COUNT(*) as event_count,
                        AVG(uptime) as avg_uptime_during_event,
                        AVG(CASE WHEN next_uptime IS NOT NULL THEN next_uptime END) as avg_recovery_uptime,
                        AVG(skip_rate) as avg_skip_rate
                    FROM downtime_events
                    WHERE event_type IN ('downtime_start', 'recovery_start', 'downtime_continues')
                    GROUP BY event_type
                )
                SELECT * FROM recovery_analysis
            `;

            const result = await this.db.query(query, [validatorId]);
            const events = result.rows;

            const downtimeEvents = events.find(e => e.event_type === 'downtime_start');
            const recoveryEvents = events.find(e => e.event_type === 'recovery_start');
            const continuousDowntime = events.find(e => e.event_type === 'downtime_continues');

            const downtimeCount = downtimeEvents ? parseInt(downtimeEvents.event_count) : 0;
            const recoveryCount = recoveryEvents ? parseInt(recoveryEvents.event_count) : 0;
            const continuousCount = continuousDowntime ? parseInt(continuousDowntime.event_count) : 0;

            return {
                downtime_frequency: downtimeCount,
                recovery_frequency: recoveryCount,
                continuous_downtime_periods: continuousCount,
                recovery_ratio: recoveryCount > 0 && downtimeCount > 0 
                    ? Math.round((recoveryCount / downtimeCount) * 100) / 100
                    : 1.0,
                recovery_quality: recoveryEvents 
                    ? Math.round(recoveryEvents.avg_recovery_uptime * 100) / 100
                    : 0,
                avg_downtime_severity: downtimeEvents
                    ? Math.round((100 - downtimeEvents.avg_uptime_during_event) * 100) / 100
                    : 0,
                resilience_score: this.calculateResilienceScore({
                    downtimeCount,
                    recoveryCount,
                    continuousCount,
                    recoveryQuality: recoveryEvents?.avg_recovery_uptime || 0
                })
            };

        } catch (error) {
            this.logger.error('Error analyzing recovery patterns:', error);
            return null;
        }
    }

    /**
     * Calculate trend direction from time series data
     * @param {Array<number>} values - Time series values
     * @returns {string} Trend direction (improving, declining, stable)
     */
    calculateTrendDirection(values) {
        if (values.length < 3) return 'stable';

        // Simple linear regression slope calculation
        const n = values.length;
        const sumX = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ..., n-1
        const sumY = values.reduce((sum, val) => sum + (val || 0), 0);
        const sumXY = values.reduce((sum, val, idx) => sum + (val || 0) * idx, 0);
        const sumX2 = values.reduce((sum, val, idx) => sum + idx * idx, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        if (slope > 0.5) return 'improving';
        if (slope < -0.5) return 'declining';
        return 'stable';
    }

    /**
     * Get overall trend direction from multiple metrics
     * @param {string} uptimeTrend - Uptime trend
     * @param {string} voteTrend - Vote trend  
     * @param {string} skipTrend - Skip rate trend
     * @returns {string} Overall trend direction
     */
    getOverallTrendDirection(uptimeTrend, voteTrend, skipTrend) {
        const improvingCount = [uptimeTrend, voteTrend].filter(t => t === 'improving').length;
        const decliningCount = [uptimeTrend, voteTrend].filter(t => t === 'declining').length;
        const skipImproving = skipTrend === 'declining'; // Lower skip rate is better

        if (improvingCount >= 1 && skipImproving) return 'improving';
        if (decliningCount >= 1 && !skipImproving) return 'declining';
        return 'stable';
    }

    /**
     * Analyze variance in performance metrics
     * @param {Array} trends - Trend data points
     * @returns {Object} Variance analysis
     */
    analyzeVariance(trends) {
        const uptimeValues = trends.map(t => t.avg_uptime || 0);
        const voteValues = trends.map(t => t.avg_vote_credits || 0);
        
        return {
            uptime_stability: this.calculateStabilityScore(uptimeValues),
            vote_stability: this.calculateStabilityScore(voteValues),
            overall_consistency: this.calculateOverallConsistency(trends)
        };
    }

    /**
     * Calculate stability score based on variance
     * @param {Array<number>} values - Performance values
     * @returns {number} Stability score (0-100)
     */
    calculateStabilityScore(values) {
        if (values.length < 2) return 50;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 1;
        
        // Lower coefficient of variation = higher stability
        return Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)));
    }

    /**
     * Calculate overall consistency score
     * @param {Array} trends - Trend data
     * @returns {number} Consistency score (0-100)
     */
    calculateOverallConsistency(trends) {
        if (trends.length < 3) return 50;
        
        const uptimeConsistency = this.calculateStabilityScore(trends.map(t => t.avg_uptime || 0));
        const voteConsistency = this.calculateStabilityScore(trends.map(t => t.avg_vote_credits || 0));
        const skipConsistency = this.calculateStabilityScore(trends.map(t => 100 - (t.avg_skip_rate || 0)));
        
        return Math.round((uptimeConsistency * 0.4 + voteConsistency * 0.35 + skipConsistency * 0.25) * 100) / 100;
    }

    /**
     * Assess trend reliability based on data consistency
     * @param {Array} trends - Trend data points
     * @returns {string} Reliability assessment
     */
    assessTrendReliability(trends) {
        if (trends.length >= 8) return 'high';
        if (trends.length >= 5) return 'medium';
        if (trends.length >= 3) return 'low';
        return 'insufficient';
    }

    /**
     * Calculate resilience score based on recovery patterns
     * @param {Object} recoveryData - Recovery pattern data
     * @returns {number} Resilience score (0-100)
     */
    calculateResilienceScore(recoveryData) {
        const {
            downtimeCount = 0,
            recoveryCount = 0,
            continuousCount = 0,
            recoveryQuality = 0
        } = recoveryData;

        if (downtimeCount === 0) return 95; // Excellent - no downtime
        
        // Base resilience factors
        const recoveryRatio = recoveryCount / Math.max(1, downtimeCount);
        const continuousDowntimePenalty = Math.min(30, continuousCount * 5); // Penalty for extended downtime
        const recoveryQualityScore = Math.min(100, recoveryQuality);
        
        // Calculate composite resilience score
        let resilienceScore = 60; // Base score
        resilienceScore += (recoveryRatio * 30); // Bonus for good recovery ratio
        resilienceScore += (recoveryQualityScore * 0.1); // Bonus for recovery quality
        resilienceScore -= continuousDowntimePenalty; // Penalty for continuous downtime
        
        return Math.max(10, Math.min(100, Math.round(resilienceScore)));
    }

    /**
     * Get reliability rankings data
     * @param {Object} filters - Filtering criteria
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Reliability rankings
     */
    async getReliabilityRankings(filters = {}, limit = 50) {
        try {
            const {
                minScore = 0,
                minConfidence = 20,
                excludeInsufficientData = false
            } = filters;

            let whereClause = 'WHERE 1=1';
            const queryParams = [];
            let paramIndex = 1;

            if (minScore > 0) {
                whereClause += ` AND reliability_score >= $${paramIndex++}`;
                queryParams.push(minScore);
            }

            if (minConfidence > 0) {
                whereClause += ` AND confidence_level >= $${paramIndex++}`;
                queryParams.push(minConfidence);
            }

            if (excludeInsufficientData) {
                whereClause += ` AND reliability_grade != 'Insufficient Data'`;
            }

            const query = `
                SELECT 
                    validator_id,
                    reliability_score,
                    score_breakdown,
                    confidence_level,
                    reliability_grade,
                    performance_metrics,
                    last_updated,
                    RANK() OVER (ORDER BY reliability_score DESC) as rank
                FROM validator_reliability_scores
                ${whereClause}
                ORDER BY reliability_score DESC
                LIMIT $${paramIndex}
            `;

            queryParams.push(limit);
            const result = await this.db.query(query, queryParams);
            
            return result.rows.map(row => ({
                ...row,
                score_breakdown: JSON.parse(row.score_breakdown || '{}'),
                performance_metrics: JSON.parse(row.performance_metrics || '{}')
            }));

        } catch (error) {
            this.logger.error('Error getting reliability rankings:', error);
            throw error;
        }
    }

    /**
     * Get system reliability statistics
     * @returns {Promise<Object>} System reliability statistics
     */
    async getSystemStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_scored_validators,
                    AVG(reliability_score) as avg_reliability_score,
                    STDDEV(reliability_score) as score_stddev,
                    AVG(confidence_level) as avg_confidence,
                    COUNT(CASE WHEN reliability_score >= 80 THEN 1 END) as high_reliability_validators,
                    COUNT(CASE WHEN confidence_level >= 70 THEN 1 END) as high_confidence_scores,
                    AVG(CAST(performance_metrics->>'uptime_percentage' AS NUMERIC)) as avg_uptime,
                    AVG(CAST(performance_metrics->>'skip_rate' AS NUMERIC)) as avg_skip_rate,
                    MAX(last_updated) as latest_update
                FROM validator_reliability_scores
                WHERE last_updated > NOW() - INTERVAL '7 days'
            `;

            const result = await this.db.query(query);
            const stats = result.rows[0] || {};

            return {
                total_validators: parseInt(stats.total_scored_validators) || 0,
                score_distribution: {
                    average: Math.round((stats.avg_reliability_score || 0) * 100) / 100,
                    standard_deviation: Math.round((stats.score_stddev || 0) * 100) / 100,
                    high_reliability_count: parseInt(stats.high_reliability_validators) || 0
                },
                performance_metrics: {
                    average_uptime: Math.round((stats.avg_uptime || 0) * 100) / 100,
                    average_skip_rate: Math.round((stats.avg_skip_rate || 0) * 100) / 100
                },
                confidence_metrics: {
                    average_confidence: Math.round((stats.avg_confidence || 0) * 100) / 100,
                    high_confidence_count: parseInt(stats.high_confidence_scores) || 0
                },
                system_health: {
                    latest_update: stats.latest_update
                }
            };

        } catch (error) {
            this.logger.error('Error getting reliability system stats:', error);
            throw error;
        }
    }
}

module.exports = ReliabilityDataGatherer;