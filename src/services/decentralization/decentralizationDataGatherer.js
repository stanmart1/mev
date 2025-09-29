/**
 * Decentralization Data Gatherer
 * 
 * Responsible for gathering comprehensive decentralization and network distribution data
 * for stake decentralization scoring analysis
 */
class DecentralizationDataGatherer {
    constructor(database, logger) {
        this.db = database;
        this.logger = logger;
    }

    /**
     * Gather comprehensive decentralization data for a validator
     * @param {string} validatorId - Validator vote account
     * @param {string} timeframe - Time window for analysis
     * @returns {Promise<Object>} Comprehensive decentralization data
     */
    async gatherDecentralizationData(validatorId, timeframe = 'recent') {
        try {
            const query = `
                WITH validator_base AS (
                    SELECT 
                        v.vote_account,
                        v.stake_amount,
                        v.epochs_active,
                        v.commission_rate
                    FROM validators v
                    WHERE v.vote_account = $1
                ),
                total_stake AS (
                    SELECT SUM(stake_amount) as network_total_stake
                    FROM validators
                    WHERE stake_amount > 0
                ),
                delegator_stats AS (
                    SELECT 
                        d.validator_id,
                        COUNT(*) as delegator_count,
                        AVG(d.stake_amount) as avg_delegation_size,
                        STDDEV(d.stake_amount) as delegation_variance,
                        COUNT(CASE WHEN d.stake_amount > 1000 THEN 1 END) as large_delegators,
                        COUNT(CASE WHEN d.stake_amount < 100 THEN 1 END) as small_delegators
                    FROM delegations d
                    WHERE d.validator_id = $1
                    AND d.active = true
                    GROUP BY d.validator_id
                ),
                stake_ranking AS (
                    SELECT 
                        vote_account,
                        stake_amount,
                        RANK() OVER (ORDER BY stake_amount DESC) as stake_concentration_rank,
                        COUNT(*) OVER() as total_active_validators
                    FROM validators
                    WHERE stake_amount > 0
                )
                SELECT 
                    vb.*,
                    ts.network_total_stake,
                    (vb.stake_amount / ts.network_total_stake * 100) as stake_share_percentage,
                    ds.delegator_count,
                    ds.avg_delegation_size,
                    ds.delegation_variance,
                    ds.large_delegators,
                    ds.small_delegators,
                    sr.stake_concentration_rank,
                    sr.total_active_validators
                FROM validator_base vb
                CROSS JOIN total_stake ts
                LEFT JOIN delegator_stats ds ON vb.vote_account = ds.validator_id
                LEFT JOIN stake_ranking sr ON vb.vote_account = sr.vote_account
            `;

            const result = await this.db.query(query, [validatorId]);
            return result.rows[0] || null;

        } catch (error) {
            this.logger.error(`Error gathering decentralization data for ${validatorId}:`, error);
            throw error;
        }
    }

    /**
     * Get Nakamoto coefficient data
     * @returns {Promise<Object>} Nakamoto coefficient information
     */
    async getNakamotoCoefficient() {
        try {
            const query = `
                WITH cumulative_stake AS (
                    SELECT 
                        vote_account,
                        stake_amount,
                        SUM(stake_amount) OVER (ORDER BY stake_amount DESC) as cumulative_stake,
                        SUM(stake_amount) OVER () as total_stake,
                        ROW_NUMBER() OVER (ORDER BY stake_amount DESC) as rank
                    FROM validators
                    WHERE stake_amount > 0
                )
                SELECT 
                    vote_account,
                    stake_amount,
                    cumulative_stake,
                    total_stake,
                    rank,
                    (cumulative_stake / total_stake) as cumulative_percentage
                FROM cumulative_stake
                WHERE (cumulative_stake / total_stake) <= 0.33334
                ORDER BY rank
            `;

            const result = await this.db.query(query);
            const validators = result.rows;
            
            return {
                coefficient: validators.length,
                validators: validators,
                threshold_percentage: 33.334
            };

        } catch (error) {
            this.logger.error('Error getting Nakamoto coefficient:', error);
            return {
                coefficient: 20, // Default current Nakamoto coefficient
                validators: [],
                threshold_percentage: 33.334
            };
        }
    }

    /**
     * Calculate geographic diversity score
     * @param {string} validatorId - Validator vote account
     * @returns {Promise<number>} Geographic diversity score (0-100)
     */
    async calculateGeographicDiversityScore(validatorId) {
        try {
            const query = `
                SELECT 
                    vg.country,
                    vg.region,
                    vg.city,
                    vg.data_center,
                    COUNT(*) OVER (PARTITION BY vg.country) as country_validator_count,
                    COUNT(*) OVER (PARTITION BY vg.region) as region_validator_count,
                    COUNT(*) OVER (PARTITION BY vg.data_center) as datacenter_validator_count,
                    COUNT(*) OVER () as total_validators_with_geo
                FROM validator_geography vg
                WHERE vg.validator_id = $1
            `;

            const result = await this.db.query(query, [validatorId]);
            
            if (result.rows.length === 0) {
                return 50; // Default score for unknown location
            }

            const geoData = result.rows[0];
            
            // Score based on geographic distribution
            const countryScore = Math.min(100, (1 / (geoData.country_validator_count / geoData.total_validators_with_geo)) * 25);
            const regionScore = Math.min(100, (1 / (geoData.region_validator_count / geoData.total_validators_with_geo)) * 35);
            const datacenterScore = Math.min(100, (1 / (geoData.datacenter_validator_count / geoData.total_validators_with_geo)) * 40);

            // Weighted average favoring data center diversity
            const score = (
                countryScore * 0.3 +
                regionScore * 0.3 +
                datacenterScore * 0.4
            );

            return Math.round(score * 100) / 100;

        } catch (error) {
            this.logger.error('Error calculating geographic diversity score:', error);
            return 50; // Default score on error
        }
    }

    /**
     * Calculate infrastructure diversity score
     * @param {string} validatorId - Validator vote account
     * @returns {Promise<number>} Infrastructure diversity score (0-100)
     */
    async calculateInfrastructureDiversityScore(validatorId) {
        try {
            const query = `
                SELECT 
                    vi.cloud_provider,
                    vi.hosting_provider,
                    vi.hardware_type,
                    COUNT(*) OVER (PARTITION BY vi.cloud_provider) as provider_validator_count,
                    COUNT(*) OVER (PARTITION BY vi.hosting_provider) as hosting_validator_count,
                    COUNT(*) OVER () as total_validators_with_infra
                FROM validator_infrastructure vi
                WHERE vi.validator_id = $1
            `;

            const result = await this.db.query(query, [validatorId]);
            
            if (result.rows.length === 0) {
                return 60; // Default moderate score for unknown infrastructure
            }

            const infraData = result.rows[0];
            
            // Score based on infrastructure provider distribution
            const cloudProviderScore = Math.min(100, (1 / (infraData.provider_validator_count / infraData.total_validators_with_infra)) * 50);
            const hostingProviderScore = Math.min(100, (1 / (infraData.hosting_validator_count / infraData.total_validators_with_infra)) * 50);

            // Bonus for bare metal vs cloud
            const hardwareBonus = infraData.hardware_type === 'bare_metal' ? 15 : 0;

            const score = Math.min(100, (
                cloudProviderScore * 0.5 +
                hostingProviderScore * 0.5 +
                hardwareBonus
            ));

            return Math.round(score * 100) / 100;

        } catch (error) {
            this.logger.error('Error calculating infrastructure diversity score:', error);
            return 60; // Default score on error
        }
    }

    /**
     * Get decentralization rankings data
     * @param {Object} filters - Filtering criteria
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Decentralization rankings
     */
    async getDecentralizationRankings(filters = {}, limit = 50) {
        try {
            const {
                minScore = 0,
                maxStakeShare = 100,
                minDelegators = 0,
                excludeInsufficientData = false
            } = filters;

            let whereClause = 'WHERE 1=1';
            const queryParams = [];
            let paramIndex = 1;

            if (minScore > 0) {
                whereClause += ` AND decentralization_score >= $${paramIndex++}`;
                queryParams.push(minScore);
            }

            if (maxStakeShare < 100) {
                whereClause += ` AND stake_share_percentage <= $${paramIndex++}`;
                queryParams.push(maxStakeShare);
            }

            if (minDelegators > 0) {
                whereClause += ` AND delegator_count >= $${paramIndex++}`;
                queryParams.push(minDelegators);
            }

            if (excludeInsufficientData) {
                whereClause += ` AND decentralization_grade != 'Insufficient Data'`;
            }

            const query = `
                SELECT 
                    validator_id,
                    decentralization_score,
                    score_breakdown,
                    decentralization_metrics,
                    confidence_level,
                    decentralization_grade,
                    network_health_impact,
                    last_updated,
                    RANK() OVER (ORDER BY decentralization_score DESC) as rank
                FROM validator_decentralization_scores
                ${whereClause}
                ORDER BY decentralization_score DESC
                LIMIT $${paramIndex}
            `;

            queryParams.push(limit);
            const result = await this.db.query(query, queryParams);
            
            return result.rows.map(row => ({
                ...row,
                score_breakdown: JSON.parse(row.score_breakdown || '{}'),
                decentralization_metrics: JSON.parse(row.decentralization_metrics || '{}'),
                network_health_impact: JSON.parse(row.network_health_impact || '{}')
            }));

        } catch (error) {
            this.logger.error('Error getting decentralization rankings:', error);
            throw error;
        }
    }
}

module.exports = DecentralizationDataGatherer;