const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

/**
 * MEV Opportunities API Routes
 * Comprehensive endpoints for MEV opportunity data and analysis
 */
function createMevOpportunitiesRoutes(database, config, services) {
    const router = express.Router();
    const { authenticationService } = services;
    const { optionalAuth } = require('../middleware/auth');

    // Rate limiting for MEV endpoints
    const mevRateLimit = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 100, // requests per window
        message: {
            error: 'Too many requests to MEV endpoints',
            code: 'MEV_RATE_LIMIT_EXCEEDED'
        }
    });

    router.use(mevRateLimit);

    // Validation middleware
    const validateOpportunityQuery = [
        query('type').optional().isIn(['arbitrage', 'liquidation', 'sandwich']),
        query('dex').optional().isLength({ min: 1, max: 50 }),
        query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
        query('offset').optional().isInt({ min: 0 }).toInt(),
        query('minProfit').optional().isFloat({ min: 0 }),
        query('maxProfit').optional().isFloat({ min: 0 }),
        query('timeframe').optional().isIn(['1h', '6h', '24h', '7d', '30d'])
    ];

    /**
     * GET /api/mev/opportunities/live
     * Get live MEV opportunities with real-time data
     */
    router.get('/live',
        optionalAuth(authenticationService),
        validateOpportunityQuery,
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
                    type,
                    dex,
                    limit = 50,
                    offset = 0,
                    minProfit,
                    maxProfit,
                    timeframe = '1h'
                } = req.query;

                let query = `
                    SELECT 
                        id,
                        opportunity_type,
                        detection_timestamp,
                        primary_dex,
                        secondary_dex,
                        token_symbol_a,
                        token_symbol_b,
                        estimated_profit_sol,
                        estimated_profit_usd,
                        profit_percentage,
                        execution_risk_score,
                        competition_probability,
                        status,
                        volume_usd
                    FROM mev_opportunities 
                    WHERE detection_timestamp > NOW() - INTERVAL '${timeframe === '1h' ? '1 hour' : 
                                                                  timeframe === '6h' ? '6 hours' :
                                                                  timeframe === '24h' ? '24 hours' :
                                                                  timeframe === '7d' ? '7 days' : '30 days'}'
                `;

                const values = [];
                let paramIndex = 1;

                if (type) {
                    query += ` AND opportunity_type = $${paramIndex}`;
                    values.push(type);
                    paramIndex++;
                }

                if (dex) {
                    query += ` AND (primary_dex = $${paramIndex} OR secondary_dex = $${paramIndex})`;
                    values.push(dex);
                    paramIndex++;
                }

                if (minProfit) {
                    query += ` AND estimated_profit_sol >= $${paramIndex}`;
                    values.push(parseFloat(minProfit));
                    paramIndex++;
                }

                if (maxProfit) {
                    query += ` AND estimated_profit_sol <= $${paramIndex}`;
                    values.push(parseFloat(maxProfit));
                    paramIndex++;
                }

                query += ` ORDER BY detection_timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
                values.push(limit, offset);

                const client = await database.connect();
                const result = await client.query(query, values);

                // Get total count for pagination
                const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY[\s\S]*$/, '');
                const countResult = await client.query(countQuery, values.slice(0, -2));
                
                client.release();

                res.json({
                    success: true,
                    data: {
                        opportunities: result.rows,
                        pagination: {
                            total: parseInt(countResult.rows[0].count),
                            limit,
                            offset,
                            hasNext: (offset + limit) < parseInt(countResult.rows[0].count)
                        }
                    },
                    metadata: {
                        timeframe,
                        filters: { type, dex, minProfit, maxProfit },
                        timestamp: new Date().toISOString()
                    }
                });

            } catch (error) {
                console.error('Error fetching live opportunities:', error);
                res.status(500).json({
                    error: 'Failed to fetch live MEV opportunities',
                    code: 'MEV_FETCH_ERROR'
                });
            }
        }
    );

    /**
     * GET /api/mev/opportunities/:id
     * Get detailed information about a specific MEV opportunity
     */
    router.get('/:id',
        optionalAuth(authenticationService),
        param('id').isUUID(),
        async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        error: 'Invalid opportunity ID',
                        code: 'INVALID_ID'
                    });
                }

                const { id } = req.params;
                const client = await database.connect();
                
                const result = await client.query(`
                    SELECT * FROM mev_opportunities WHERE id = $1
                `, [id]);

                if (result.rows.length === 0) {
                    client.release();
                    return res.status(404).json({
                        error: 'MEV opportunity not found',
                        code: 'OPPORTUNITY_NOT_FOUND'
                    });
                }

                client.release();

                res.json({
                    success: true,
                    data: result.rows[0]
                });

            } catch (error) {
                console.error('Error fetching opportunity details:', error);
                res.status(500).json({
                    error: 'Failed to fetch opportunity details',
                    code: 'OPPORTUNITY_DETAIL_ERROR'
                });
            }
        }
    );

    /**
     * GET /api/mev/opportunities/stats
     * Get statistical summary of MEV opportunities
     */
    router.get('/stats',
        optionalAuth(authenticationService),
        query('timeframe').optional().isIn(['1h', '6h', '24h', '7d', '30d']),
        async (req, res) => {
            try {
                const { timeframe = '24h' } = req.query;
                const timeInterval = timeframe === '1h' ? '1 hour' :
                                   timeframe === '6h' ? '6 hours' :
                                   timeframe === '24h' ? '24 hours' :
                                   timeframe === '7d' ? '7 days' : '30 days';

                const client = await database.connect();

                // Overall statistics
                const statsQuery = `
                    SELECT 
                        COUNT(*) as total_opportunities,
                        COUNT(CASE WHEN status = 'executed' THEN 1 END) as executed_count,
                        COUNT(CASE WHEN opportunity_type = 'arbitrage' THEN 1 END) as arbitrage_count,
                        COUNT(CASE WHEN opportunity_type = 'liquidation' THEN 1 END) as liquidation_count,
                        COUNT(CASE WHEN opportunity_type = 'sandwich' THEN 1 END) as sandwich_count,
                        AVG(estimated_profit_sol) as avg_profit_sol,
                        SUM(estimated_profit_sol) as total_profit_sol,
                        MAX(estimated_profit_sol) as max_profit_sol,
                        AVG(execution_risk_score) as avg_risk_score
                    FROM mev_opportunities 
                    WHERE detection_timestamp > NOW() - INTERVAL '${timeInterval}'
                `;

                // DEX breakdown
                const dexQuery = `
                    SELECT 
                        primary_dex,
                        COUNT(*) as opportunity_count,
                        AVG(estimated_profit_sol) as avg_profit,
                        SUM(estimated_profit_sol) as total_profit
                    FROM mev_opportunities 
                    WHERE detection_timestamp > NOW() - INTERVAL '${timeInterval}'
                    GROUP BY primary_dex
                    ORDER BY opportunity_count DESC
                `;

                const [statsResult, dexResult] = await Promise.all([
                    client.query(statsQuery),
                    client.query(dexQuery)
                ]);

                client.release();

                res.json({
                    success: true,
                    data: {
                        summary: statsResult.rows[0],
                        dex_breakdown: dexResult.rows,
                        timeframe,
                        timestamp: new Date().toISOString()
                    }
                });

            } catch (error) {
                console.error('Error fetching MEV stats:', error);
                res.status(500).json({
                    error: 'Failed to fetch MEV statistics',
                    code: 'MEV_STATS_ERROR'
                });
            }
        }
    );

    return router;
}

module.exports = createMevOpportunitiesRoutes;