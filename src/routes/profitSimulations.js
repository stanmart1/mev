const express = require('express');
const { body, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

/**
 * Profit Simulations API Routes
 */
function createProfitSimulationsRoutes(database, config, services) {
    const router = express.Router();
    const { authenticationService } = services;
    const { optionalAuth } = require('../middleware/auth');

    // Rate limiting
    const simulationRateLimit = rateLimit({
        windowMs: 60 * 1000,
        max: 20,
        message: { error: 'Too many simulation requests', code: 'SIMULATION_RATE_LIMIT_EXCEEDED' }
    });
    router.use(simulationRateLimit);

    /**
     * POST /api/simulations/profit-calculator
     */
    router.post('/profit-calculator',
        optionalAuth(authenticationService),
        [
            body('strategy').isIn(['arbitrage', 'liquidation', 'sandwich']),
            body('amount').isFloat({ min: 0.001, max: 10000 }),
            body('riskTolerance').optional().isIn(['low', 'medium', 'high'])
        ],
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

                const { strategy, amount, riskTolerance = 'medium' } = req.body;
                const client = await database.connect();

                // Get profit calculations
                const result = await client.query(`
                    SELECT 
                        calculation_id,
                        expected_profit,
                        risk_adjusted_profit,
                        confidence_lower,
                        confidence_upper,
                        profitability_probability,
                        success_probability
                    FROM profit_calculations 
                    WHERE strategy = $1
                    ORDER BY created_at DESC
                    LIMIT 10
                `, [strategy]);

                client.release();

                res.json({
                    success: true,
                    data: {
                        simulation_results: result.rows,
                        parameters: { strategy, amount, riskTolerance }
                    }
                });

            } catch (error) {
                console.error('Error running profit simulation:', error);
                res.status(500).json({
                    error: 'Failed to run profit simulation',
                    code: 'SIMULATION_ERROR'
                });
            }
        }
    );

    /**
     * GET /api/profit/statistics
     */
    router.get('/statistics',
        optionalAuth(authenticationService),
        [query('timeframe').optional().isIn(['1h', '24h', '7d', '30d'])],
        async (req, res) => {
            try {
                const { timeframe = '24h' } = req.query;
                const intervals = { '1h': '1 hour', '24h': '24 hours', '7d': '7 days', '30d': '30 days' };
                const interval = intervals[timeframe];
                
                const client = await database.connect();
                const result = await client.query(`
                    SELECT 
                        COUNT(*) as total_calculations,
                        AVG(estimated_profit_sol) as average_expected_profit,
                        COUNT(CASE WHEN status = 'executed' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as profitable_percentage,
                        MAX(estimated_profit_sol) as max_profit
                    FROM mev_opportunities 
                    WHERE detection_timestamp > NOW() - INTERVAL '${interval}'
                `);
                client.release();

                const stats = result.rows[0];
                res.json({
                    success: true,
                    data: {
                        summary: {
                            totalCalculations: parseInt(stats.total_calculations) || 0,
                            averageExpectedProfit: parseFloat(stats.average_expected_profit) || 0,
                            profitablePercentage: parseFloat(stats.profitable_percentage) || 0,
                            maxProfit: parseFloat(stats.max_profit) || 0
                        }
                    }
                });
            } catch (error) {
                console.error('Error fetching profit statistics:', error);
                res.status(500).json({
                    success: true,
                    data: {
                        summary: {
                            totalCalculations: 0,
                            averageExpectedProfit: 0,
                            profitablePercentage: 0,
                            maxProfit: 0
                        }
                    }
                });
            }
        }
    );

    /**
     * GET /api/simulations/risk-analysis
     */
    router.get('/risk-analysis',
        optionalAuth(authenticationService),
        [query('strategy').optional().isIn(['arbitrage', 'liquidation', 'sandwich'])],
        async (req, res) => {
            try {
                const { strategy } = req.query;
                const client = await database.connect();

                let query = `
                    SELECT 
                        strategy,
                        AVG(risk_score) as avg_risk,
                        AVG(success_probability) as avg_success_rate,
                        COUNT(*) as total_calculations
                    FROM profit_calculations 
                    WHERE created_at > NOW() - INTERVAL '24 hours'
                `;

                const values = [];
                if (strategy) {
                    query += ' AND strategy = $1';
                    values.push(strategy);
                }

                query += ' GROUP BY strategy';

                const result = await client.query(query, values);
                client.release();

                res.json({
                    success: true,
                    data: { risk_analysis: result.rows }
                });

            } catch (error) {
                console.error('Error performing risk analysis:', error);
                res.status(500).json({
                    error: 'Failed to perform risk analysis',
                    code: 'RISK_ANALYSIS_ERROR'
                });
            }
        }
    );

    return router;
}

module.exports = createProfitSimulationsRoutes;