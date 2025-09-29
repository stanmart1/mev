const express = require('express');
const { query, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

/**
 * Validator Rankings API Routes
 * Comprehensive endpoints for validator performance and ranking data
 */
function createValidatorRankingsRoutes(database, config, services) {
    const router = express.Router();
    const { authenticationService, authorizationService, apiKeyService } = services;

    // Rate limiting for validator endpoints
    const validatorRateLimit = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 200, // requests per window
        message: {
            error: 'Too many requests to validator endpoints',
            code: 'VALIDATOR_RATE_LIMIT_EXCEEDED'
        }
    });

    router.use(validatorRateLimit);

    // Validation middleware
    const validateRankingQuery = [
        query('category').optional().isIn(['overall', 'performance', 'efficiency', 'mev', 'reliability']),
        query('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
        query('offset').optional().isInt({ min: 0 }).toInt(),
        query('minStake').optional().isFloat({ min: 0 }),
        query('maxCommission').optional().isFloat({ min: 0, max: 1 }),
        query('jitoEnabled').optional().isBoolean().toBoolean()
    ];

    /**
     * GET /api/validators/rankings
     * Get comprehensive validator rankings with multiple categories
     */
    router.get('/',
        apiKeyService.createApiKeyMiddleware(['validator-analytics']),
        validateRankingQuery,
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
                    category = 'overall',
                    limit = 100,
                    offset = 0,
                    minStake,
                    maxCommission,
                    jitoEnabled
                } = req.query;

                const client = await database.connect();

                let query = `
                    SELECT 
                        vr.validator_address,
                        vr.rank,
                        vr.percentile,
                        vr.score,
                        vr.score_breakdown,
                        vr.is_jito_enabled,
                        evp.stake_amount,
                        evp.commission_rate,
                        evp.uptime_percentage,
                        evp.vote_credits,
                        mem.overall_efficiency_score,
                        mem.mev_capture_rate,
                        mem.bundle_success_rate
                    FROM validator_rankings vr
                    LEFT JOIN enhanced_validator_performance evp ON vr.validator_address = evp.validator_address
                    LEFT JOIN mev_efficiency_metrics mem ON vr.validator_address = mem.validator_address
                    WHERE vr.category = $1
                    AND DATE(vr.timestamp) = CURRENT_DATE
                `;

                const values = [category];
                let paramIndex = 2;

                if (minStake) {
                    query += ` AND evp.stake_amount >= $${paramIndex}`;
                    values.push(parseFloat(minStake));
                    paramIndex++;
                }

                if (maxCommission) {
                    query += ` AND evp.commission_rate <= $${paramIndex}`;
                    values.push(parseFloat(maxCommission));
                    paramIndex++;
                }

                if (jitoEnabled !== undefined) {
                    query += ` AND vr.is_jito_enabled = $${paramIndex}`;
                    values.push(jitoEnabled);
                    paramIndex++;
                }

                query += ` ORDER BY vr.rank ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
                values.push(limit, offset);

                const result = await client.query(query, values);

                // Get total count
                const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY[\s\S]*$/, '');
                const countResult = await client.query(countQuery, values.slice(0, -2));

                client.release();

                res.json({
                    success: true,
                    data: {
                        rankings: result.rows.map(row => ({
                            ...row,
                            score_breakdown: typeof row.score_breakdown === 'string' 
                                ? JSON.parse(row.score_breakdown) 
                                : row.score_breakdown
                        })),
                        pagination: {
                            total: parseInt(countResult.rows[0].count),
                            limit,
                            offset,
                            hasNext: (offset + limit) < parseInt(countResult.rows[0].count)
                        }
                    },
                    metadata: {
                        category,
                        filters: { minStake, maxCommission, jitoEnabled },
                        timestamp: new Date().toISOString()
                    }
                });

            } catch (error) {
                console.error('Error fetching validator rankings:', error);
                res.status(500).json({
                    error: 'Failed to fetch validator rankings',
                    code: 'VALIDATOR_RANKINGS_ERROR'
                });
            }
        }
    );

    /**
     * GET /api/validators/:address
     * Get detailed information about a specific validator
     */
    router.get('/:address',
        apiKeyService.createApiKeyMiddleware(['validator-analytics']),
        param('address').isLength({ min: 32, max: 44 }),
        async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        error: 'Invalid validator address',
                        code: 'INVALID_ADDRESS'
                    });
                }

                const { address } = req.params;
                const client = await database.connect();

                // Get comprehensive validator data
                const validatorQuery = `
                    SELECT 
                        evp.*,
                        mem.*,
                        vmp.profile_version,
                        vmp.mev_capability_score,
                        vmp.consistency_score,
                        vmp.attribution_accuracy
                    FROM enhanced_validator_performance evp
                    LEFT JOIN mev_efficiency_metrics mem ON evp.validator_address = mem.validator_address
                    LEFT JOIN validator_mev_profiles vmp ON evp.validator_address = vmp.validator_address
                    WHERE evp.validator_address = $1
                    ORDER BY evp.epoch DESC
                    LIMIT 1
                `;

                // Get rankings across all categories
                const rankingsQuery = `
                    SELECT category, rank, percentile, score
                    FROM validator_rankings
                    WHERE validator_address = $1
                    AND DATE(timestamp) = CURRENT_DATE
                `;

                // Get recent performance history
                const historyQuery = `
                    SELECT 
                        epoch,
                        epoch_rewards,
                        stake_amount,
                        commission_rate,
                        uptime_percentage
                    FROM enhanced_validator_performance
                    WHERE validator_address = $1
                    ORDER BY epoch DESC
                    LIMIT 30
                `;

                const [validatorResult, rankingsResult, historyResult] = await Promise.all([
                    client.query(validatorQuery, [address]),
                    client.query(rankingsQuery, [address]),
                    client.query(historyQuery, [address])
                ]);

                client.release();

                if (validatorResult.rows.length === 0) {
                    return res.status(404).json({
                        error: 'Validator not found',
                        code: 'VALIDATOR_NOT_FOUND'
                    });
                }

                res.json({
                    success: true,
                    data: {
                        validator: validatorResult.rows[0],
                        rankings: rankingsResult.rows.reduce((acc, row) => {
                            acc[row.category] = {
                                rank: row.rank,
                                percentile: row.percentile,
                                score: row.score
                            };
                            return acc;
                        }, {}),
                        performance_history: historyResult.rows
                    }
                });

            } catch (error) {
                console.error('Error fetching validator details:', error);
                res.status(500).json({
                    error: 'Failed to fetch validator details',
                    code: 'VALIDATOR_DETAIL_ERROR'
                });
            }
        }
    );

    /**
     * GET /api/validators/compare
     * Compare multiple validators side by side
     */
    router.get('/compare',
        apiKeyService.createApiKeyMiddleware(['validator-analytics']),
        query('addresses').isString().custom((value) => {
            const addresses = value.split(',');
            if (addresses.length < 2 || addresses.length > 10) {
                throw new Error('Must compare between 2-10 validators');
            }
            return true;
        }),
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

                const addresses = req.query.addresses.split(',').map(addr => addr.trim());
                const client = await database.connect();

                const query = `
                    SELECT 
                        evp.validator_address,
                        evp.stake_amount,
                        evp.commission_rate,
                        evp.uptime_percentage,
                        evp.epoch_rewards,
                        mem.overall_efficiency_score,
                        mem.mev_capture_rate,
                        mem.bundle_success_rate,
                        mem.reward_consistency_score,
                        vr_overall.rank as overall_rank,
                        vr_overall.percentile as overall_percentile,
                        vr_mev.rank as mev_rank,
                        vr_mev.percentile as mev_percentile
                    FROM enhanced_validator_performance evp
                    LEFT JOIN mev_efficiency_metrics mem ON evp.validator_address = mem.validator_address
                    LEFT JOIN validator_rankings vr_overall ON evp.validator_address = vr_overall.validator_address 
                        AND vr_overall.category = 'overall' AND DATE(vr_overall.timestamp) = CURRENT_DATE
                    LEFT JOIN validator_rankings vr_mev ON evp.validator_address = vr_mev.validator_address 
                        AND vr_mev.category = 'mev' AND DATE(vr_mev.timestamp) = CURRENT_DATE
                    WHERE evp.validator_address = ANY($1)
                `;

                const result = await client.query(query, [addresses]);
                client.release();

                const comparison = {
                    validators: result.rows,
                    summary: {
                        highest_stake: result.rows.reduce((max, v) => 
                            v.stake_amount > max.stake_amount ? v : max),
                        lowest_commission: result.rows.reduce((min, v) => 
                            v.commission_rate < min.commission_rate ? v : min),
                        best_uptime: result.rows.reduce((max, v) => 
                            v.uptime_percentage > max.uptime_percentage ? v : max),
                        best_mev_performance: result.rows.reduce((max, v) => 
                            (v.mev_capture_rate || 0) > (max.mev_capture_rate || 0) ? v : max)
                    }
                };

                res.json({
                    success: true,
                    data: comparison
                });

            } catch (error) {
                console.error('Error comparing validators:', error);
                res.status(500).json({
                    error: 'Failed to compare validators',
                    code: 'VALIDATOR_COMPARE_ERROR'
                });
            }
        }
    );

    /**
     * GET /api/validators/network/stats
     * Get network-wide validator statistics
     */
    router.get('/network/stats',
        apiKeyService.createApiKeyMiddleware(['validator-analytics']),
        async (req, res) => {
            try {
                const client = await database.connect();

                const statsQuery = `
                    SELECT 
                        COUNT(*) as total_validators,
                        COUNT(CASE WHEN is_jito_enabled = true THEN 1 END) as jito_validators,
                        AVG(stake_amount) as avg_stake,
                        AVG(commission_rate) as avg_commission,
                        AVG(uptime_percentage) as avg_uptime,
                        SUM(stake_amount) as total_stake
                    FROM enhanced_validator_performance
                    WHERE epoch = (SELECT MAX(epoch) FROM enhanced_validator_performance)
                `;

                const mevStatsQuery = `
                    SELECT 
                        AVG(overall_efficiency_score) as avg_efficiency,
                        AVG(mev_capture_rate) as avg_mev_capture,
                        AVG(bundle_success_rate) as avg_bundle_success
                    FROM mev_efficiency_metrics
                    WHERE epoch = (SELECT MAX(epoch) FROM mev_efficiency_metrics)
                `;

                const [statsResult, mevStatsResult] = await Promise.all([
                    client.query(statsQuery),
                    client.query(mevStatsQuery)
                ]);

                client.release();

                res.json({
                    success: true,
                    data: {
                        network_stats: statsResult.rows[0],
                        mev_stats: mevStatsResult.rows[0],
                        timestamp: new Date().toISOString()
                    }
                });

            } catch (error) {
                console.error('Error fetching network stats:', error);
                res.status(500).json({
                    error: 'Failed to fetch network statistics',
                    code: 'NETWORK_STATS_ERROR'
                });
            }
        }
    );

    return router;
}

module.exports = createValidatorRankingsRoutes;