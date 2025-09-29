const express = require('express');
const router = express.Router();
const Joi = require('joi');

/**
 * Delegation Analytics API Routes
 * Provides endpoints for validator recommendations, delegation analytics,
 * and portfolio management
 */

// Validation schemas
const recommendationQuerySchema = Joi.object({
    count: Joi.number().integer().min(1).max(50).default(10),
    strategy: Joi.string().valid('maximize_mev', 'maximize_safety', 'support_decentralization', 'cost_optimize', 'balanced').optional(),
    risk_tolerance: Joi.string().valid('conservative', 'balanced', 'aggressive').optional(),
    exclude_current: Joi.boolean().default(true),
    refresh_cache: Joi.boolean().default(false)
});

const preferencesUpdateSchema = Joi.object({
    preferred_strategy: Joi.string().valid('maximize_mev', 'maximize_safety', 'support_decentralization', 'cost_optimize', 'balanced').optional(),
    risk_tolerance: Joi.string().valid('conservative', 'balanced', 'aggressive').optional(),
    custom_weights: Joi.object({
        mevPotential: Joi.number().min(0).max(1).optional(),
        reliability: Joi.number().min(0).max(1).optional(),
        commissionOptimization: Joi.number().min(0).max(1).optional(),
        stakeDecentralization: Joi.number().min(0).max(1).optional(),
        performanceConsistency: Joi.number().min(0).max(1).optional()
    }).optional(),
    custom_filters: Joi.object({
        maxCommission: Joi.number().min(0).max(0.30).optional(),
        minUptimePercentage: Joi.number().min(0).max(100).optional(),
        maxStakeConcentration: Joi.number().min(0).max(0.10).optional(),
        minEpochsActive: Joi.number().integer().min(1).optional()
    }).optional(),
    delegation_goals: Joi.object().optional(),
    notification_preferences: Joi.object().optional()
});

const delegationRecordSchema = Joi.object({
    validator_address: Joi.string().length(44).required(),
    stake_amount: Joi.number().integer().min(1).required(),
    delegation_tx_signature: Joi.string().length(88).optional()
});

// Middleware for validation
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid query parameters',
                details: error.details.map(d => d.message)
            });
        }
        req.query = value;
        next();
    };
};

const validateBody = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request body',
                details: error.details.map(d => d.message)
            });
        }
        req.body = value;
        next();
    };
};

/**
 * GET /api/delegation-analytics/recommendations
 * Get personalized validator recommendations for the authenticated user
 */
router.get('/recommendations', validateQuery(recommendationQuerySchema), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { count, strategy, risk_tolerance, exclude_current, refresh_cache } = req.query;

        const recommendations = await req.validatorRecommendationEngine.getPersonalizedRecommendations(userId, {
            count,
            strategy,
            riskTolerance: risk_tolerance,
            excludeCurrentDelegations: exclude_current,
            refreshCache: refresh_cache
        });

        res.json({
            success: true,
            data: recommendations,
            message: `Found ${recommendations.recommendations.length} personalized recommendations`
        });

    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch validator recommendations',
            message: error.message
        });
    }
});

/**
 * GET /api/delegation-analytics/strategies
 * Get available delegation strategies
 */
router.get('/strategies', async (req, res) => {
    try {
        const strategies = req.validatorRecommendationEngine.getAvailableStrategies();
        const riskTolerances = req.validatorRecommendationEngine.getAvailableRiskTolerances();

        res.json({
            success: true,
            data: {
                strategies,
                risk_tolerances: riskTolerances
            }
        });

    } catch (error) {
        console.error('Error fetching strategies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch delegation strategies'
        });
    }
});

/**
 * GET /api/delegation-analytics/preferences
 * Get user's delegation preferences
 */
router.get('/preferences', async (req, res) => {
    try {
        const userId = req.user.userId;

        const query = `
            SELECT 
                preferred_strategy,
                risk_tolerance,
                custom_weights,
                custom_filters,
                delegation_goals,
                notification_preferences,
                created_at,
                updated_at
            FROM user_delegation_preferences 
            WHERE user_id = $1
        `;

        const result = await req.db.query(query, [userId]);
        
        if (result.rows.length === 0) {
            // Return default preferences
            res.json({
                success: true,
                data: {
                    preferred_strategy: 'balanced',
                    risk_tolerance: 'balanced',
                    custom_weights: {
                        mevPotential: 0.25,
                        reliability: 0.25,
                        commissionOptimization: 0.20,
                        stakeDecentralization: 0.15,
                        performanceConsistency: 0.15
                    },
                    custom_filters: {
                        maxCommission: 0.10,
                        minUptimePercentage: 95.0,
                        maxStakeConcentration: 0.03,
                        minEpochsActive: 10
                    },
                    delegation_goals: {},
                    notification_preferences: {
                        score_changes: true,
                        new_recommendations: true,
                        validator_alerts: true
                    },
                    is_default: true
                }
            });
        } else {
            res.json({
                success: true,
                data: {
                    ...result.rows[0],
                    is_default: false
                }
            });
        }

    } catch (error) {
        console.error('Error fetching delegation preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch delegation preferences'
        });
    }
});

/**
 * PUT /api/delegation-analytics/preferences
 * Update user's delegation preferences
 */
router.put('/preferences', validateBody(preferencesUpdateSchema), async (req, res) => {
    try {
        const userId = req.user.userId;
        const updates = req.body;

        // Validate custom weights sum to 1.0 if provided
        if (updates.custom_weights) {
            const weightSum = Object.values(updates.custom_weights).reduce((sum, weight) => sum + weight, 0);
            if (Math.abs(weightSum - 1.0) > 0.001) {
                return res.status(400).json({
                    success: false,
                    error: 'Custom weights must sum to 1.0',
                    current_sum: weightSum
                });
            }
        }

        // Build dynamic update query
        const updateFields = [];
        const values = [userId];
        let paramIndex = 2;

        for (const [field, value] of Object.entries(updates)) {
            if (value !== undefined) {
                updateFields.push(`${field} = $${paramIndex}`);
                if (typeof value === 'object') {
                    values.push(JSON.stringify(value));
                } else {
                    values.push(value);
                }
                paramIndex++;
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }

        const query = `
            INSERT INTO user_delegation_preferences (user_id, ${Object.keys(updates).join(', ')})
            VALUES ($1, ${Array.from({length: Object.keys(updates).length}, (_, i) => `$${i + 2}`).join(', ')})
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                ${updateFields.join(', ')},
                updated_at = NOW()
            RETURNING *
        `;

        const result = await req.db.query(query, values);

        // Clear user's recommendation cache
        req.validatorRecommendationEngine.clearUserCache(userId);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Delegation preferences updated successfully'
        });

    } catch (error) {
        console.error('Error updating delegation preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update delegation preferences'
        });
    }
});

/**
 * GET /api/delegation-analytics/portfolio
 * Get user's current delegation portfolio analysis
 */
router.get('/portfolio', async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get current delegations with validator scores
        const delegationsQuery = `
            SELECT 
                ud.validator_address,
                ud.stake_amount,
                ud.delegation_date,
                ud.initial_validator_score,
                ud.current_validator_score,
                vs.composite_score,
                vs.mev_score,
                vs.reliability_score,
                vs.commission_score,
                vs.risk_penalty,
                vs.last_updated as score_updated
            FROM user_delegations ud
            LEFT JOIN validator_scores vs ON ud.validator_address = vs.validator_id
            WHERE ud.user_id = $1 AND ud.is_active = true
            ORDER BY ud.stake_amount DESC
        `;

        const delegationsResult = await req.db.query(delegationsQuery, [userId]);

        // Get portfolio insights if available
        const insightsQuery = `
            SELECT * FROM delegation_portfolio_insights 
            WHERE user_id = $1 
            ORDER BY analysis_date DESC 
            LIMIT 1
        `;

        const insightsResult = await req.db.query(insightsQuery, [userId]);

        // Calculate portfolio metrics
        const delegations = delegationsResult.rows;
        const totalStake = delegations.reduce((sum, d) => sum + parseInt(d.stake_amount), 0);
        const validatorCount = delegations.length;

        let portfolioScore = 0;
        let avgMevScore = 0;
        let avgReliabilityScore = 0;
        let avgRiskPenalty = 0;

        if (validatorCount > 0) {
            portfolioScore = delegations.reduce((sum, d) => sum + (d.composite_score || 0), 0) / validatorCount;
            avgMevScore = delegations.reduce((sum, d) => sum + (d.mev_score || 0), 0) / validatorCount;
            avgReliabilityScore = delegations.reduce((sum, d) => sum + (d.reliability_score || 0), 0) / validatorCount;
            avgRiskPenalty = delegations.reduce((sum, d) => sum + (d.risk_penalty || 0), 0) / validatorCount;
        }

        // Calculate diversification metrics
        const commissionRates = delegations.map(d => d.commission_score || 0);
        const diversificationScore = commissionRates.length > 1 
            ? 1 - (Math.max(...commissionRates) - Math.min(...commissionRates)) 
            : 0;

        const portfolio = {
            summary: {
                total_stake_amount: totalStake,
                validator_count: validatorCount,
                portfolio_score: Math.round(portfolioScore * 100) / 100,
                avg_mev_score: Math.round(avgMevScore * 100) / 100,
                avg_reliability_score: Math.round(avgReliabilityScore * 100) / 100,
                avg_risk_penalty: Math.round(avgRiskPenalty * 100) / 100,
                diversification_score: Math.round(diversificationScore * 100) / 100
            },
            delegations: delegations.map(d => ({
                validator_address: d.validator_address,
                stake_amount: parseInt(d.stake_amount),
                stake_percentage: totalStake > 0 ? Math.round((parseInt(d.stake_amount) / totalStake) * 10000) / 100 : 0,
                delegation_date: d.delegation_date,
                current_score: d.composite_score,
                performance_change: d.current_validator_score && d.initial_validator_score 
                    ? Math.round((d.current_validator_score - d.initial_validator_score) * 10000) / 100
                    : null,
                scores: {
                    composite: d.composite_score,
                    mev_potential: d.mev_score,
                    reliability: d.reliability_score,
                    commission: d.commission_score
                },
                risk_penalty: d.risk_penalty,
                last_score_update: d.score_updated
            })),
            insights: insightsResult.rows[0] || null,
            analysis_date: new Date().toISOString()
        };

        res.json({
            success: true,
            data: portfolio
        });

    } catch (error) {
        console.error('Error fetching portfolio analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch portfolio analysis'
        });
    }
});

/**
 * POST /api/delegation-analytics/delegations
 * Record a new delegation
 */
router.post('/delegations', validateBody(delegationRecordSchema), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { validator_address, stake_amount, delegation_tx_signature } = req.body;

        // Get current validator score
        const scoreQuery = `
            SELECT composite_score FROM validator_scores 
            WHERE validator_id = $1 
            ORDER BY last_updated DESC 
            LIMIT 1
        `;
        const scoreResult = await req.db.query(scoreQuery, [validator_address]);
        const currentScore = scoreResult.rows[0]?.composite_score || null;

        // Insert delegation record
        const insertQuery = `
            INSERT INTO user_delegations (
                user_id, 
                validator_address, 
                stake_amount, 
                delegation_tx_signature,
                initial_validator_score,
                current_validator_score
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await req.db.query(insertQuery, [
            userId,
            validator_address,
            stake_amount,
            delegation_tx_signature,
            currentScore,
            currentScore
        ]);

        // Mark any relevant recommendations as accepted
        await req.db.query(`
            UPDATE validator_recommendations 
            SET is_accepted = true, accepted_at = NOW(), acceptance_amount = $3
            WHERE user_id = $1 AND validator_address = $2 AND is_accepted IS NULL
        `, [userId, validator_address, stake_amount]);

        // Clear user's recommendation cache
        req.validatorRecommendationEngine.clearUserCache(userId);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Delegation recorded successfully'
        });

    } catch (error) {
        console.error('Error recording delegation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record delegation'
        });
    }
});

/**
 * GET /api/delegation-analytics/validator/:address
 * Get detailed analysis for a specific validator
 */
router.get('/validator/:address', async (req, res) => {
    try {
        const validatorAddress = req.params.address;
        const userId = req.user.userId;

        // Get validator scores and details
        const validatorQuery = `
            SELECT 
                vs.*,
                v.vote_account,
                v.identity,
                v.commission_rate,
                v.stake_amount
            FROM validator_scores vs
            LEFT JOIN validators v ON vs.validator_id = v.vote_account
            WHERE vs.validator_id = $1
        `;

        const validatorResult = await req.db.query(validatorQuery, [validatorAddress]);

        if (validatorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Validator not found'
            });
        }

        const validator = validatorResult.rows[0];

        // Get performance trends if available
        const trendsQuery = `
            SELECT * FROM validator_performance_trends 
            WHERE validator_address = $1 
            ORDER BY trend_period
        `;

        const trendsResult = await req.db.query(trendsQuery, [validatorAddress]);

        // Check if user has delegated to this validator
        const delegationQuery = `
            SELECT * FROM user_delegations 
            WHERE user_id = $1 AND validator_address = $2 AND is_active = true
        `;

        const delegationResult = await req.db.query(delegationQuery, [userId, validatorAddress]);

        // Get recommendation history for this validator
        const recommendationQuery = `
            SELECT * FROM validator_recommendations 
            WHERE user_id = $1 AND validator_address = $2 
            ORDER BY generated_at DESC 
            LIMIT 5
        `;

        const recommendationResult = await req.db.query(recommendationQuery, [userId, validatorAddress]);

        const analysis = {
            validator_info: {
                address: validator.validator_id,
                vote_account: validator.vote_account,
                identity: validator.identity,
                commission_rate: validator.commission_rate,
                stake_amount: validator.stake_amount
            },
            scores: {
                composite_score: validator.composite_score,
                composite_percentile: validator.composite_percentile,
                mev_potential: validator.mev_score,
                reliability: validator.reliability_score,
                commission: validator.commission_score,
                decentralization: validator.decentralization_score,
                consistency: validator.consistency_score
            },
            score_breakdowns: {
                mev: JSON.parse(validator.mev_breakdown || '{}'),
                reliability: JSON.parse(validator.reliability_breakdown || '{}'),
                commission: JSON.parse(validator.commission_breakdown || '{}'),
                decentralization: JSON.parse(validator.decentralization_breakdown || '{}'),
                consistency: JSON.parse(validator.consistency_breakdown || '{}')
            },
            risk_assessment: {
                risk_penalty: validator.risk_penalty,
                risk_factors: JSON.parse(validator.risk_factors || '{}')
            },
            performance_trends: trendsResult.rows,
            user_relationship: {
                is_delegated: delegationResult.rows.length > 0,
                delegation_details: delegationResult.rows[0] || null,
                recommendation_history: recommendationResult.rows
            },
            data_quality: {
                confidence_level: validator.confidence_level,
                epochs_analyzed: validator.epochs_analyzed,
                last_updated: validator.last_updated
            }
        };

        res.json({
            success: true,
            data: analysis
        });

    } catch (error) {
        console.error('Error fetching validator analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch validator analysis'
        });
    }
});

/**
 * GET /api/delegation-analytics/stats
 * Get delegation analytics service statistics
 */
router.get('/stats', async (req, res) => {
    try {
        // Get service statistics
        const stats = {
            cache_stats: req.validatorRecommendationEngine.getCacheStats(),
            database_stats: await getDatabaseStats(req.db),
            system_status: {
                delegation_analytics_active: true,
                last_scoring_update: await getLastScoringUpdate(req.db),
                total_validators_scored: await getTotalValidatorsScored(req.db)
            }
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error fetching analytics stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics statistics'
        });
    }
});

// Helper functions for stats endpoint
async function getDatabaseStats(db) {
    try {
        const queries = [
            'SELECT COUNT(*) as validator_count FROM validator_scores WHERE last_updated > NOW() - INTERVAL \'24 hours\'',
            'SELECT COUNT(*) as user_count FROM user_delegation_preferences',
            'SELECT COUNT(*) as delegation_count FROM user_delegations WHERE is_active = true',
            'SELECT COUNT(*) as recommendation_count FROM validator_recommendations WHERE expires_at > NOW()'
        ];

        const results = await Promise.all(queries.map(query => db.query(query)));

        return {
            active_validators: parseInt(results[0].rows[0].validator_count),
            users_with_preferences: parseInt(results[1].rows[0].user_count),
            active_delegations: parseInt(results[2].rows[0].delegation_count),
            active_recommendations: parseInt(results[3].rows[0].recommendation_count)
        };
    } catch (error) {
        return {
            active_validators: 0,
            users_with_preferences: 0,
            active_delegations: 0,
            active_recommendations: 0
        };
    }
}

async function getLastScoringUpdate(db) {
    try {
        const result = await db.query('SELECT MAX(last_updated) as last_update FROM validator_scores');
        return result.rows[0].last_update;
    } catch (error) {
        return null;
    }
}

async function getTotalValidatorsScored(db) {
    try {
        const result = await db.query('SELECT COUNT(*) as total FROM validator_scores');
        return parseInt(result.rows[0].total);
    } catch (error) {
        return 0;
    }
}

// Middleware injection (to be added to app.js)
router.use((req, res, next) => {
    if (!req.validatorRecommendationEngine) {
        return res.status(500).json({
            success: false,
            error: 'Delegation analytics service not available'
        });
    }
    next();
});

module.exports = router;