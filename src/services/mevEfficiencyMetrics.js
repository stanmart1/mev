const EventEmitter = require('events');

/**
 * MEV Efficiency Metrics Calculator
 * Calculates comprehensive MEV efficiency metrics for validators
 */
class MEVEfficiencyMetrics extends EventEmitter {
    constructor(database, solanaConnection) {
        super();
        this.db = database;
        this.connection = solanaConnection;
        this.metricsCache = new Map();
        this.calculationInterval = null;
    }

    /**
     * Start continuous MEV efficiency calculation
     */
    async startMetricsCalculation(intervalMs = 300000) { // 5 minutes
        console.log('Starting MEV efficiency metrics calculation...');
        
        // Initial calculation
        await this.calculateAllValidatorEfficiency();
        
        // Set up periodic calculation
        this.calculationInterval = setInterval(async () => {
            try {
                await this.calculateAllValidatorEfficiency();
            } catch (error) {
                console.error('Error in periodic MEV metrics calculation:', error);
                this.emit('error', error);
            }
        }, intervalMs);
        
        this.emit('started', { interval: intervalMs });
    }

    /**
     * Stop metrics calculation
     */
    stopMetricsCalculation() {
        if (this.calculationInterval) {
            clearInterval(this.calculationInterval);
            this.calculationInterval = null;
        }
        console.log('MEV efficiency metrics calculation stopped');
        this.emit('stopped');
    }

    /**
     * Calculate MEV efficiency for all validators
     */
    async calculateAllValidatorEfficiency() {
        try {
            const validators = await this.getActiveValidators();
            const results = [];

            for (const validator of validators) {
                const efficiency = await this.calculateValidatorMEVEfficiency(validator);
                results.push(efficiency);
                
                // Update cache
                this.metricsCache.set(validator.validator_address, efficiency);
                
                // Store in database
                await this.storeMEVEfficiencyMetrics(efficiency);
            }

            this.emit('metricsCalculated', {
                timestamp: new Date(),
                validatorCount: results.length,
                averageEfficiency: this.calculateAverageEfficiency(results)
            });

            return results;
        } catch (error) {
            console.error('Error calculating validator MEV efficiency:', error);
            throw error;
        }
    }

    /**
     * Calculate comprehensive MEV efficiency metrics for a single validator
     */
    async calculateValidatorMEVEfficiency(validator) {
        const validatorAddress = validator.validator_address;
        const currentEpoch = await this.getCurrentEpoch();
        
        // Get validator data for the last 10 epochs
        const historicalData = await this.getValidatorHistoricalData(validatorAddress, 10);
        
        // Calculate base metrics
        const baseMetrics = await this.calculateBaseEfficiencyMetrics(validator, historicalData);
        
        // Calculate MEV-specific metrics
        const mevMetrics = await this.calculateMEVSpecificMetrics(validator, historicalData);
        
        // Calculate comparative metrics
        const comparativeMetrics = await this.calculateComparativeMetrics(validator, historicalData);
        
        // Calculate risk-adjusted metrics
        const riskAdjustedMetrics = await this.calculateRiskAdjustedMetrics(validator, historicalData);
        
        return {
            validator_address: validatorAddress,
            epoch: currentEpoch,
            timestamp: new Date(),
            is_jito_enabled: validator.is_jito_enabled,
            
            // Base efficiency metrics
            ...baseMetrics,
            
            // MEV-specific metrics
            ...mevMetrics,
            
            // Comparative metrics
            ...comparativeMetrics,
            
            // Risk-adjusted metrics
            ...riskAdjustedMetrics,
            
            // Overall efficiency score
            overall_efficiency_score: this.calculateOverallEfficiencyScore({
                ...baseMetrics,
                ...mevMetrics,
                ...comparativeMetrics,
                ...riskAdjustedMetrics
            })
        };
    }

    /**
     * Calculate base efficiency metrics
     */
    async calculateBaseEfficiencyMetrics(validator, historicalData) {
        const recentData = historicalData.slice(-5); // Last 5 epochs
        
        // Average rewards per epoch
        const avgRewardsPerEpoch = recentData.reduce((sum, data) => sum + data.epoch_rewards, 0) / recentData.length;
        
        // Reward consistency (lower coefficient of variation is better)
        const rewardVariance = this.calculateVariance(recentData.map(d => d.epoch_rewards));
        const rewardStdDev = Math.sqrt(rewardVariance);
        const rewardConsistency = avgRewardsPerEpoch > 0 ? 1 - (rewardStdDev / avgRewardsPerEpoch) : 0;
        
        // Stake efficiency (rewards per SOL staked)
        const avgStake = recentData.reduce((sum, data) => sum + data.stake_amount, 0) / recentData.length;
        const stakeEfficiency = avgStake > 0 ? avgRewardsPerEpoch / avgStake : 0;
        
        // Commission optimization score
        const avgCommission = recentData.reduce((sum, data) => sum + data.commission_rate, 0) / recentData.length;
        const commissionOptimization = this.calculateCommissionOptimization(avgCommission, avgRewardsPerEpoch);
        
        return {
            avg_rewards_per_epoch: avgRewardsPerEpoch,
            reward_consistency_score: Math.max(0, Math.min(1, rewardConsistency)),
            stake_efficiency_ratio: stakeEfficiency,
            commission_optimization_score: commissionOptimization,
            avg_commission_rate: avgCommission,
            avg_stake_amount: avgStake
        };
    }

    /**
     * Calculate MEV-specific efficiency metrics
     */
    async calculateMEVSpecificMetrics(validator, historicalData) {
        if (!validator.is_jito_enabled) {
            return {
                mev_capture_rate: 0,
                mev_revenue_per_epoch: 0,
                mev_efficiency_ratio: 0,
                bundle_success_rate: 0,
                avg_bundle_value: 0,
                mev_consistency_score: 0
            };
        }

        // Get MEV-specific data
        const mevData = await this.getMEVDataForValidator(validator.validator_address, 10);
        
        if (mevData.length === 0) {
            return {
                mev_capture_rate: 0,
                mev_revenue_per_epoch: 0,
                mev_efficiency_ratio: 0,
                bundle_success_rate: 0,
                avg_bundle_value: 0,
                mev_consistency_score: 0
            };
        }

        // Calculate MEV capture rate (percentage of available MEV captured)
        const totalMEVOpportunities = await this.getTotalMEVOpportunities(10);
        const capturedMEV = mevData.reduce((sum, data) => sum + data.mev_revenue, 0);
        const mevCaptureRate = totalMEVOpportunities > 0 ? capturedMEV / totalMEVOpportunities : 0;
        
        // MEV revenue per epoch
        const mevRevenuePerEpoch = capturedMEV / Math.max(mevData.length, 1);
        
        // Bundle success rate
        const totalBundles = mevData.reduce((sum, data) => sum + data.bundles_processed, 0);
        const successfulBundles = mevData.reduce((sum, data) => sum + data.successful_bundles, 0);
        const bundleSuccessRate = totalBundles > 0 ? successfulBundles / totalBundles : 0;
        
        // Average bundle value
        const avgBundleValue = successfulBundles > 0 ? capturedMEV / successfulBundles : 0;
        
        // MEV efficiency ratio (MEV revenue vs base rewards)
        const baseRewards = historicalData.reduce((sum, data) => sum + data.epoch_rewards, 0);
        const mevEfficiencyRatio = baseRewards > 0 ? capturedMEV / baseRewards : 0;
        
        // MEV consistency score
        const mevRevenues = mevData.map(d => d.mev_revenue);
        const mevVariance = this.calculateVariance(mevRevenues);
        const mevStdDev = Math.sqrt(mevVariance);
        const mevConsistency = mevRevenuePerEpoch > 0 ? 1 - (mevStdDev / mevRevenuePerEpoch) : 0;
        
        return {
            mev_capture_rate: Math.max(0, Math.min(1, mevCaptureRate)),
            mev_revenue_per_epoch: mevRevenuePerEpoch,
            mev_efficiency_ratio: mevEfficiencyRatio,
            bundle_success_rate: Math.max(0, Math.min(1, bundleSuccessRate)),
            avg_bundle_value: avgBundleValue,
            mev_consistency_score: Math.max(0, Math.min(1, mevConsistency))
        };
    }

    /**
     * Calculate comparative efficiency metrics
     */
    async calculateComparativeMetrics(validator, historicalData) {
        // Get network averages for comparison
        const networkAverages = await this.getNetworkAverageMetrics();
        const jitoAverages = await this.getJitoValidatorAverages();
        const regularAverages = await this.getRegularValidatorAverages();
        
        const validatorAvgRewards = historicalData.reduce((sum, data) => sum + data.epoch_rewards, 0) / historicalData.length;
        const validatorAvgStake = historicalData.reduce((sum, data) => sum + data.stake_amount, 0) / historicalData.length;
        
        // Performance relative to network average
        const networkPerformanceRatio = networkAverages.avg_rewards > 0 ? 
            validatorAvgRewards / networkAverages.avg_rewards : 0;
        
        // Performance relative to validator type average
        const typeAverages = validator.is_jito_enabled ? jitoAverages : regularAverages;
        const typePerformanceRatio = typeAverages.avg_rewards > 0 ? 
            validatorAvgRewards / typeAverages.avg_rewards : 0;
        
        // Rank within validator type
        const rank = await this.getValidatorRankWithinType(validator.validator_address, validator.is_jito_enabled);
        
        return {
            network_performance_ratio: networkPerformanceRatio,
            type_performance_ratio: typePerformanceRatio,
            network_rank: rank.network_rank,
            type_rank: rank.type_rank,
            percentile_rank: rank.percentile_rank
        };
    }

    /**
     * Calculate risk-adjusted efficiency metrics
     */
    async calculateRiskAdjustedMetrics(validator, historicalData) {
        // Calculate reward volatility (risk measure)
        const rewards = historicalData.map(d => d.epoch_rewards);
        const rewardVolatility = this.calculateVolatility(rewards);
        
        // Calculate Sharpe-like ratio (excess return per unit of risk)
        const avgRewards = rewards.reduce((sum, r) => sum + r, 0) / rewards.length;
        const riskFreeRate = await this.getRiskFreeRate(); // Base network reward rate
        const excessReturn = avgRewards - riskFreeRate;
        const sharpeRatio = rewardVolatility > 0 ? excessReturn / rewardVolatility : 0;
        
        // Calculate maximum drawdown
        const maxDrawdown = this.calculateMaxDrawdown(rewards);
        
        // Calculate Value at Risk (VaR) at 95% confidence level
        const sortedRewards = [...rewards].sort((a, b) => a - b);
        const varIndex = Math.floor(sortedRewards.length * 0.05);
        const valueAtRisk = sortedRewards[varIndex] || 0;
        
        // Risk-adjusted return
        const riskAdjustedReturn = maxDrawdown !== 0 ? avgRewards / Math.abs(maxDrawdown) : avgRewards;
        
        return {
            reward_volatility: rewardVolatility,
            sharpe_ratio: sharpeRatio,
            max_drawdown: maxDrawdown,
            value_at_risk_95: valueAtRisk,
            risk_adjusted_return: riskAdjustedReturn
        };
    }

    /**
     * Calculate overall efficiency score (0-100)
     */
    calculateOverallEfficiencyScore(metrics) {
        const weights = {
            // Base metrics (30%)
            reward_consistency_score: 0.10,
            stake_efficiency_ratio: 0.10,
            commission_optimization_score: 0.10,
            
            // MEV metrics (25%)
            mev_capture_rate: 0.08,
            bundle_success_rate: 0.08,
            mev_consistency_score: 0.09,
            
            // Comparative metrics (25%)
            network_performance_ratio: 0.10,
            type_performance_ratio: 0.15,
            
            // Risk-adjusted metrics (20%)
            sharpe_ratio: 0.10,
            risk_adjusted_return: 0.10
        };
        
        let score = 0;
        let totalWeight = 0;
        
        for (const [metric, weight] of Object.entries(weights)) {
            if (metrics[metric] !== undefined && metrics[metric] !== null) {
                let normalizedValue = this.normalizeMetricValue(metric, metrics[metric]);
                score += normalizedValue * weight;
                totalWeight += weight;
            }
        }
        
        return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
    }

    /**
     * Normalize metric values to 0-1 scale
     */
    normalizeMetricValue(metric, value) {
        switch (metric) {
            case 'reward_consistency_score':
            case 'commission_optimization_score':
            case 'mev_capture_rate':
            case 'bundle_success_rate':
            case 'mev_consistency_score':
                return Math.max(0, Math.min(1, value));
            
            case 'stake_efficiency_ratio':
                // Normalize based on typical range (0-0.001)
                return Math.max(0, Math.min(1, value * 1000));
            
            case 'network_performance_ratio':
            case 'type_performance_ratio':
                // Values around 1.0 are good, cap at 2.0
                return Math.max(0, Math.min(1, value / 2));
            
            case 'sharpe_ratio':
                // Normalize Sharpe ratio (typically -2 to 4)
                return Math.max(0, Math.min(1, (value + 2) / 6));
            
            case 'risk_adjusted_return':
                // Normalize based on typical range
                return Math.max(0, Math.min(1, value / 1000));
            
            default:
                return Math.max(0, Math.min(1, value));
        }
    }

    /**
     * Get MEV efficiency metrics for a validator
     */
    async getValidatorMEVEfficiency(validatorAddress) {
        return this.metricsCache.get(validatorAddress) || null;
    }

    /**
     * Get top validators by MEV efficiency
     */
    async getTopValidatorsByMEVEfficiency(limit = 50, jitoOnly = false) {
        try {
            const query = `
                SELECT * FROM mev_efficiency_metrics 
                WHERE timestamp > NOW() - INTERVAL '1 hour'
                ${jitoOnly ? 'AND is_jito_enabled = true' : ''}
                ORDER BY overall_efficiency_score DESC
                LIMIT $1
            `;
            
            const result = await this.db.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('Error getting top validators by MEV efficiency:', error);
            throw error;
        }
    }

    // Helper methods
    async getActiveValidators() {
        const query = `
            SELECT DISTINCT validator_address, is_jito_enabled 
            FROM validator_performance 
            WHERE timestamp > NOW() - INTERVAL '1 day'
        `;
        const result = await this.db.query(query);
        return result.rows;
    }

    async getCurrentEpoch() {
        const epochInfo = await this.connection.getEpochInfo();
        return epochInfo.epoch;
    }

    async getValidatorHistoricalData(validatorAddress, epochCount) {
        const query = `
            SELECT * FROM validator_performance 
            WHERE validator_address = $1 
            ORDER BY epoch DESC 
            LIMIT $2
        `;
        const result = await this.db.query(query, [validatorAddress, epochCount]);
        return result.rows.reverse(); // Return in chronological order
    }

    async getMEVDataForValidator(validatorAddress, epochCount) {
        // This would typically query MEV-specific tables
        // For now, return mock data structure
        return [];
    }

    async getTotalMEVOpportunities(epochCount) {
        // This would query total MEV opportunities in the network
        return 1000000; // Mock value
    }

    async getNetworkAverageMetrics() {
        const query = `
            SELECT AVG(epoch_rewards) as avg_rewards,
                   AVG(stake_amount) as avg_stake
            FROM validator_performance 
            WHERE timestamp > NOW() - INTERVAL '1 day'
        `;
        const result = await this.db.query(query);
        return result.rows[0] || { avg_rewards: 0, avg_stake: 0 };
    }

    async getJitoValidatorAverages() {
        const query = `
            SELECT AVG(epoch_rewards) as avg_rewards,
                   AVG(stake_amount) as avg_stake
            FROM validator_performance 
            WHERE is_jito_enabled = true 
            AND timestamp > NOW() - INTERVAL '1 day'
        `;
        const result = await this.db.query(query);
        return result.rows[0] || { avg_rewards: 0, avg_stake: 0 };
    }

    async getRegularValidatorAverages() {
        const query = `
            SELECT AVG(epoch_rewards) as avg_rewards,
                   AVG(stake_amount) as avg_stake
            FROM validator_performance 
            WHERE is_jito_enabled = false 
            AND timestamp > NOW() - INTERVAL '1 day'
        `;
        const result = await this.db.query(query);
        return result.rows[0] || { avg_rewards: 0, avg_stake: 0 };
    }

    async getValidatorRankWithinType(validatorAddress, isJitoEnabled) {
        // Get network rank
        const networkRankQuery = `
            WITH ranked_validators AS (
                SELECT validator_address,
                       ROW_NUMBER() OVER (ORDER BY epoch_rewards DESC) as rank
                FROM validator_performance 
                WHERE timestamp > NOW() - INTERVAL '1 day'
            )
            SELECT rank as network_rank FROM ranked_validators 
            WHERE validator_address = $1
        `;
        
        // Get type rank
        const typeRankQuery = `
            WITH ranked_validators AS (
                SELECT validator_address,
                       ROW_NUMBER() OVER (ORDER BY epoch_rewards DESC) as rank
                FROM validator_performance 
                WHERE is_jito_enabled = $1 
                AND timestamp > NOW() - INTERVAL '1 day'
            )
            SELECT rank as type_rank FROM ranked_validators 
            WHERE validator_address = $2
        `;
        
        const [networkResult, typeResult] = await Promise.all([
            this.db.query(networkRankQuery, [validatorAddress]),
            this.db.query(typeRankQuery, [isJitoEnabled, validatorAddress])
        ]);
        
        const networkRank = networkResult.rows[0]?.network_rank || 0;
        const typeRank = typeResult.rows[0]?.type_rank || 0;
        
        // Calculate percentile rank (higher percentile = better performance)
        const totalValidators = await this.getTotalValidatorCount();
        const percentileRank = totalValidators > 0 ? 100 - ((networkRank - 1) / totalValidators * 100) : 0;
        
        return {
            network_rank: networkRank,
            type_rank: typeRank,
            percentile_rank: Math.round(percentileRank)
        };
    }

    async getTotalValidatorCount() {
        const query = `
            SELECT COUNT(DISTINCT validator_address) as total 
            FROM validator_performance 
            WHERE timestamp > NOW() - INTERVAL '1 day'
        `;
        const result = await this.db.query(query);
        return result.rows[0]?.total || 0;
    }

    async getRiskFreeRate() {
        // Calculate base network reward rate as risk-free rate
        const query = `
            SELECT AVG(epoch_rewards) as avg_rewards
            FROM validator_performance 
            WHERE timestamp > NOW() - INTERVAL '7 days'
        `;
        const result = await this.db.query(query);
        return result.rows[0]?.avg_rewards * 0.5 || 0; // 50% of average as risk-free
    }

    async storeMEVEfficiencyMetrics(metrics) {
        const query = `
            INSERT INTO mev_efficiency_metrics (
                validator_address, epoch, timestamp, is_jito_enabled,
                avg_rewards_per_epoch, reward_consistency_score, stake_efficiency_ratio,
                commission_optimization_score, avg_commission_rate, avg_stake_amount,
                mev_capture_rate, mev_revenue_per_epoch, mev_efficiency_ratio,
                bundle_success_rate, avg_bundle_value, mev_consistency_score,
                network_performance_ratio, type_performance_ratio, network_rank,
                type_rank, percentile_rank, reward_volatility, sharpe_ratio,
                max_drawdown, value_at_risk_95, risk_adjusted_return,
                overall_efficiency_score
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
            )
            ON CONFLICT (validator_address, epoch) 
            DO UPDATE SET
                timestamp = EXCLUDED.timestamp,
                avg_rewards_per_epoch = EXCLUDED.avg_rewards_per_epoch,
                reward_consistency_score = EXCLUDED.reward_consistency_score,
                stake_efficiency_ratio = EXCLUDED.stake_efficiency_ratio,
                commission_optimization_score = EXCLUDED.commission_optimization_score,
                avg_commission_rate = EXCLUDED.avg_commission_rate,
                avg_stake_amount = EXCLUDED.avg_stake_amount,
                mev_capture_rate = EXCLUDED.mev_capture_rate,
                mev_revenue_per_epoch = EXCLUDED.mev_revenue_per_epoch,
                mev_efficiency_ratio = EXCLUDED.mev_efficiency_ratio,
                bundle_success_rate = EXCLUDED.bundle_success_rate,
                avg_bundle_value = EXCLUDED.avg_bundle_value,
                mev_consistency_score = EXCLUDED.mev_consistency_score,
                network_performance_ratio = EXCLUDED.network_performance_ratio,
                type_performance_ratio = EXCLUDED.type_performance_ratio,
                network_rank = EXCLUDED.network_rank,
                type_rank = EXCLUDED.type_rank,
                percentile_rank = EXCLUDED.percentile_rank,
                reward_volatility = EXCLUDED.reward_volatility,
                sharpe_ratio = EXCLUDED.sharpe_ratio,
                max_drawdown = EXCLUDED.max_drawdown,
                value_at_risk_95 = EXCLUDED.value_at_risk_95,
                risk_adjusted_return = EXCLUDED.risk_adjusted_return,
                overall_efficiency_score = EXCLUDED.overall_efficiency_score
        `;
        
        await this.db.query(query, [
            metrics.validator_address, metrics.epoch, metrics.timestamp, metrics.is_jito_enabled,
            metrics.avg_rewards_per_epoch, metrics.reward_consistency_score, metrics.stake_efficiency_ratio,
            metrics.commission_optimization_score, metrics.avg_commission_rate, metrics.avg_stake_amount,
            metrics.mev_capture_rate, metrics.mev_revenue_per_epoch, metrics.mev_efficiency_ratio,
            metrics.bundle_success_rate, metrics.avg_bundle_value, metrics.mev_consistency_score,
            metrics.network_performance_ratio, metrics.type_performance_ratio, metrics.network_rank,
            metrics.type_rank, metrics.percentile_rank, metrics.reward_volatility, metrics.sharpe_ratio,
            metrics.max_drawdown, metrics.value_at_risk_95, metrics.risk_adjusted_return,
            metrics.overall_efficiency_score
        ]);
    }

    // Statistical helper methods
    calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return variance;
    }

    calculateVolatility(values) {
        return Math.sqrt(this.calculateVariance(values));
    }

    calculateMaxDrawdown(values) {
        if (values.length === 0) return 0;
        
        let maxDrawdown = 0;
        let peak = values[0];
        
        for (let i = 1; i < values.length; i++) {
            if (values[i] > peak) {
                peak = values[i];
            } else {
                const drawdown = (peak - values[i]) / peak;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }
        
        return maxDrawdown;
    }

    calculateCommissionOptimization(commission, avgRewards) {
        // Lower commission is generally better, but too low might indicate poor service
        // Optimal range is typically 5-10%
        const optimalCommission = 0.07; // 7%
        const deviation = Math.abs(commission - optimalCommission);
        const maxDeviation = 0.05; // 5% deviation tolerance
        
        return Math.max(0, 1 - (deviation / maxDeviation));
    }

    calculateAverageEfficiency(results) {
        if (results.length === 0) return 0;
        const sum = results.reduce((acc, result) => acc + result.overall_efficiency_score, 0);
        return Math.round(sum / results.length);
    }
}

module.exports = MEVEfficiencyMetrics;