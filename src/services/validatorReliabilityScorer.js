const EventEmitter = require('events');
const ReliabilityDataGatherer = require('./reliability/reliabilityDataGatherer');
const ReliabilityScoreCalculator = require('./reliability/reliabilityScoreCalculator');

/**
 * Validator Reliability Scoring System
 * 
 * Main orchestrator for reliability scoring that coordinates
 * data gathering and score calculation components
 */
class ValidatorReliabilityScorer extends EventEmitter {
    constructor(database, logger) {
        super();
        this.db = database;
        this.logger = logger;

        // Reliability scoring configuration
        this.config = {
            scoringWeights: {
                uptimeScore: 0.35,           // Overall uptime percentage
                voteReliability: 0.25,       // Vote success and timeliness
                blockProductionReliability: 0.20, // Block production consistency
                networkParticipation: 0.12,  // Network event participation
                recoveryResilience: 0.08     // Recovery after downtime
            },
            thresholds: {
                excellentUptime: 99.5,       // 99.5%+ uptime
                goodUptime: 98.0,            // 98%+ uptime  
                acceptableUptime: 95.0,      // 95%+ uptime
                excellentVoteSuccess: 99.0,  // 99%+ vote success
                goodVoteSuccess: 97.0,       // 97%+ vote success
                acceptableSkipRate: 5.0,     // <5% skip rate
                maxVoteDistance: 150,        // Maximum acceptable vote distance
                minimumEpochs: 20            // Minimum epochs for reliable scoring
            }
        };

        // Initialize components
        this.dataGatherer = new ReliabilityDataGatherer(database, logger);
        this.scoreCalculator = new ReliabilityScoreCalculator(this.config);
    }

    /**
     * Calculate comprehensive reliability score for a validator
     * @param {string} validatorId - Validator vote account
     * @param {Object} options - Scoring options
     * @returns {Promise<Object>} Reliability score and detailed breakdown
     */
    async calculateReliabilityScore(validatorId, options = {}) {
        try {
            const {
                includeHistoricalTrends = false,
                includeRecoveryAnalysis = false,
                performComprehensiveAssessment = false
            } = options;

            const reliabilityData = await this.dataGatherer.gatherReliabilityData(validatorId);
            
            if (!reliabilityData || reliabilityData.epochs_active < this.config.thresholds.minimumEpochs) {
                return this.scoreCalculator.getInsufficientDataScore(validatorId, reliabilityData);
            }

            // Calculate individual scoring components
            const uptimeScore = this.scoreCalculator.calculateUptimeScore(reliabilityData);
            const voteScore = this.scoreCalculator.calculateVoteReliabilityScore(reliabilityData);
            const blockProductionScore = this.scoreCalculator.calculateBlockProductionScore(reliabilityData);
            const participationScore = this.scoreCalculator.calculateNetworkParticipationScore(reliabilityData);
            
            // Get recovery analysis if requested
            const recoveryAnalysis = includeRecoveryAnalysis 
                ? await this.dataGatherer.analyzeRecoveryPatterns(validatorId)
                : null;
            const recoveryScore = this.scoreCalculator.calculateRecoveryScore(recoveryAnalysis);

            // Calculate weighted composite score
            const compositeScore = this.scoreCalculator.calculateCompositeScore({
                uptime: uptimeScore,
                voting: voteScore,
                blockProduction: blockProductionScore,
                participation: participationScore,
                recovery: recoveryScore
            });

            const result = {
                validator_id: validatorId,
                reliability_score: Math.round(compositeScore * 100) / 100,
                score_breakdown: {
                    uptime_score: uptimeScore,
                    vote_reliability: voteScore,
                    block_production: blockProductionScore,
                    network_participation: participationScore,
                    recovery_resilience: recoveryScore
                },
                performance_metrics: {
                    uptime_percentage: reliabilityData.uptime_percentage,
                    vote_success_rate: reliabilityData.vote_success_rate,
                    skip_rate: reliabilityData.skip_rate,
                    avg_vote_distance: reliabilityData.avg_vote_distance,
                    epochs_analyzed: reliabilityData.epochs_active
                },
                confidence_level: this.scoreCalculator.calculateConfidenceLevel(reliabilityData),
                reliability_grade: this.scoreCalculator.assignReliabilityGrade(compositeScore),
                last_updated: new Date().toISOString()
            };

            // Add historical trends if requested
            if (includeHistoricalTrends) {
                result.historical_trends = await this.dataGatherer.analyzeHistoricalTrends(validatorId);
            }

            // Add recovery analysis if requested
            if (includeRecoveryAnalysis && recoveryAnalysis) {
                result.recovery_analysis = recoveryAnalysis;
            }

            // Perform comprehensive assessment if requested
            if (performComprehensiveAssessment) {
                const trends = includeHistoricalTrends ? result.historical_trends : await this.dataGatherer.analyzeHistoricalTrends(validatorId);
                const recovery = includeRecoveryAnalysis ? result.recovery_analysis : recoveryAnalysis;
                
                const assessment = this.scoreCalculator.performComprehensiveAssessment(result, trends, recovery);
                result.comprehensive_assessment = assessment;
            }

            this.emit('reliabilityScoreCalculated', {
                validatorId,
                score: compositeScore,
                grade: result.reliability_grade
            });

            return result;

        } catch (error) {
            this.logger.error(`Error calculating reliability score for ${validatorId}:`, error);
            throw error;
        }
    }

    /**
     * Batch calculate reliability scores for multiple validators
     * @param {Array<string>} validatorIds - Array of validator vote accounts
     * @param {Object} options - Scoring options
     * @returns {Promise<Array>} Array of reliability scores
     */
    async batchCalculateScores(validatorIds, options = {}) {
        try {
            const { concurrency = 10 } = options;
            const results = [];
            
            for (let i = 0; i < validatorIds.length; i += concurrency) {
                const batch = validatorIds.slice(i, i + concurrency);
                const batchPromises = batch.map(id => 
                    this.calculateReliabilityScore(id, options)
                        .catch(error => {
                            this.logger.error(`Error scoring validator ${id}:`, error);
                            return this.scoreCalculator.getInsufficientDataScore(id, null);
                        })
                );
                
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                
                if (i + concurrency < validatorIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            this.emit('batchScoringComplete', {
                totalValidators: validatorIds.length,
                averageScore: results.reduce((sum, r) => sum + r.reliability_score, 0) / results.length
            });
            
            return results;
            
        } catch (error) {
            this.logger.error('Error in batch reliability scoring:', error);
            throw error;
        }
    }

    /**
     * Get reliability rankings
     * @param {Object} filters - Filtering criteria
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Ranked validators by reliability
     */
    async getReliabilityRankings(filters = {}, limit = 50) {
        return await this.dataGatherer.getReliabilityRankings(filters, limit);
    }

    /**
     * Get system reliability statistics
     * @returns {Promise<Object>} System reliability statistics
     */
    async getSystemStats() {
        return await this.dataGatherer.getSystemStats();
    }

    /**
     * Update scoring configuration
     * @param {Object} newConfig - New configuration parameters
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.scoringWeights) {
            const totalWeight = Object.values(this.config.scoringWeights).reduce((sum, weight) => sum + weight, 0);
            if (totalWeight !== 1.0) {
                Object.keys(this.config.scoringWeights).forEach(key => {
                    this.config.scoringWeights[key] /= totalWeight;
                });
            }
        }
        
        // Update calculator config
        this.scoreCalculator = new ReliabilityScoreCalculator(this.config);
        
        this.emit('configUpdated', this.config);
    }
}

module.exports = ValidatorReliabilityScorer;