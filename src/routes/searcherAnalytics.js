const express = require('express');
const { query, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

/**
 * Searcher Analytics API Routes
 */
function createSearcherAnalyticsRoutes(database, config, services) {
    const router = express.Router();
    const { authenticationService } = services;
    const { optionalAuth } = require('../middleware/auth');

    // Rate limiting
    const searcherRateLimit = rateLimit({
        windowMs: 60 * 1000,
        max: 100,
        message: { error: 'Too many searcher requests', code: 'SEARCHER_RATE_LIMIT_EXCEEDED' }
    });
    router.use(searcherRateLimit);

    /**
     * GET /api/searchers/analytics
     */
    router.get('/analytics',
        optionalAuth(authenticationService),
        [
            query('period').optional().isIn(['daily', 'weekly', 'monthly']),
            query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
        ],
        async (req, res) => {
            try {
                const { period = 'daily', limit = 50 } = req.query;
                const client = await database.connect();

                const result = await client.query(`
                    SELECT 
                        searcher_pubkey,
                        searcher_name,
                        period_type,
                        opportunities_detected,
                        opportunities_successful,
                        success_rate,
                        total_profit_sol,
                        total_profit_usd,
                        average_profit_per_trade_sol,
                        arbitrage_count,
                        liquidation_count,
                        sandwich_count,
                        net_profit_sol
                    FROM searcher_analytics 
                    WHERE period_type = $1
                    AND period_start > NOW() - INTERVAL '30 days'
                    ORDER BY total_profit_sol DESC
                    LIMIT $2
                `, [period, limit]);

                client.release();

                res.json({
                    success: true,
                    data: {
                        searcher_analytics: result.rows,
                        metadata: { period, total_records: result.rows.length }
                    }
                });

            } catch (error) {
                console.error('Error fetching searcher analytics:', error);
                res.status(500).json({
                    error: 'Failed to fetch searcher analytics',
                    code: 'SEARCHER_ANALYTICS_ERROR'
                });
            }
        }
    );

    /**
     * GET /api/searchers/:pubkey
     */
    router.get('/:pubkey',
        optionalAuth(authenticationService),
        param('pubkey').isLength({ min: 32, max: 44 }),
        async (req, res) => {
            try {
                const { pubkey } = req.params;
                const client = await database.connect();

                const result = await client.query(`
                    SELECT * FROM searcher_analytics 
                    WHERE searcher_pubkey = $1
                    ORDER BY period_start DESC
                    LIMIT 30
                `, [pubkey]);

                if (result.rows.length === 0) {
                    client.release();
                    return res.status(404).json({
                        error: 'Searcher not found',
                        code: 'SEARCHER_NOT_FOUND'
                    });
                }

                client.release();

                res.json({
                    success: true,
                    data: {
                        searcher_pubkey: pubkey,
                        analytics_history: result.rows
                    }
                });

            } catch (error) {
                console.error('Error fetching searcher details:', error);
                res.status(500).json({
                    error: 'Failed to fetch searcher details',
                    code: 'SEARCHER_DETAIL_ERROR'
                });
            }
        }
    );

    /**
     * GET /api/searchers/leaderboard
     */
    router.get('/leaderboard',
        optionalAuth(authenticationService),
        [query('timeframe').optional().isIn(['24h', '7d', '30d'])],
        async (req, res) => {
            try {
                const { timeframe = '24h' } = req.query;
                const interval = timeframe === '24h' ? '1 day' : 
                               timeframe === '7d' ? '7 days' : '30 days';

                const client = await database.connect();

                const result = await client.query(`
                    SELECT 
                        searcher_pubkey,
                        searcher_name,
                        SUM(total_profit_sol) as total_profit,
                        SUM(opportunities_successful) as total_successful,
                        AVG(success_rate) as avg_success_rate,
                        SUM(arbitrage_count + liquidation_count + sandwich_count) as total_trades
                    FROM searcher_analytics 
                    WHERE period_start > NOW() - INTERVAL '${interval}'
                    GROUP BY searcher_pubkey, searcher_name
                    ORDER BY total_profit DESC
                    LIMIT 20
                `);

                client.release();

                res.json({
                    success: true,
                    data: {
                        leaderboard: result.rows,
                        timeframe,
                        timestamp: new Date().toISOString()
                    }
                });

            } catch (error) {
                console.error('Error fetching searcher leaderboard:', error);
                res.status(500).json({
                    error: 'Failed to fetch searcher leaderboard',
                    code: 'LEADERBOARD_ERROR'
                });
            }
        }
    );

    return router;
}

module.exports = createSearcherAnalyticsRoutes;