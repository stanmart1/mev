const EventEmitter = require('events');

/**
 * Validator Recommendation Engine
 * Provides personalized validator recommendations based on user preferences,
 * risk tolerance, and delegation goals
 */
class ValidatorRecommendationEngine extends EventEmitter {
    constructor(delegationAnalytics, userProfileService, database) {
        super();
        this.delegationAnalytics = delegationAnalytics;
        this.userProfileService = userProfileService;
        this.db = database;
        
        // Recommendation configuration
        this.config = {
            defaultRecommendationCount: 10,
            maxRecommendationCount: 50,
            minValidatorEpochs: 5,
            refreshIntervalMs: 30 * 60 * 1000, // 30 minutes
            
            // Risk tolerance mappings
            riskProfiles: {
                conservative: {
                    weights: {
                        mevPotential: 0.15,
                        reliability: 0.35,
                        commissionOptimization: 0.25,
                        stakeDecentralization: 0.15,
                        performanceConsistency: 0.10
                    },
                    filters: {
                        maxCommission: 0.08,
                        minUptimePercentage: 98.0,
                        maxStakeConcentration: 0.02,
                        minEpochsActive: 20
                    }
                },
                balanced: {
                    weights: {
                        mevPotential: 0.25,
                        reliability: 0.25,
                        commissionOptimization: 0.20,
                        stakeDecentralization: 0.15,
                        performanceConsistency: 0.15
                    },
                    filters: {
                        maxCommission: 0.10,
                        minUptimePercentage: 95.0,
                        maxStakeConcentration: 0.03,
                        minEpochsActive: 10
                    }
                },
                aggressive: {
                    weights: {
                        mevPotential: 0.40,
                        reliability: 0.20,
                        commissionOptimization: 0.15,
                        stakeDecentralization: 0.10,
                        performanceConsistency: 0.15
                    },
                    filters: {
                        maxCommission: 0.15,
                        minUptimePercentage: 90.0,
                        maxStakeConcentration: 0.05,
                        minEpochsActive: 5
                    }
                }
            },
            
            // Delegation strategy types
            strategies: {
                'maximize_mev': {
                    description: 'Maximize MEV earnings potential',
                    weights: { mevPotential: 0.50, reliability: 0.20, commissionOptimization: 0.15, stakeDecentralization: 0.10, performanceConsistency: 0.05 }
                },
                'maximize_safety': {
                    description: 'Prioritize validator reliability and safety',
                    weights: { reliability: 0.40, performanceConsistency: 0.25, commissionOptimization: 0.15, stakeDecentralization: 0.15, mevPotential: 0.05 }
                },
                'support_decentralization': {
                    description: 'Support network decentralization',
                    weights: { stakeDecentralization: 0.40, reliability: 0.25, performanceConsistency: 0.15, commissionOptimization: 0.15, mevPotential: 0.05 }
                },
                'cost_optimize': {
                    description: 'Minimize delegation costs and fees',
                    weights: { commissionOptimization: 0.40, reliability: 0.25, performanceConsistency: 0.15, mevPotential: 0.15, stakeDecentralization: 0.05 }
                }
            }
        };
        
        this.logger = console;
        this.recommendationCache = new Map();
        this.userPreferencesCache = new Map();
    }

    /**
     * Get personalized validator recommendations for a user
     * @param {string} userId - User ID
     * @param {Object} options - Recommendation options
     * @returns {Promise<Object>} Personalized recommendations
     */
    async getPersonalizedRecommendations(userId, options = {}) {
        try {
            const {
                count = this.config.defaultRecommendationCount,
                strategy = null,
                riskTolerance = null,
                excludeCurrentDelegations = true,
                refreshCache = false
            } = options;

            // Check cache first
            const cacheKey = `${userId}_${JSON.stringify(options)}`;
            if (!refreshCache && this.recommendationCache.has(cacheKey)) {
                const cached = this.recommendationCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.config.refreshIntervalMs) {
                    return cached.data;
                }
            }

            // Get user preferences and delegation history
            const userProfile = await this.userProfileService.getUserProfile(userId);
            const userPreferences = this.parseUserPreferences(userProfile, strategy, riskTolerance);

            // Get current delegations to exclude if requested
            let excludeValidators = [];
            if (excludeCurrentDelegations) {
                excludeValidators = await this.getCurrentDelegations(userId);
            }

            // Generate base recommendations using delegation analytics
            const baseRecommendations = await this.delegationAnalytics.generateRecommendations({
                weights: userPreferences.weights,
                filters: userPreferences.filters,
                excludeValidators,
                limit: Math.min(count * 2, this.config.maxRecommendationCount) // Get more for better filtering
            });

            // Apply personalization and post-processing
            const personalizedRecommendations = await this.personalizeRecommendations(
                baseRecommendations, 
                userPreferences, 
                userId
            );

            // Limit to requested count
            const finalRecommendations = personalizedRecommendations.slice(0, count);

            // Generate explanation and insights
            const recommendations = {
                user_id: userId,
                recommendations: finalRecommendations,
                strategy_used: userPreferences.strategy,
                risk_tolerance: userPreferences.riskTolerance,
                total_found: finalRecommendations.length,
                generated_at: new Date().toISOString(),
                insights: await this.generateRecommendationInsights(finalRecommendations, userPreferences),
                diversification_suggestions: await this.generateDiversificationSuggestions(finalRecommendations),
                performance_projection: await this.generatePerformanceProjection(finalRecommendations, userPreferences)
            };

            // Cache the results
            this.recommendationCache.set(cacheKey, {
                data: recommendations,
                timestamp: Date.now()
            });

            this.emit('recommendationsGenerated', {
                userId,
                count: finalRecommendations.length,
                strategy: userPreferences.strategy,
                avgScore: finalRecommendations.reduce((sum, r) => sum + r.personalized_score, 0) / finalRecommendations.length
            });

            return recommendations;

        } catch (error) {
            this.logger.error('Error generating personalized recommendations:', error);
            throw error;
        }
    }

    /**
     * Parse user preferences from profile and options
     */
    parseUserPreferences(userProfile, strategy = null, riskTolerance = null) {
        // Get default preferences from profile or use balanced defaults
        const profilePrefs = userProfile?.delegation_preferences || {};
        const defaultRiskTolerance = profilePrefs.risk_tolerance || 'balanced';
        const defaultStrategy = profilePrefs.preferred_strategy || 'balanced';

        // Use provided parameters or fall back to profile defaults
        const finalRiskTolerance = riskTolerance || defaultRiskTolerance;
        const finalStrategy = strategy || defaultStrategy;

        // Get base configuration from risk profile
        const baseConfig = this.config.riskProfiles[finalRiskTolerance] || this.config.riskProfiles.balanced;

        // Apply strategy weights if specified
        let weights = { ...baseConfig.weights };
        if (finalStrategy && this.config.strategies[finalStrategy]) {
            weights = this.config.strategies[finalStrategy].weights;
        }

        // Apply user custom weights if available
        if (profilePrefs.custom_weights) {
            weights = { ...weights, ...profilePrefs.custom_weights };
        }

        // Apply user custom filters
        let filters = { ...baseConfig.filters };
        if (profilePrefs.custom_filters) {
            filters = { ...filters, ...profilePrefs.custom_filters };
        }

        return {
            strategy: finalStrategy,
            riskTolerance: finalRiskTolerance,
            weights,
            filters,
            customPreferences: profilePrefs
        };
    }

    /**
     * Get user's current validator delegations
     */
    async getCurrentDelegations(userId) {
        try {
            const query = `
                SELECT DISTINCT validator_address 
                FROM user_delegations 
                WHERE user_id = $1 AND is_active = true
            `;
            const result = await this.db.query(query, [userId]);
            return result.rows.map(row => row.validator_address);
        } catch (error) {
            this.logger.error('Error fetching current delegations:', error);
            return [];
        }
    }

    /**
     * Apply personalization to base recommendations
     */
    async personalizeRecommendations(baseRecommendations, userPreferences, userId) {
        try {
            const personalizedRecommendations = [];

            for (const recommendation of baseRecommendations) {
                // Apply user preference adjustments
                let personalizedScore = recommendation.personalized_score;

                // Favorite validator bonus
                if (await this.isUserFavorite(userId, recommendation.vote_account)) {
                    personalizedScore += 0.05; // 5% bonus for favorites
                    recommendation.is_favorite = true;
                }

                // Historical performance with this validator
                const historicalPerformance = await this.getUserValidatorHistory(userId, recommendation.vote_account);
                if (historicalPerformance) {
                    const performanceAdjustment = (historicalPerformance.avg_return - 0.05) * 0.1; // Adjust based on historical returns
                    personalizedScore += Math.max(-0.02, Math.min(0.02, performanceAdjustment));
                    recommendation.historical_performance = historicalPerformance;
                }

                // Diversification benefit
                const diversificationBonus = await this.calculateDiversificationBonus(
                    recommendation, 
                    personalizedRecommendations
                );
                personalizedScore += diversificationBonus;
                recommendation.diversification_benefit = diversificationBonus;

                // Apply user-specific risk adjustments
                const riskAdjustment = this.calculateUserRiskAdjustment(recommendation, userPreferences);
                personalizedScore += riskAdjustment;
                recommendation.risk_adjustment = riskAdjustment;

                // Update the personalized score
                recommendation.personalized_score = Math.max(0, Math.min(1, personalizedScore));

                // Add personalization metadata
                recommendation.personalization = {
                    user_preferences: userPreferences.strategy,
                    risk_tolerance: userPreferences.riskTolerance,
                    is_favorite: recommendation.is_favorite || false,
                    has_history: !!recommendation.historical_performance
                };

                personalizedRecommendations.push(recommendation);
            }

            // Sort by personalized score
            return personalizedRecommendations.sort((a, b) => b.personalized_score - a.personalized_score);

        } catch (error) {
            this.logger.error('Error personalizing recommendations:', error);
            return baseRecommendations;
        }
    }

    /**
     * Check if validator is in user's favorites
     */
    async isUserFavorite(userId, validatorAddress) {
        try {
            const userProfile = await this.userProfileService.getUserProfile(userId);
            const favorites = userProfile?.favorite_validators || [];
            return favorites.includes(validatorAddress);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get user's historical performance with a validator
     */
    async getUserValidatorHistory(userId, validatorAddress) {
        try {
            const query = `
                SELECT 
                    AVG(delegation_return) as avg_return,
                    COUNT(*) as delegation_count,
                    MAX(end_date) as last_delegation
                FROM user_delegation_history 
                WHERE user_id = $1 AND validator_address = $2
                AND end_date > NOW() - INTERVAL '12 months'
            `;
            const result = await this.db.query(query, [userId, validatorAddress]);
            const row = result.rows[0];
            
            if (row && row.delegation_count > 0) {
                return {
                    avg_return: parseFloat(row.avg_return),
                    delegation_count: parseInt(row.delegation_count),
                    last_delegation: row.last_delegation
                };
            }
            return null;
        } catch (error) {
            this.logger.error('Error fetching validator history:', error);
            return null;
        }
    }

    /**
     * Calculate diversification bonus for recommendation
     */
    async calculateDiversificationBonus(recommendation, existingRecommendations) {
        let bonus = 0;
        
        // Commission rate diversification
        const commissionRates = existingRecommendations.map(r => r.validator_info.commission_rate);
        const avgCommission = commissionRates.reduce((sum, rate) => sum + rate, 0) / commissionRates.length || 0;
        const commissionDiff = Math.abs(recommendation.validator_info.commission_rate - avgCommission);
        bonus += Math.min(0.01, commissionDiff * 0.1); // Up to 1% bonus for commission diversity

        // Geographic/infrastructure diversification (if available)
        // This would require additional validator metadata
        
        // Stake size diversification
        const stakeSizes = existingRecommendations.map(r => r.validator_info.stake_amount);
        if (stakeSizes.length > 0) {
            const avgStake = stakeSizes.reduce((sum, stake) => sum + stake, 0) / stakeSizes.length;
            const stakeDiff = Math.abs(recommendation.validator_info.stake_amount - avgStake) / avgStake;
            bonus += Math.min(0.005, stakeDiff * 0.01); // Up to 0.5% bonus for stake diversity
        }

        return Math.min(0.02, bonus); // Cap total diversification bonus at 2%
    }

    /**
     * Calculate user-specific risk adjustments
     */
    calculateUserRiskAdjustment(recommendation, userPreferences) {
        let adjustment = 0;
        const riskTolerance = userPreferences.riskTolerance;

        // Conservative users penalty for high-risk validators
        if (riskTolerance === 'conservative') {
            if (recommendation.validator_info.commission_rate > 0.08) {
                adjustment -= 0.02; // Penalty for high commission
            }
            if (recommendation.scores.reliability < 0.95) {
                adjustment -= 0.01; // Penalty for lower reliability
            }
        }

        // Aggressive users bonus for high MEV potential
        if (riskTolerance === 'aggressive') {
            if (recommendation.scores.mev_potential > 0.8) {
                adjustment += 0.01; // Bonus for high MEV potential
            }
        }

        return adjustment;
    }

    /**
     * Generate insights about recommendations
     */
    async generateRecommendationInsights(recommendations, userPreferences) {
        const insights = {
            strategy_summary: this.getStrategySummary(userPreferences.strategy),
            portfolio_characteristics: {},
            top_strengths: [],
            potential_concerns: [],
            optimization_suggestions: []
        };

        if (recommendations.length === 0) {
            return insights;
        }

        // Portfolio characteristics
        const avgCommission = recommendations.reduce((sum, r) => sum + r.validator_info.commission_rate, 0) / recommendations.length;
        const avgMevScore = recommendations.reduce((sum, r) => sum + r.scores.mev_potential, 0) / recommendations.length;
        const avgReliability = recommendations.reduce((sum, r) => sum + r.scores.reliability, 0) / recommendations.length;

        insights.portfolio_characteristics = {
            average_commission: Math.round(avgCommission * 10000) / 100, // Convert to percentage
            average_mev_potential: Math.round(avgMevScore * 100),
            average_reliability: Math.round(avgReliability * 100),
            diversification_score: this.calculateDiversificationScore(recommendations)
        };

        // Identify strengths
        if (avgMevScore > 0.7) {
            insights.top_strengths.push("High MEV earning potential across validators");
        }
        if (avgReliability > 0.9) {
            insights.top_strengths.push("Excellent validator reliability and uptime");
        }
        if (avgCommission < 0.08) {
            insights.top_strengths.push("Cost-effective commission rates");
        }

        // Identify concerns
        if (avgCommission > 0.12) {
            insights.potential_concerns.push("Higher than average commission rates");
        }
        if (avgReliability < 0.85) {
            insights.potential_concerns.push("Some validators have lower reliability scores");
        }

        // Optimization suggestions
        const commissionRange = Math.max(...recommendations.map(r => r.validator_info.commission_rate)) - 
                               Math.min(...recommendations.map(r => r.validator_info.commission_rate));
        if (commissionRange < 0.02) {
            insights.optimization_suggestions.push("Consider validators with different commission rates for better diversification");
        }

        return insights;
    }

    /**
     * Get strategy summary description
     */
    getStrategySummary(strategy) {
        const summaries = {
            'maximize_mev': 'Focused on maximizing MEV earnings through high-performing validators',
            'maximize_safety': 'Prioritizing validator reliability and consistent performance',
            'support_decentralization': 'Supporting network health through decentralized delegation',
            'cost_optimize': 'Minimizing costs while maintaining good performance',
            'balanced': 'Balanced approach considering all factors equally'
        };
        return summaries[strategy] || summaries.balanced;
    }

    /**
     * Calculate portfolio diversification score
     */
    calculateDiversificationScore(recommendations) {
        if (recommendations.length < 2) return 0;

        let diversificationScore = 0;
        let factors = 0;

        // Commission rate diversification
        const commissionRates = recommendations.map(r => r.validator_info.commission_rate);
        const commissionStdev = this.calculateStandardDeviation(commissionRates);
        diversificationScore += Math.min(1, commissionStdev * 20); // Normalize standard deviation
        factors++;

        // MEV potential diversification
        const mevScores = recommendations.map(r => r.scores.mev_potential);
        const mevStdev = this.calculateStandardDeviation(mevScores);
        diversificationScore += Math.min(1, mevStdev * 5);
        factors++;

        // Stake size diversification
        const stakeSizes = recommendations.map(r => r.validator_info.stake_amount);
        const stakeStdev = this.calculateStandardDeviation(stakeSizes.map(s => Math.log(s + 1))); // Log scale for stake
        diversificationScore += Math.min(1, stakeStdev * 0.5);
        factors++;

        return Math.round((diversificationScore / factors) * 100);
    }

    /**
     * Calculate standard deviation
     */
    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    }

    /**
     * Generate diversification suggestions
     */
    async generateDiversificationSuggestions(recommendations) {
        const suggestions = [];

        if (recommendations.length < 5) {
            suggestions.push({
                type: 'validator_count',
                message: 'Consider delegating to 5-10 validators for better risk distribution',
                impact: 'medium'
            });
        }

        // Check commission rate concentration
        const commissionRates = recommendations.map(r => r.validator_info.commission_rate);
        const uniqueCommissionRates = new Set(commissionRates.map(rate => Math.round(rate * 100))).size;
        if (uniqueCommissionRates < Math.min(3, recommendations.length)) {
            suggestions.push({
                type: 'commission_diversity',
                message: 'Mix validators with different commission rates (5-8% range recommended)',
                impact: 'low'
            });
        }

        // Check MEV potential distribution
        const mevScores = recommendations.map(r => r.scores.mev_potential);
        const highMevCount = mevScores.filter(score => score > 0.8).length;
        const lowMevCount = mevScores.filter(score => score < 0.3).length;

        if (highMevCount === recommendations.length) {
            suggestions.push({
                type: 'mev_balance',
                message: 'Consider including some reliable validators with moderate MEV potential',
                impact: 'medium'
            });
        } else if (lowMevCount === recommendations.length) {
            suggestions.push({
                type: 'mev_opportunity',
                message: 'Consider including some high MEV potential validators for better returns',
                impact: 'high'
            });
        }

        return suggestions;
    }

    /**
     * Generate performance projection based on recommendations
     */
    async generatePerformanceProjection(recommendations, userPreferences) {
        if (recommendations.length === 0) {
            return { estimated_apy: 0, confidence: 0, projection_period: '12_months' };
        }

        try {
            // Calculate weighted average performance metrics
            const totalWeight = recommendations.length;
            let weightedMevPotential = 0;
            let weightedReliability = 0;
            let weightedCommission = 0;

            recommendations.forEach(rec => {
                const weight = 1 / totalWeight; // Equal weighting for now
                weightedMevPotential += rec.scores.mev_potential * weight;
                weightedReliability += rec.scores.reliability * weight;
                weightedCommission += rec.validator_info.commission_rate * weight;
            });

            // Base staking yield (estimated)
            const baseStakingYield = 0.06; // 6% base staking yield

            // MEV bonus calculation
            const mevBonus = weightedMevPotential * 0.02; // Up to 2% bonus from MEV

            // Reliability adjustment
            const reliabilityAdjustment = (weightedReliability - 0.95) * 0.01; // Penalty for low reliability

            // Commission impact
            const commissionImpact = -weightedCommission;

            // Calculate estimated APY
            const estimatedApy = baseStakingYield + mevBonus + reliabilityAdjustment + commissionImpact;

            // Calculate confidence based on data quality
            const avgScoreCount = recommendations.reduce((sum, rec) => {
                return sum + (rec.scores.reliability > 0 ? 1 : 0);
            }, 0) / recommendations.length;
            
            const confidence = Math.min(95, 60 + (avgScoreCount * 35)); // 60-95% confidence range

            return {
                estimated_apy: Math.round(estimatedApy * 10000) / 100, // Convert to percentage with 2 decimals
                confidence: Math.round(confidence),
                projection_period: '12_months',
                breakdown: {
                    base_staking_yield: Math.round(baseStakingYield * 10000) / 100,
                    mev_bonus: Math.round(mevBonus * 10000) / 100,
                    reliability_adjustment: Math.round(reliabilityAdjustment * 10000) / 100,
                    commission_impact: Math.round(commissionImpact * 10000) / 100
                }
            };

        } catch (error) {
            this.logger.error('Error generating performance projection:', error);
            return { estimated_apy: 0, confidence: 0, projection_period: '12_months' };
        }
    }

    /**
     * Get available recommendation strategies
     */
    getAvailableStrategies() {
        return Object.keys(this.config.strategies).map(key => ({
            strategy: key,
            description: this.config.strategies[key].description,
            weights: this.config.strategies[key].weights
        }));
    }

    /**
     * Get available risk tolerance levels
     */
    getAvailableRiskTolerances() {
        return Object.keys(this.config.riskProfiles).map(key => ({
            risk_tolerance: key,
            weights: this.config.riskProfiles[key].weights,
            filters: this.config.riskProfiles[key].filters
        }));
    }

    /**
     * Clear recommendation cache for user
     */
    clearUserCache(userId) {
        const keysToDelete = [];
        for (const [key] of this.recommendationCache) {
            if (key.startsWith(userId + '_')) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.recommendationCache.delete(key));
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            recommendation_cache_size: this.recommendationCache.size,
            user_preferences_cache_size: this.userPreferencesCache.size
        };
    }
}

module.exports = ValidatorRecommendationEngine;