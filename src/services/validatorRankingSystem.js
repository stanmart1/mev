const EventEmitter = require('events');

/**
 * Validator Ranking System
 * Comprehensive ranking system for validators based on multiple performance criteria
 */
class ValidatorRankingSystem extends EventEmitter {
    constructor(database, mevEfficiencyMetrics) {
        super();
        this.db = database;
        this.mevMetrics = mevEfficiencyMetrics;
        this.rankings = new Map();
        this.rankingConfig = this.getDefaultRankingConfig();
        this.updateInterval = null;
    }

    /**
     * Get default ranking configuration
     */
    getDefaultRankingConfig() {
        return {
            // Ranking criteria weights (must sum to 100)
            weights: {
                performance: 25,      // Epoch rewards and consistency
                efficiency: 20,       // Stake efficiency and optimization
                reliability: 15,      // Uptime and commission stability
                mev_capability: 20,   // MEV capture and bundle success
                risk_metrics: 10,     // Risk-adjusted performance
                network_impact: 10    // Network contribution and stake size
            },
            
            // Ranking periods
            periods: {
                daily: { epochs: 1, weight: 0.4 },
                weekly: { epochs: 7, weight: 0.4 },
                monthly: { epochs: 30, weight: 0.2 }
            },
            
            // Minimum requirements for ranking inclusion
            minimumRequirements: {
                minEpochs: 5,           // Minimum epochs of data
                minStake: 1000,         // Minimum stake amount in SOL
                maxCommission: 0.20     // Maximum commission rate (20%)
            }
        };
    }

    /**
     * Start periodic ranking updates
     */
    async startRankingUpdates(intervalMs = 600000) { // 10 minutes
        console.log('Starting validator ranking system...');
        
        // Initial ranking calculation
        await this.updateAllRankings();
        
        // Set up periodic updates
        this.updateInterval = setInterval(async () => {
            try {
                await this.updateAllRankings();
            } catch (error) {
                console.error('Error in periodic ranking update:', error);
                this.emit('error', error);
            }
        }, intervalMs);
        
        this.emit('started', { interval: intervalMs });
    }

    /**
     * Stop ranking updates
     */
    stopRankingUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('Validator ranking system stopped');
        this.emit('stopped');
    }

    /**
     * Update all validator rankings
     */
    async updateAllRankings() {
        try {
            console.log('Updating validator rankings...');
            
            // Get eligible validators
            const validators = await this.getEligibleValidators();
            console.log(`Found ${validators.length} eligible validators`);
            
            // Calculate rankings for different categories
            const rankings = {
                overall: await this.calculateOverallRanking(validators),
                performance: await this.calculatePerformanceRanking(validators),
                efficiency: await this.calculateEfficiencyRanking(validators),
                mev: await this.calculateMEVRanking(validators),
                reliability: await this.calculateReliabilityRanking(validators),
                jito_only: await this.calculateJitoOnlyRanking(validators),
                regular_only: await this.calculateRegularOnlyRanking(validators)
            };
            
            // Store rankings in database
            await this.storeRankings(rankings);
            
            // Update cache
            this.rankings = rankings;
            
            this.emit('rankingsUpdated', {
                timestamp: new Date(),
                validatorCount: validators.length,
                categories: Object.keys(rankings)
            });
            
            return rankings;
        } catch (error) {
            console.error('Error updating validator rankings:', error);
            throw error;
        }
    }

    /**
     * Calculate overall validator ranking
     */
    async calculateOverallRanking(validators) {
        const scoredValidators = [];
        
        for (const validator of validators) {
            const score = await this.calculateOverallScore(validator);
            scoredValidators.push({
                ...validator,
                overall_score: score.total,
                score_breakdown: score.breakdown
            });
        }
        
        // Sort by overall score (descending)
        scoredValidators.sort((a, b) => b.overall_score - a.overall_score);
        
        // Add ranking positions
        return scoredValidators.map((validator, index) => ({
            ...validator,
            rank: index + 1,
            percentile: Math.round((1 - index / scoredValidators.length) * 100)
        }));
    }

    /**
     * Calculate comprehensive overall score for a validator
     */
    async calculateOverallScore(validator) {
        const weights = this.rankingConfig.weights;
        const breakdown = {};
        
        // Get validator data for different periods
        const data = await this.getValidatorMultiPeriodData(validator.validator_address);
        
        // Performance Score (25%)
        breakdown.performance = await this.calculatePerformanceScore(data);
        
        // Efficiency Score (20%)
        breakdown.efficiency = await this.calculateEfficiencyScore(data);
        
        // Reliability Score (15%)
        breakdown.reliability = await this.calculateReliabilityScore(data);
        
        // MEV Capability Score (20%)
        breakdown.mev_capability = await this.calculateMEVCapabilityScore(data);
        
        // Risk Metrics Score (10%)
        breakdown.risk_metrics = await this.calculateRiskMetricsScore(data);
        
        // Network Impact Score (10%)
        breakdown.network_impact = await this.calculateNetworkImpactScore(data);
        
        // Calculate weighted total
        const total = Object.entries(breakdown).reduce((sum, [category, score]) => {
            const weight = weights[category] || 0;
            return sum + (score * weight / 100);
        }, 0);
        
        return {
            total: Math.round(total * 100) / 100,
            breakdown
        };
    }

    /**
     * Calculate performance-based ranking
     */
    async calculatePerformanceRanking(validators) {
        const scoredValidators = [];
        
        for (const validator of validators) {
            const data = await this.getValidatorMultiPeriodData(validator.validator_address);
            const score = await this.calculatePerformanceScore(data);
            
            scoredValidators.push({
                ...validator,
                performance_score: score
            });
        }
        
        return this.sortAndRankValidators(scoredValidators, 'performance_score');
    }

    /**
     * Calculate efficiency-based ranking
     */
    async calculateEfficiencyRanking(validators) {
        const scoredValidators = [];
        
        for (const validator of validators) {
            const data = await this.getValidatorMultiPeriodData(validator.validator_address);
            const score = await this.calculateEfficiencyScore(data);
            
            scoredValidators.push({
                ...validator,
                efficiency_score: score
            });
        }
        
        return this.sortAndRankValidators(scoredValidators, 'efficiency_score');
    }

    /**
     * Calculate MEV-specific ranking
     */
    async calculateMEVRanking(validators) {
        const scoredValidators = [];
        
        for (const validator of validators) {
            const data = await this.getValidatorMultiPeriodData(validator.validator_address);
            const score = await this.calculateMEVCapabilityScore(data);
            
            scoredValidators.push({
                ...validator,
                mev_score: score
            });
        }
        
        return this.sortAndRankValidators(scoredValidators, 'mev_score');
    }

    /**
     * Calculate reliability-based ranking
     */
    async calculateReliabilityRanking(validators) {
        const scoredValidators = [];
        
        for (const validator of validators) {
            const data = await this.getValidatorMultiPeriodData(validator.validator_address);
            const score = await this.calculateReliabilityScore(data);
            
            scoredValidators.push({
                ...validator,
                reliability_score: score
            });
        }
        
        return this.sortAndRankValidators(scoredValidators, 'reliability_score');
    }

    /**
     * Calculate Jito-only validator ranking
     */
    async calculateJitoOnlyRanking(validators) {
        const jitoValidators = validators.filter(v => v.is_jito_enabled);
        return await this.calculateOverallRanking(jitoValidators);
    }

    /**
     * Calculate regular validator ranking
     */
    async calculateRegularOnlyRanking(validators) {
        const regularValidators = validators.filter(v => !v.is_jito_enabled);
        return await this.calculateOverallRanking(regularValidators);
    }

    // Scoring methods
    async calculatePerformanceScore(data) {
        const periods = this.rankingConfig.periods;
        let weightedScore = 0;
        
        for (const [period, config] of Object.entries(periods)) {
            const periodData = data[period] || [];
            if (periodData.length === 0) continue;
            
            // Average rewards per epoch
            const avgRewards = periodData.reduce((sum, d) => sum + d.epoch_rewards, 0) / periodData.length;
            
            // Reward consistency
            const rewardStdDev = this.calculateStandardDeviation(periodData.map(d => d.epoch_rewards));
            const consistency = avgRewards > 0 ? 1 - (rewardStdDev / avgRewards) : 0;
            
            // Growth trend
            const growth = this.calculateGrowthTrend(periodData.map(d => d.epoch_rewards));
            
            // Period score (normalized to 0-100)
            const periodScore = Math.min(100, Math.max(0, 
                (avgRewards / 1000 * 50) +           // Base performance (50 points max)
                (Math.max(0, consistency) * 30) +    // Consistency (30 points max)
                (Math.max(0, growth + 0.5) * 20)     // Growth trend (20 points max)
            ));
            
            weightedScore += periodScore * config.weight;
        }
        
        return Math.round(weightedScore * 100) / 100;
    }

    async calculateEfficiencyScore(data) {
        const periods = this.rankingConfig.periods;
        let weightedScore = 0;
        
        for (const [period, config] of Object.entries(periods)) {
            const periodData = data[period] || [];
            if (periodData.length === 0) continue;
            
            // Stake efficiency
            const avgRewards = periodData.reduce((sum, d) => sum + d.epoch_rewards, 0) / periodData.length;
            const avgStake = periodData.reduce((sum, d) => sum + d.stake_amount, 0) / periodData.length;
            const stakeEfficiency = avgStake > 0 ? avgRewards / avgStake : 0;
            
            // Commission optimization
            const avgCommission = periodData.reduce((sum, d) => sum + d.commission_rate, 0) / periodData.length;
            const commissionScore = this.calculateCommissionScore(avgCommission);
            
            // Resource utilization (mock calculation)
            const resourceScore = Math.min(100, stakeEfficiency * 10000);
            
            const periodScore = Math.min(100, Math.max(0,
                resourceScore * 0.5 +        // Resource efficiency (50%)
                commissionScore * 0.3 +      // Commission optimization (30%)
                Math.min(100, avgRewards / 10) * 0.2  // Absolute performance (20%)
            ));
            
            weightedScore += periodScore * config.weight;
        }
        
        return Math.round(weightedScore * 100) / 100;
    }

    async calculateMEVCapabilityScore(data) {
        if (!data.daily || data.daily.length === 0) return 0;
        
        // Get MEV efficiency metrics
        const validator = data.daily[0];
        const mevMetrics = await this.mevMetrics.getValidatorMEVEfficiency(validator.validator_address);
        
        if (!mevMetrics || !validator.is_jito_enabled) return 0;
        
        // MEV-specific scoring
        const mevScore = Math.min(100, Math.max(0,
            mevMetrics.mev_capture_rate * 30 +           // MEV capture (30%)
            mevMetrics.bundle_success_rate * 25 +        // Bundle success (25%)
            mevMetrics.mev_consistency_score * 20 +      // Consistency (20%)
            Math.min(100, mevMetrics.mev_efficiency_ratio * 100) * 15 + // Efficiency ratio (15%)
            Math.min(100, mevMetrics.avg_bundle_value / 1000) * 10     // Bundle value (10%)
        ));
        
        return Math.round(mevScore * 100) / 100;
    }

    async calculateReliabilityScore(data) {
        const periods = this.rankingConfig.periods;
        let weightedScore = 0;
        
        for (const [period, config] of Object.entries(periods)) {
            const periodData = data[period] || [];
            if (periodData.length === 0) continue;
            
            // Uptime score (based on consistent epoch participation)
            const expectedEpochs = config.epochs;
            const actualEpochs = periodData.length;
            const uptimeScore = Math.min(100, (actualEpochs / expectedEpochs) * 100);
            
            // Commission stability
            const commissions = periodData.map(d => d.commission_rate);
            const commissionStability = this.calculateStabilityScore(commissions);
            
            // Performance consistency
            const rewards = periodData.map(d => d.epoch_rewards);
            const performanceStability = this.calculateStabilityScore(rewards);
            
            const periodScore = Math.min(100, Math.max(0,
                uptimeScore * 0.4 +              // Uptime (40%)
                commissionStability * 0.3 +      // Commission stability (30%)
                performanceStability * 0.3       // Performance stability (30%)
            ));
            
            weightedScore += periodScore * config.weight;
        }
        
        return Math.round(weightedScore * 100) / 100;
    }

    async calculateRiskMetricsScore(data) {
        if (!data.daily || data.daily.length === 0) return 0;
        
        const validator = data.daily[0];
        const mevMetrics = await this.mevMetrics.getValidatorMEVEfficiency(validator.validator_address);
        
        if (!mevMetrics) return 50; // Default score for validators without MEV metrics
        
        // Risk-adjusted scoring (higher is better)
        const riskScore = Math.min(100, Math.max(0,
            Math.max(0, 100 - mevMetrics.reward_volatility * 1000) * 0.3 +  // Low volatility (30%)
            Math.min(100, (mevMetrics.sharpe_ratio + 2) / 6 * 100) * 0.3 + // Good Sharpe ratio (30%)
            Math.max(0, 100 - mevMetrics.max_drawdown * 100) * 0.2 +       // Low drawdown (20%)
            Math.min(100, mevMetrics.risk_adjusted_return / 10) * 0.2       // Risk-adjusted return (20%)
        ));
        
        return Math.round(riskScore * 100) / 100;
    }

    async calculateNetworkImpactScore(data) {
        if (!data.daily || data.daily.length === 0) return 0;
        
        const avgStake = data.daily.reduce((sum, d) => sum + d.stake_amount, 0) / data.daily.length;
        const avgRewards = data.daily.reduce((sum, d) => sum + d.epoch_rewards, 0) / data.daily.length;
        
        // Get network totals for comparison
        const networkTotals = await this.getNetworkTotals();
        
        // Network impact scoring
        const stakeShare = networkTotals.total_stake > 0 ? avgStake / networkTotals.total_stake : 0;
        const rewardShare = networkTotals.total_rewards > 0 ? avgRewards / networkTotals.total_rewards : 0;
        
        const impactScore = Math.min(100, Math.max(0,
            Math.min(100, stakeShare * 10000) * 0.6 +    // Stake impact (60%)
            Math.min(100, rewardShare * 10000) * 0.4     // Reward impact (40%)
        ));
        
        return Math.round(impactScore * 100) / 100;
    }

    // Helper methods
    async getEligibleValidators() {
        const requirements = this.rankingConfig.minimumRequirements;
        
        const query = `
            SELECT DISTINCT 
                vp.validator_address,
                vp.is_jito_enabled,
                COUNT(*) as epoch_count,
                AVG(vp.stake_amount) as avg_stake,
                AVG(vp.commission_rate) as avg_commission
            FROM validator_performance vp
            WHERE vp.timestamp > NOW() - INTERVAL '30 days'
            GROUP BY vp.validator_address, vp.is_jito_enabled
            HAVING 
                COUNT(*) >= $1 
                AND AVG(vp.stake_amount) >= $2 
                AND AVG(vp.commission_rate) <= $3
            ORDER BY avg_stake DESC
        `;
        
        const result = await this.db.query(query, [
            requirements.minEpochs,
            requirements.minStake,
            requirements.maxCommission
        ]);
        
        return result.rows;
    }

    async getValidatorMultiPeriodData(validatorAddress) {
        const data = {};
        
        for (const [period, config] of Object.entries(this.rankingConfig.periods)) {
            const query = `
                SELECT * FROM validator_performance 
                WHERE validator_address = $1 
                AND timestamp > NOW() - INTERVAL '${config.epochs} days'
                ORDER BY epoch DESC
                LIMIT $2
            `;
            
            const result = await this.db.query(query, [validatorAddress, config.epochs]);
            data[period] = result.rows;
        }
        
        return data;
    }

    async getNetworkTotals() {
        const query = `
            SELECT 
                SUM(stake_amount) as total_stake,
                SUM(epoch_rewards) as total_rewards
            FROM validator_performance 
            WHERE timestamp > NOW() - INTERVAL '1 day'
        `;
        
        const result = await this.db.query(query);
        return result.rows[0] || { total_stake: 0, total_rewards: 0 };
    }

    sortAndRankValidators(validators, scoreField) {
        validators.sort((a, b) => b[scoreField] - a[scoreField]);
        
        return validators.map((validator, index) => ({
            ...validator,
            rank: index + 1,
            percentile: Math.round((1 - index / validators.length) * 100)
        }));
    }

    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    calculateGrowthTrend(values) {
        if (values.length < 2) return 0;
        
        // Simple linear regression slope
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const meanX = (n - 1) / 2;
        const meanY = values.reduce((sum, val) => sum + val, 0) / n;
        
        const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (values[i] - meanY), 0);
        const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0);
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    calculateStabilityScore(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const cv = mean > 0 ? this.calculateStandardDeviation(values) / mean : 0;
        return Math.max(0, Math.min(100, (1 - cv) * 100));
    }

    calculateCommissionScore(commission) {
        // Optimal commission range: 5-8%
        const optimal = 0.065;
        const tolerance = 0.03;
        const deviation = Math.abs(commission - optimal);
        return Math.max(0, Math.min(100, (1 - deviation / tolerance) * 100));
    }

    async storeRankings(rankings) {
        const timestamp = new Date();
        
        for (const [category, validators] of Object.entries(rankings)) {
            for (const validator of validators) {
                const query = `
                    INSERT INTO validator_rankings (
                        validator_address, category, rank, percentile, score, 
                        score_breakdown, timestamp, is_jito_enabled
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (validator_address, category, DATE(timestamp))
                    DO UPDATE SET
                        rank = EXCLUDED.rank,
                        percentile = EXCLUDED.percentile,
                        score = EXCLUDED.score,
                        score_breakdown = EXCLUDED.score_breakdown,
                        timestamp = EXCLUDED.timestamp
                `;
                
                await this.db.query(query, [
                    validator.validator_address,
                    category,
                    validator.rank,
                    validator.percentile,
                    validator.overall_score || validator[`${category}_score`] || 0,
                    JSON.stringify(validator.score_breakdown || {}),
                    timestamp,
                    validator.is_jito_enabled
                ]);
            }
        }
    }

    // Public API methods
    async getValidatorRanking(validatorAddress, category = 'overall') {
        if (this.rankings.has(category)) {
            return this.rankings.get(category).find(v => v.validator_address === validatorAddress);
        }
        
        const query = `
            SELECT * FROM validator_rankings 
            WHERE validator_address = $1 AND category = $2
            ORDER BY timestamp DESC LIMIT 1
        `;
        
        const result = await this.db.query(query, [validatorAddress, category]);
        return result.rows[0] || null;
    }

    async getTopValidators(category = 'overall', limit = 50, jitoOnly = null) {
        let validators = this.rankings.get(category) || [];
        
        if (jitoOnly !== null) {
            validators = validators.filter(v => v.is_jito_enabled === jitoOnly);
        }
        
        return validators.slice(0, limit);
    }

    async getValidatorsByScore(category = 'overall', minScore = 0, maxScore = 100) {
        const validators = this.rankings.get(category) || [];
        const scoreField = category === 'overall' ? 'overall_score' : `${category}_score`;
        
        return validators.filter(v => {
            const score = v[scoreField] || 0;
            return score >= minScore && score <= maxScore;
        });
    }
}

module.exports = ValidatorRankingSystem;