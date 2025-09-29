const EventEmitter = require('events');
const CommissionDataGatherer = require('./commission/commissionDataGatherer');
const CommissionScoreCalculator = require('./commission/commissionScoreCalculator');

/**
 * Commission Rate Optimization Scoring System
 * 
 * Main orchestrator for commission optimization scoring that coordinates
 * data gathering and score calculation components
 */
class CommissionOptimizationScorer extends EventEmitter {
    constructor(database, logger) {
        super();
        this.db = database;
        this.logger = logger;

        // Commission scoring configuration
        this.config = {
            scoringWeights: {
                rateCompetitiveness: 0.35,    // How competitive the commission rate is
                performanceToFeeRatio: 0.25,  // Performance delivered vs fees charged
                commissionStability: 0.20,    // Consistency of commission rates
                valueProposition: 0.12,       // Overall value for delegators
                yieldAfterFees: 0.08         // Net yield after commission deduction
            },
            thresholds: {
                excellentCommission: 5.0,     // <=5% commission
                goodCommission: 7.5,          // <=7.5% commission
                acceptableCommission: 10.0,   // <=10% commission
                highCommission: 15.0,         // >15% is considered high
                marketAverageCommission: 8.5, // Market average benchmark
                minimumPerformanceRatio: 1.2, // Minimum acceptable performance/fee ratio
                minimumEpochs: 10            // Minimum epochs for reliable scoring
            },
            benchmarks: {
                excellentYield: 8.0,         // 8%+ annual yield
                goodYield: 6.0,              // 6%+ annual yield
                averageYield: 4.5,           // 4.5% annual yield
                marketAverageYield: 5.2      // Market average yield
            }
        };

        // Initialize components
        this.dataGatherer = new CommissionDataGatherer(database, logger);
        this.scoreCalculator = new CommissionScoreCalculator(this.config);
    }

    /**
     * Calculate comprehensive commission optimization score for a validator
     * @param {string} validatorId - Validator vote account
     * @param {Object} options - Scoring options
     * @returns {Promise<Object>} Commission optimization score and detailed breakdown
     */
    async calculateCommissionScore(validatorId, options = {}) {
        try {
            const {
                includeMarketComparison = true,
                includeTrendAnalysis = true,
                timeframe = 'recent'
            } = options;

            // Gather comprehensive commission data
            const commissionData = await this.dataGatherer.gatherCommissionData(validatorId, timeframe);
            
            if (!commissionData || commissionData.epochs_active < this.config.thresholds.minimumEpochs) {
                return this.scoreCalculator.getInsufficientDataScore(validatorId, commissionData);
            }

            // Calculate individual scoring components
            const rateScore = this.scoreCalculator.calculateRateCompetitivenessScore(commissionData);
            const performanceRatioScore = this.scoreCalculator.calculatePerformanceToFeeRatio(commissionData);
            const stabilityScore = this.scoreCalculator.calculateCommissionStabilityScore(commissionData);
            const valueScore = this.scoreCalculator.calculateValuePropositionScore(commissionData);
            const yieldScore = this.scoreCalculator.calculateYieldAfterFeesScore(commissionData);

            // Calculate weighted composite score
            const compositeScore = this.scoreCalculator.calculateCompositeScore({
                rate: rateScore,
                performanceRatio: performanceRatioScore,
                stability: stabilityScore,
                value: valueScore,
                yield: yieldScore
            });

            // Add market comparison if requested
            const marketComparison = includeMarketComparison 
                ? await this.dataGatherer.getMarketComparison(commissionData)
                : null;

            // Add trend analysis if requested
            const trendAnalysis = includeTrendAnalysis 
                ? await this.dataGatherer.analyzeTrends(validatorId)
                : null;

            const result = {
                validator_id: validatorId,
                commission_optimization_score: Math.round(compositeScore * 100) / 100,
                score_breakdown: {
                    rate_competitiveness: rateScore,
                    performance_to_fee_ratio: performanceRatioScore,
                    commission_stability: stabilityScore,
                    value_proposition: valueScore,
                    yield_after_fees: yieldScore
                },
                commission_metrics: {
                    current_commission_rate: commissionData.commission_rate,
                    avg_commission_rate: commissionData.avg_commission_rate,
                    commission_changes: commissionData.commission_changes,
                    performance_ratio: commissionData.performance_ratio,
                    net_yield_estimate: commissionData.estimated_yield_after_fees,
                    epochs_analyzed: commissionData.epochs_active
                },
                confidence_level: this.scoreCalculator.calculateConfidenceLevel(commissionData),
                commission_grade: this.scoreCalculator.assignCommissionGrade(compositeScore),
                last_updated: new Date().toISOString()
            };

            if (marketComparison) {
                result.market_comparison = marketComparison;
            }

            if (trendAnalysis) {
                result.trend_analysis = trendAnalysis;
            }

            this.emit('commissionScoreCalculated', {
                validatorId,
                score: compositeScore,
                commissionRate: commissionData.commission_rate,
                grade: result.commission_grade
            });

            return result;

        } catch (error) {
            this.logger.error(`Error calculating commission score for ${validatorId}:`, error);
            throw error;
        }
    }

    /**
     * Batch calculate commission scores for multiple validators
     * @param {Array<string>} validatorIds - Array of validator vote accounts
     * @param {Object} options - Scoring options
     * @returns {Promise<Array>} Array of commission optimization scores
     */
    async batchCalculateScores(validatorIds, options = {}) {
        try {
            const { concurrency = 10 } = options;
            const results = [];
            
            // Process in batches to avoid overwhelming the database
            for (let i = 0; i < validatorIds.length; i += concurrency) {
                const batch = validatorIds.slice(i, i + concurrency);
                const batchPromises = batch.map(id => 
                    this.calculateCommissionScore(id, options)
                        .catch(error => {
                            this.logger.error(`Error scoring validator ${id}:`, error);
                            return this.scoreCalculator.getInsufficientDataScore(id, null);
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
                averageScore: results.reduce((sum, r) => sum + r.commission_optimization_score, 0) / results.length
            });
            
            return results;
            
        } catch (error) {
            this.logger.error('Error in batch commission scoring:', error);
            throw error;
        }
    }

    /**
     * Get commission optimization rankings
     * @param {Object} filters - Filtering criteria
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Ranked validators by commission optimization
     */
    async getCommissionRankings(filters = {}, limit = 50) {
        try {
            const {
                minScore = 0,
                maxCommission = 100,
                minConfidence = 20,
                excludeInsufficientData = false
            } = filters;

            // Build query with filters
            let whereClause = 'WHERE 1=1';
            const queryParams = [];
            let paramIndex = 1;

            if (minScore > 0) {
                whereClause += ` AND commission_optimization_score >= $${paramIndex++}`;
                queryParams.push(minScore);
            }

            if (maxCommission < 100) {
                whereClause += ` AND current_commission_rate <= $${paramIndex++}`;
                queryParams.push(maxCommission);
            }

            if (minConfidence > 0) {
                whereClause += ` AND confidence_level >= $${paramIndex++}`;
                queryParams.push(minConfidence);
            }

            if (excludeInsufficientData) {
                whereClause += ` AND commission_grade != 'Insufficient Data'`;
            }

            const query = `
                SELECT 
                    validator_id,
                    commission_optimization_score,
                    score_breakdown,
                    commission_metrics,
                    confidence_level,
                    commission_grade,
                    last_updated,
                    RANK() OVER (ORDER BY commission_optimization_score DESC) as rank
                FROM validator_commission_scores
                ${whereClause}
                ORDER BY commission_optimization_score DESC
                LIMIT $${paramIndex}
            `;

            queryParams.push(limit);
            const result = await this.db.query(query, queryParams);
            
            return result.rows.map(row => ({
                ...row,
                score_breakdown: JSON.parse(row.score_breakdown || '{}'),
                commission_metrics: JSON.parse(row.commission_metrics || '{}')
            }));

        } catch (error) {
            this.logger.error('Error getting commission rankings:', error);
            throw error;
        }
    }

    /**
     * Get commission optimization statistics
     * @returns {Promise<Object>} System statistics
     */
    async getSystemStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_scored_validators,
                    AVG(commission_optimization_score) as avg_commission_score,
                    STDDEV(commission_optimization_score) as score_stddev,
                    AVG(confidence_level) as avg_confidence,
                    COUNT(CASE WHEN commission_optimization_score >= 75 THEN 1 END) as high_value_validators,
                    COUNT(CASE WHEN confidence_level >= 70 THEN 1 END) as high_confidence_scores,
                    AVG(CAST(commission_metrics->>'current_commission_rate' AS NUMERIC)) as avg_commission_rate,
                    MAX(last_updated) as latest_update
                FROM validator_commission_scores
                WHERE last_updated > NOW() - INTERVAL '7 days'
            `;

            const result = await this.db.query(query);
            const stats = result.rows[0] || {};

            return {
                total_validators: parseInt(stats.total_scored_validators) || 0,
                score_distribution: {
                    average: Math.round((stats.avg_commission_score || 0) * 100) / 100,
                    standard_deviation: Math.round((stats.score_stddev || 0) * 100) / 100,
                    high_value_count: parseInt(stats.high_value_validators) || 0
                },
                commission_metrics: {
                    average_commission_rate: Math.round((stats.avg_commission_rate || 0) * 100) / 100,
                    market_average: this.config.thresholds.marketAverageCommission
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
            this.logger.error('Error getting commission system stats:', error);
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
        
        // Update calculator config
        this.scoreCalculator = new CommissionScoreCalculator(this.config);
        
        this.emit('configUpdated', this.config);
    }
}

module.exports = CommissionOptimizationScorer;