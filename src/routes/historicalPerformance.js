const express = require('express');
const { query, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

/**
 * Historical Performance API Routes
 * Comprehensive endpoints for historical MEV and validator performance data
 */
function createHistoricalPerformanceRoutes(database, config, services) {
    const router = express.Router();
    const { authenticationService, authorizationService, apiKeyService } = services;

    // Rate limiting for historical data endpoints
    const historyRateLimit = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 50, // requests per window (lower due to data intensity)
        message: {
            error: 'Too many requests to historical endpoints',
            code: 'HISTORY_RATE_LIMIT_EXCEEDED'
        }
    });

    router.use(historyRateLimit);

    // Validation middleware
    const validateHistoryQuery = [
        query('startDate').optional().isISO8601().toDate(),
        query('endDate').optional().isISO8601().toDate(),
        query('interval').optional().isIn(['hourly', 'daily', 'weekly', 'monthly']),
        query('metrics').optional().isString(),
        query('limit').optional().isInt({ min: 1, max: 1000 }).toInt()
    ];

    /**
     * GET /api/history/mev-performance
     * Get historical MEV performance data across the network
     */
    router.get('/mev-performance',
        apiKeyService.createApiKeyMiddleware(['analytics', 'research']),
        validateHistoryQuery,
        async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        error: 'Validation failed',
                        code: 'VALIDATION_ERROR',
                        details: errors.array()
                    });
                }

                const {
                    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                    endDate = new Date(),
                    interval = 'daily',
                    metrics = 'revenue,blocks,efficiency',
                    limit = 100
                } = req.query;

                const requestedMetrics = metrics.split(',').map(m => m.trim());
                const client = await database.connect();

                let timeGrouping;
                switch (interval) {
                    case 'hourly':
                        timeGrouping = "DATE_TRUNC('hour', analysis_timestamp)";
                        break;
                    case 'weekly':
                        timeGrouping = "DATE_TRUNC('week', analysis_timestamp)";
                        break;
                    case 'monthly':
                        timeGrouping = "DATE_TRUNC('month', analysis_timestamp)";
                        break;
                    default:
                        timeGrouping = "DATE_TRUNC('day', analysis_timestamp)";
                }

                const query = `
                    SELECT 
                        ${timeGrouping} as time_period,
                        COUNT(DISTINCT validator_address) as active_validators,
                        AVG(mev_revenue) as avg_mev_revenue,
                        SUM(mev_revenue) as total_mev_revenue,
                        AVG(mev_blocks) as avg_mev_blocks,
                        SUM(mev_blocks) as total_mev_blocks,
                        AVG(mev_block_percentage) as avg_mev_block_percentage,
                        AVG(revenue_trend) as avg_revenue_trend,
                        COUNT(CASE WHEN network_rank <= 100 THEN 1 END) as top_100_validators
                    FROM historical_mev_performance 
                    WHERE analysis_timestamp >= $1 AND analysis_timestamp <= $2
                    GROUP BY ${timeGrouping}
                    ORDER BY time_period DESC
                    LIMIT $3
                `;

                const result = await client.query(query, [startDate, endDate, limit]);

                // Get overall statistics for the period
                const statsQuery = `
                    SELECT 
                        COUNT(DISTINCT validator_address) as unique_validators,
                        AVG(mev_revenue) as avg_validator_revenue,
                        MAX(mev_revenue) as max_validator_revenue,
                        MIN(mev_revenue) as min_validator_revenue,
                        AVG(network_mev_share) as avg_network_share
                    FROM historical_mev_performance 
                    WHERE analysis_timestamp >= $1 AND analysis_timestamp <= $2
                `;

                const statsResult = await client.query(statsQuery, [startDate, endDate]);
                client.release();

                res.json({
                    success: true,
                    data: {
                        performance_data: result.rows,
                        summary_stats: statsResult.rows[0],
                        metadata: {
                            interval,
                            metrics: requestedMetrics,
                            period: { start: startDate, end: endDate },
                            total_records: result.rows.length
                        }
                    }
                });

            } catch (error) {
                console.error('Error fetching MEV performance history:', error);
                res.status(500).json({
                    error: 'Failed to fetch historical MEV performance',
                    code: 'MEV_HISTORY_ERROR'
                });
            }
        }
    );

    /**
     * GET /api/history/validator/:address
     * Get historical performance data for a specific validator
     */
    router.get('/validator/:address',
        apiKeyService.createApiKeyMiddleware(['validator-analytics', 'research']),
        param('address').isLength({ min: 32, max: 44 }),
        validateHistoryQuery,
        async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        error: 'Validation failed',
                        code: 'VALIDATION_ERROR',
                        details: errors.array()
                    });
                }

                const { address } = req.params;
                const {
                    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
                    endDate = new Date(),
                    interval = 'daily',
                    limit = 200
                } = req.query;

                const client = await database.connect();

                // Get historical performance data
                const performanceQuery = `
                    SELECT 
                        epoch,
                        timestamp,
                        epoch_rewards,
                        stake_amount,
                        commission_rate,
                        uptime_percentage,
                        vote_credits,
                        is_jito_enabled
                    FROM enhanced_validator_performance 
                    WHERE validator_address = $1
                    AND timestamp >= $2 AND timestamp <= $3
                    ORDER BY epoch DESC
                    LIMIT $4
                `;

                // Get MEV-specific historical data
                const mevHistoryQuery = `
                    SELECT 
                        epoch,
                        mev_revenue,
                        mev_blocks,
                        mev_block_percentage,
                        revenue_trend,
                        efficiency_trend,
                        network_rank,
                        validator_type_rank
                    FROM historical_mev_performance 
                    WHERE validator_address = $1
                    AND epoch IN (
                        SELECT DISTINCT epoch FROM enhanced_validator_performance 
                        WHERE validator_address = $1 AND timestamp >= $2 AND timestamp <= $3
                    )
                    ORDER BY epoch DESC
                `;

                // Get efficiency metrics history
                const efficiencyQuery = `
                    SELECT 
                        epoch,
                        overall_efficiency_score,
                        mev_capture_rate,
                        bundle_success_rate,
                        reward_consistency_score,
                        network_rank,
                        percentile_rank
                    FROM mev_efficiency_metrics 
                    WHERE validator_address = $1
                    AND epoch IN (
                        SELECT DISTINCT epoch FROM enhanced_validator_performance 
                        WHERE validator_address = $1 AND timestamp >= $2 AND timestamp <= $3
                    )
                    ORDER BY epoch DESC
                `;

                const [performanceResult, mevHistoryResult, efficiencyResult] = await Promise.all([
                    client.query(performanceQuery, [address, startDate, endDate, limit]),
                    client.query(mevHistoryQuery, [address, startDate, endDate]),
                    client.query(efficiencyQuery, [address, startDate, endDate])
                ]);

                client.release();

                if (performanceResult.rows.length === 0) {
                    return res.status(404).json({
                        error: 'No historical data found for validator',
                        code: 'VALIDATOR_HISTORY_NOT_FOUND'
                    });
                }

                // Calculate trends and statistics
                const performanceData = performanceResult.rows;
                const recentEpochs = performanceData.slice(0, 10);
                const olderEpochs = performanceData.slice(-10);

                const trends = {
                    rewards_trend: this.calculateTrend(performanceData.map(d => d.epoch_rewards)),
                    stake_trend: this.calculateTrend(performanceData.map(d => d.stake_amount)),
                    uptime_trend: this.calculateTrend(performanceData.map(d => d.uptime_percentage))
                };

                res.json({
                    success: true,
                    data: {
                        validator_address: address,
                        performance_history: performanceData,
                        mev_history: mevHistoryResult.rows,
                        efficiency_history: efficiencyResult.rows,
                        trends,
                        summary: {
                            total_epochs: performanceData.length,
                            avg_rewards: performanceData.reduce((sum, d) => sum + parseFloat(d.epoch_rewards), 0) / performanceData.length,
                            avg_uptime: performanceData.reduce((sum, d) => sum + parseFloat(d.uptime_percentage), 0) / performanceData.length,
                            current_stake: performanceData[0]?.stake_amount,
                            jito_enabled: performanceData[0]?.is_jito_enabled
                        }
                    }
                });

            } catch (error) {
                console.error('Error fetching validator history:', error);
                res.status(500).json({
                    error: 'Failed to fetch validator historical data',
                    code: 'VALIDATOR_HISTORY_ERROR'
                });
            }
        }
    );

    /**
     * GET /api/history/network-trends
     * Get network-wide historical trends and statistics
     */
    router.get('/network-trends',
        apiKeyService.createApiKeyMiddleware(['analytics', 'research']),
        validateHistoryQuery,
        async (req, res) => {
            try {
                const {
                    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate = new Date(),
                    interval = 'daily'
                } = req.query;

                const client = await database.connect();

                let timeGrouping;
                switch (interval) {
                    case 'hourly':
                        timeGrouping = "DATE_TRUNC('hour', metric_date)";
                        break;
                    case 'weekly':
                        timeGrouping = "DATE_TRUNC('week', metric_date)";
                        break;
                    case 'monthly':
                        timeGrouping = "DATE_TRUNC('month', metric_date)";
                        break;
                    default:
                        timeGrouping = "DATE_TRUNC('day', metric_date)";
                }

                const query = `
                    SELECT 
                        ${timeGrouping} as time_period,
                        AVG(total_mev_extracted_sol) as avg_daily_mev_sol,
                        AVG(total_mev_extracted_usd) as avg_daily_mev_usd,
                        AVG(total_opportunities_detected) as avg_opportunities_detected,
                        AVG(total_opportunities_executed) as avg_opportunities_executed,
                        AVG(active_validators) as avg_active_validators,
                        AVG(jito_enabled_validators) as avg_jito_validators,
                        AVG(average_mev_efficiency) as avg_network_efficiency,
                        AVG(mev_transaction_percentage) as avg_mev_tx_percentage
                    FROM market_metrics 
                    WHERE metric_date >= $1 AND metric_date <= $2
                    GROUP BY ${timeGrouping}
                    ORDER BY time_period DESC
                `;

                const result = await client.query(query, [startDate, endDate]);
                client.release();

                res.json({
                    success: true,
                    data: {
                        network_trends: result.rows,
                        metadata: {
                            interval,
                            period: { start: startDate, end: endDate },
                            data_points: result.rows.length
                        }
                    }
                });

            } catch (error) {
                console.error('Error fetching network trends:', error);
                res.status(500).json({
                    error: 'Failed to fetch network trends',
                    code: 'NETWORK_TRENDS_ERROR'
                });
            }
        }
    );

    /**
     * Calculate trend (simple linear regression slope)
     */
    this.calculateTrend = (values) => {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const sumX = (n * (n - 1)) / 2; // sum of indices
        const sumY = values.reduce((sum, val) => sum + parseFloat(val || 0), 0);
        const sumXY = values.reduce((sum, val, i) => sum + i * parseFloat(val || 0), 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // sum of squared indices
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope || 0;
    };

    return router;
}

module.exports = createHistoricalPerformanceRoutes;