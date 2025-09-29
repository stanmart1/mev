/**
 * Commission Data Gatherer
 * 
 * Responsible for gathering comprehensive commission and performance data
 * for commission optimization scoring analysis
 */
class CommissionDataGatherer {
    constructor(database, logger) {
        this.db = database;
        this.logger = logger;
    }

    /**
     * Gather comprehensive commission data for a validator
     * @param {string} validatorId - Validator vote account
     * @param {string} timeframe - Time window for analysis
     * @returns {Promise<Object>} Comprehensive commission data
     */
    async gatherCommissionData(validatorId, timeframe = 'recent') {
        try {
            const query = `
                WITH validator_base AS (
                    SELECT 
                        v.vote_account,
                        v.commission_rate,
                        v.epochs_active,
                        v.stake_amount,
                        v.uptime_percentage
                    FROM validators v
                    WHERE v.vote_account = $1
                ),
                commission_history AS (
                    SELECT 
                        ch.validator_id,
                        AVG(ch.commission_rate) as avg_commission_rate,
                        STDDEV(ch.commission_rate) as commission_variance,
                        COUNT(DISTINCT ch.commission_rate) as commission_changes,
                        MIN(ch.commission_rate) as min_commission,
                        MAX(ch.commission_rate) as max_commission,
                        COUNT(*) as history_epochs
                    FROM commission_history ch
                    WHERE ch.validator_id = $1
                    AND ch.epoch_number > (
                        SELECT MAX(epoch_number) - 100 FROM commission_history
                    )
                    GROUP BY ch.validator_id
                ),
                performance_data AS (
                    SELECT 
                        vp.validator_id,
                        AVG(vp.epoch_rewards) as avg_epoch_rewards,
                        AVG(vp.uptime) as avg_uptime,
                        AVG(vp.vote_credits) as avg_vote_credits,
                        STDDEV(vp.epoch_rewards) as reward_variance,
                        COUNT(*) as performance_epochs
                    FROM validator_performance vp
                    WHERE vp.validator_id = $1
                    AND vp.epoch_number > (
                        SELECT MAX(epoch_number) - 50 FROM validator_performance
                    )
                    GROUP BY vp.validator_id
                ),
                mev_data AS (
                    SELECT 
                        vh.validator_id,
                        vh.total_mev_rewards,
                        vh.avg_daily_mev,
                        vh.mev_consistency
                    FROM validator_historical_mev vh
                    WHERE vh.validator_id = $1
                )
                SELECT 
                    vb.*,
                    ch.avg_commission_rate,
                    ch.commission_variance,
                    ch.commission_changes,
                    ch.min_commission,
                    ch.max_commission,
                    ch.history_epochs,
                    pd.avg_epoch_rewards,
                    pd.avg_uptime,
                    pd.avg_vote_credits,
                    pd.reward_variance,
                    pd.performance_epochs,
                    md.total_mev_rewards,
                    md.avg_daily_mev,
                    md.mev_consistency
                FROM validator_base vb
                LEFT JOIN commission_history ch ON vb.vote_account = ch.validator_id
                LEFT JOIN performance_data pd ON vb.vote_account = pd.validator_id
                LEFT JOIN mev_data md ON vb.vote_account = md.validator_id
            `;

            const result = await this.db.query(query, [validatorId]);
            const data = result.rows[0];

            if (data) {
                // Calculate derived metrics
                data.performance_ratio = this.calculatePerformanceRatio(data);
                data.estimated_yield_after_fees = this.estimateYieldAfterFees(data);
                data.commission_stability = this.calculateCommissionStability(data);
            }

            return data || null;

        } catch (error) {
            this.logger.error(`Error gathering commission data for ${validatorId}:`, error);
            throw error;
        }
    }

    /**
     * Calculate performance ratio (performance delivered vs fees charged)
     * @param {Object} data - Commission data
     * @returns {number} Performance ratio
     */
    calculatePerformanceRatio(data) {
        const {
            avg_uptime = 0,
            commission_rate = 100,
            mev_consistency = 0,
            avg_vote_credits = 0
        } = data;

        if (commission_rate === 0) return 10; // Avoid division by zero, give high ratio

        // Normalize performance metrics (0-1 scale)
        const normalizedUptime = Math.min(1, avg_uptime / 100);
        const normalizedMev = Math.min(1, mev_consistency);
        const normalizedVotes = Math.min(1, avg_vote_credits / 1000);

        // Composite performance score
        const performanceScore = (
            normalizedUptime * 0.5 +
            normalizedMev * 0.3 +
            normalizedVotes * 0.2
        ) * 100;

        // Performance ratio = performance delivered / fees charged
        const ratio = performanceScore / commission_rate;
        
        return Math.round(ratio * 100) / 100;
    }

    /**
     * Estimate annual yield after fees
     * @param {Object} data - Commission data
     * @returns {number} Estimated annual yield percentage
     */
    estimateYieldAfterFees(data) {
        const {
            avg_epoch_rewards = 0,
            commission_rate = 100,
            stake_amount = 1,
            total_mev_rewards = 0,
            epochs_active = 1
        } = data;

        // Estimate annual base yield (assuming ~73 epochs per year)
        const epochsPerYear = 73;
        const baseYieldPerYear = (avg_epoch_rewards * epochsPerYear / stake_amount) * 100;
        
        // Add MEV contribution
        const avgMevPerEpoch = total_mev_rewards / epochs_active;
        const mevYieldPerYear = (avgMevPerEpoch * epochsPerYear / stake_amount) * 100;
        
        // Total gross yield
        const grossYield = baseYieldPerYear + mevYieldPerYear;
        
        // Net yield after commission
        const netYield = grossYield * (1 - commission_rate / 100);
        
        return Math.round(netYield * 100) / 100;
    }

    /**
     * Calculate commission stability metric
     * @param {Object} data - Commission data
     * @returns {number} Stability metric (0-1)
     */
    calculateCommissionStability(data) {
        const {
            commission_changes = 10,
            commission_variance = 100,
            history_epochs = 1
        } = data;

        if (history_epochs < 5) return 0.5; // Default moderate stability for insufficient data

        // Stability factors
        const changeStability = Math.max(0, 1 - (commission_changes / history_epochs));
        const varianceStability = Math.max(0, 1 - Math.min(1, commission_variance / 25));

        return Math.round((changeStability * 0.6 + varianceStability * 0.4) * 100) / 100;
    }

    /**
     * Get market comparison data
     * @param {Object} data - Validator commission data
     * @returns {Promise<Object>} Market comparison analysis
     */
    async getMarketComparison(data) {
        try {
            const query = `
                SELECT 
                    AVG(commission_rate) as market_avg_commission,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY commission_rate) as market_median_commission,
                    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY commission_rate) as market_25th_percentile,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY commission_rate) as market_75th_percentile,
                    COUNT(*) as total_validators
                FROM validators
                WHERE commission_rate IS NOT NULL
                AND epochs_active >= 10
            `;

            const result = await this.db.query(query);
            const marketData = result.rows[0];

            const validatorCommission = data.commission_rate;
            
            // Calculate percentile rank
            let percentileRank = 50; // Default to median
            if (validatorCommission <= marketData.market_25th_percentile) {
                percentileRank = 25;
            } else if (validatorCommission <= marketData.market_median_commission) {
                percentileRank = 37.5;
            } else if (validatorCommission <= marketData.market_75th_percentile) {
                percentileRank = 62.5;
            } else {
                percentileRank = 87.5;
            }

            return {
                market_position: percentileRank,
                market_average: Math.round(marketData.market_avg_commission * 100) / 100,
                market_median: Math.round(marketData.market_median_commission * 100) / 100,
                difference_from_average: Math.round((validatorCommission - marketData.market_avg_commission) * 100) / 100,
                competitiveness_rating: this.getCompetitivenessRating(percentileRank),
                total_validators_compared: parseInt(marketData.total_validators)
            };

        } catch (error) {
            this.logger.error('Error getting market comparison:', error);
            return null;
        }
    }

    /**
     * Get competitiveness rating based on percentile
     * @param {number} percentile - Market percentile position
     * @returns {string} Competitiveness rating
     */
    getCompetitivenessRating(percentile) {
        if (percentile <= 10) return 'Highly Competitive';
        if (percentile <= 25) return 'Very Competitive';
        if (percentile <= 50) return 'Competitive';
        if (percentile <= 75) return 'Average';
        return 'Above Average Cost';
    }

    /**
     * Analyze commission trends
     * @param {string} validatorId - Validator vote account
     * @returns {Promise<Object>} Trend analysis
     */
    async analyzeTrends(validatorId) {
        try {
            const query = `
                SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    AVG(commission_rate) as avg_commission,
                    COUNT(*) as data_points
                FROM commission_history
                WHERE validator_id = $1
                AND created_at > NOW() - INTERVAL '6 months'
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY month
            `;

            const result = await this.db.query(query, [validatorId]);
            const trends = result.rows;

            if (trends.length < 2) {
                return {
                    trend_direction: 'insufficient_data',
                    trend_strength: 0,
                    recent_changes: 0
                };
            }

            // Calculate simple trend direction
            const firstMonth = trends[0].avg_commission;
            const lastMonth = trends[trends.length - 1].avg_commission;
            const trendDirection = lastMonth > firstMonth ? 'increasing' : 
                                 lastMonth < firstMonth ? 'decreasing' : 'stable';

            return {
                trend_direction: trendDirection,
                trend_strength: Math.abs(lastMonth - firstMonth),
                recent_changes: trends.length,
                data_quality: trends.length >= 3 ? 'good' : 'limited'
            };

        } catch (error) {
            this.logger.error('Error analyzing commission trends:', error);
            return null;
        }
    }
}

module.exports = CommissionDataGatherer;