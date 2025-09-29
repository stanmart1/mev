const EventEmitter = require('events');

/**
 * Validator MEV Profiler
 * Creates comprehensive MEV profiles for validators with performance metrics and attribution accuracy
 */
class ValidatorMEVProfiler extends EventEmitter {
    constructor(database, historicalTracker, earningsCalculator) {
        super();
        this.db = database;
        this.historicalTracker = historicalTracker;
        this.earningsCalculator = earningsCalculator;
        
        this.config = {
            profilingWindow: 60,       // 60 epochs for comprehensive profiling
            minDataThreshold: 10,      // Minimum epochs required for profiling
            updateFrequency: 86400000, // 24 hours
            confidenceThreshold: 0.7,  // 70% confidence minimum
        };
    }

    /**
     * Generate comprehensive MEV profile for a validator
     */
    async generateValidatorProfile(validatorAddress) {
        console.log(`Generating MEV profile for validator ${validatorAddress}`);
        
        try {
            // Get historical performance data
            const historicalData = await this.historicalTracker.getValidatorHistoricalPerformance(
                validatorAddress, 
                this.config.profilingWindow
            );
            
            if (historicalData.historical_data.length < this.config.minDataThreshold) {
                return this.createInsufficientDataProfile(validatorAddress);
            }
            
            // Calculate MEV capability assessment
            const capability = this.assessMEVCapability(historicalData.historical_data);
            
            // Analyze performance characteristics
            const characteristics = this.analyzePerformanceCharacteristics(historicalData.historical_data);
            
            // Calculate attribution accuracy
            const attribution = await this.calculateAttributionAccuracy(validatorAddress);
            
            // Perform competitive analysis
            const competitive = await this.performCompetitiveAnalysis(validatorAddress, historicalData);
            
            // Create complete profile
            const profile = {
                validator_address: validatorAddress,
                profile_version: '1.0',
                last_updated: new Date(),
                data_epochs: historicalData.historical_data.length,
                
                ...capability,
                ...characteristics,
                ...attribution,
                ...competitive
            };
            
            // Store profile
            await this.storeValidatorProfile(profile);
            
            return profile;
            
        } catch (error) {
            console.error(`Error generating profile for ${validatorAddress}:`, error);
            throw error;
        }
    }

    /**
     * Assess MEV capability of validator
     */
    assessMEVCapability(historicalData) {
        const totalRevenue = historicalData.reduce((sum, epoch) => sum + parseFloat(epoch.mev_revenue || 0), 0);
        const totalBlocks = historicalData.reduce((sum, epoch) => sum + parseInt(epoch.mev_blocks || 0), 0);
        const avgRevenue = totalRevenue / historicalData.length;
        const avgMevPerBlock = totalBlocks > 0 ? totalRevenue / totalBlocks : 0;
        
        // Calculate capability score (0-100)
        let capabilityScore = 0;
        
        // Revenue factor (40%)
        capabilityScore += Math.min(40, avgRevenue * 100);
        
        // Consistency factor (30%)
        const revenues = historicalData.map(d => parseFloat(d.mev_revenue || 0));
        const consistency = this.calculateConsistencyScore(revenues);
        capabilityScore += consistency * 30;
        
        // Growth factor (30%)
        const growthTrend = this.calculateGrowthTrend(revenues);
        capabilityScore += Math.max(0, growthTrend) * 30;
        
        return {
            mev_capability_score: Math.round(capabilityScore),
            avg_mev_per_block: avgMevPerBlock,
            total_mev_revenue: totalRevenue,
            mev_blocks_count: totalBlocks
        };
    }

    /**
     * Analyze performance characteristics
     */
    analyzePerformanceCharacteristics(historicalData) {
        const revenues = historicalData.map(d => parseFloat(d.mev_revenue || 0));
        const blockPercentages = historicalData.map(d => parseFloat(d.mev_block_percentage || 0));
        
        // Calculate consistency (inverse coefficient of variation)
        const consistencyScore = this.calculateConsistencyScore(revenues);
        
        // Calculate volatility
        const volatilityScore = this.calculateVolatilityScore(revenues);
        
        // Calculate growth trend
        const growthTrend = this.calculateGrowthTrend(revenues);
        
        // Analyze seasonal patterns (simplified)
        const seasonalPatterns = this.analyzeSeasonalPatterns(historicalData);
        
        return {
            consistency_score: consistencyScore,
            volatility_score: volatilityScore,
            growth_trend: growthTrend,
            seasonal_patterns: seasonalPatterns
        };
    }

    /**
     * Calculate attribution accuracy metrics
     */
    async calculateAttributionAccuracy(validatorAddress) {
        try {
            // Get attribution data with confidence scores
            const query = `
                SELECT 
                    attribution_confidence,
                    attribution_method,
                    mev_probability,
                    COUNT(*) as count
                FROM mev_reward_attributions
                WHERE validator_address = $1
                AND analysis_timestamp > NOW() - INTERVAL '30 days'
                GROUP BY attribution_confidence, attribution_method, mev_probability
            `;
            
            const result = await this.db.query(query, [validatorAddress]);
            
            if (result.rows.length === 0) {
                return {
                    attribution_accuracy: 0,
                    confidence_intervals: {},
                    model_performance: {}
                };
            }
            
            // Calculate weighted average accuracy
            const totalRecords = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
            const weightedAccuracy = result.rows.reduce((sum, row) => {
                const weight = parseInt(row.count) / totalRecords;
                return sum + parseFloat(row.attribution_confidence || 0) * weight;
            }, 0);
            
            // Calculate confidence intervals
            const confidences = result.rows.map(row => parseFloat(row.attribution_confidence || 0));
            const confidenceIntervals = {
                min: Math.min(...confidences),
                max: Math.max(...confidences),
                avg: confidences.reduce((sum, c) => sum + c, 0) / confidences.length
            };
            
            // Model performance metrics
            const modelPerformance = {
                total_attributions: totalRecords,
                high_confidence_rate: result.rows.filter(row => 
                    parseFloat(row.attribution_confidence) > this.config.confidenceThreshold
                ).reduce((sum, row) => sum + parseInt(row.count), 0) / totalRecords,
                method_distribution: {}
            };
            
            // Calculate method distribution
            result.rows.forEach(row => {
                const method = row.attribution_method || 'unknown';
                if (!modelPerformance.method_distribution[method]) {
                    modelPerformance.method_distribution[method] = 0;
                }
                modelPerformance.method_distribution[method] += parseInt(row.count);
            });
            
            return {
                attribution_accuracy: weightedAccuracy,
                confidence_intervals: confidenceIntervals,
                model_performance: modelPerformance
            };
            
        } catch (error) {
            console.error('Error calculating attribution accuracy:', error);
            return {
                attribution_accuracy: 0,
                confidence_intervals: {},
                model_performance: {}
            };
        }
    }

    /**
     * Perform competitive analysis
     */
    async performCompetitiveAnalysis(validatorAddress, historicalData) {
        try {
            // Get peer validators (same type - Jito or regular)
            const peers = await this.getPeerValidators(validatorAddress);
            
            if (peers.length === 0) {
                return {
                    peer_comparison: {},
                    market_position: 'unknown',
                    improvement_potential: 0
                };
            }
            
            // Calculate this validator's average performance
            const avgRevenue = historicalData.summary.avg_mev_per_epoch;
            
            // Compare against peers
            const peerComparison = {
                total_peers: peers.length,
                better_than_peers: 0,
                peer_avg_revenue: 0,
                percentile_rank: 0
            };
            
            let peerRevenueSum = 0;
            for (const peer of peers) {
                peerRevenueSum += parseFloat(peer.avg_mev_revenue || 0);
                if (avgRevenue > parseFloat(peer.avg_mev_revenue || 0)) {
                    peerComparison.better_than_peers++;
                }
            }
            
            peerComparison.peer_avg_revenue = peerRevenueSum / peers.length;
            peerComparison.percentile_rank = (peerComparison.better_than_peers / peers.length) * 100;
            
            // Determine market position
            let marketPosition;
            if (peerComparison.percentile_rank >= 90) marketPosition = 'leader';
            else if (peerComparison.percentile_rank >= 75) marketPosition = 'strong';
            else if (peerComparison.percentile_rank >= 50) marketPosition = 'average';
            else if (peerComparison.percentile_rank >= 25) marketPosition = 'below_average';
            else marketPosition = 'weak';
            
            // Calculate improvement potential
            const topPeerRevenue = Math.max(...peers.map(p => parseFloat(p.avg_mev_revenue || 0)));
            const improvementPotential = topPeerRevenue > avgRevenue ? 
                (topPeerRevenue - avgRevenue) / avgRevenue : 0;
            
            return {
                peer_comparison: peerComparison,
                market_position: marketPosition,
                improvement_potential: Math.min(1, improvementPotential)
            };
            
        } catch (error) {
            console.error('Error performing competitive analysis:', error);
            return {
                peer_comparison: {},
                market_position: 'unknown',
                improvement_potential: 0
            };
        }
    }

    /**
     * Get peer validators for comparison
     */
    async getPeerValidators(validatorAddress) {
        try {
            // First determine if this validator is Jito-enabled
            const validatorInfoQuery = `
                SELECT is_jito_enabled 
                FROM enhanced_validator_performance 
                WHERE validator_address = $1 
                ORDER BY timestamp DESC 
                LIMIT 1
            `;
            
            const validatorInfo = await this.db.query(validatorInfoQuery, [validatorAddress]);
            const isJitoEnabled = validatorInfo.rows[0]?.is_jito_enabled || false;
            
            // Get peer validators of the same type
            const peersQuery = `
                SELECT 
                    hmp.validator_address,
                    AVG(hmp.mev_revenue) as avg_mev_revenue,
                    AVG(hmp.mev_block_percentage) as avg_mev_percentage
                FROM historical_mev_performance hmp
                JOIN enhanced_validator_performance evp ON hmp.validator_address = evp.validator_address
                WHERE evp.is_jito_enabled = $1
                AND hmp.validator_address != $2
                AND hmp.created_at > NOW() - INTERVAL '30 days'
                GROUP BY hmp.validator_address
                HAVING COUNT(*) >= 10
                ORDER BY avg_mev_revenue DESC
                LIMIT 50
            `;
            
            const result = await this.db.query(peersQuery, [isJitoEnabled, validatorAddress]);
            return result.rows;
            
        } catch (error) {
            console.error('Error getting peer validators:', error);
            return [];
        }
    }

    /**
     * Store validator profile in database
     */
    async storeValidatorProfile(profile) {
        try {
            const query = `
                INSERT INTO validator_mev_profiles (
                    validator_address, profile_version, last_updated, data_epochs,
                    mev_capability_score, avg_mev_per_block, consistency_score,
                    volatility_score, growth_trend, seasonal_patterns,
                    attribution_accuracy, confidence_intervals, model_performance,
                    peer_comparison, market_position, improvement_potential
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
                )
                ON CONFLICT (validator_address)
                DO UPDATE SET
                    profile_version = EXCLUDED.profile_version,
                    last_updated = EXCLUDED.last_updated,
                    data_epochs = EXCLUDED.data_epochs,
                    mev_capability_score = EXCLUDED.mev_capability_score,
                    avg_mev_per_block = EXCLUDED.avg_mev_per_block,
                    consistency_score = EXCLUDED.consistency_score,
                    volatility_score = EXCLUDED.volatility_score,
                    growth_trend = EXCLUDED.growth_trend,
                    seasonal_patterns = EXCLUDED.seasonal_patterns,
                    attribution_accuracy = EXCLUDED.attribution_accuracy,
                    confidence_intervals = EXCLUDED.confidence_intervals,
                    model_performance = EXCLUDED.model_performance,
                    peer_comparison = EXCLUDED.peer_comparison,
                    market_position = EXCLUDED.market_position,
                    improvement_potential = EXCLUDED.improvement_potential
            `;
            
            await this.db.query(query, [
                profile.validator_address,
                profile.profile_version,
                profile.last_updated,
                profile.data_epochs,
                profile.mev_capability_score,
                profile.avg_mev_per_block,
                profile.consistency_score,
                profile.volatility_score,
                profile.growth_trend,
                JSON.stringify(profile.seasonal_patterns),
                profile.attribution_accuracy,
                JSON.stringify(profile.confidence_intervals),
                JSON.stringify(profile.model_performance),
                JSON.stringify(profile.peer_comparison),
                profile.market_position,
                profile.improvement_potential
            ]);
            
        } catch (error) {
            console.error('Error storing validator profile:', error);
        }
    }

    /**
     * Create profile for validators with insufficient data
     */
    createInsufficientDataProfile(validatorAddress) {
        return {
            validator_address: validatorAddress,
            profile_version: '1.0',
            last_updated: new Date(),
            data_epochs: 0,
            mev_capability_score: 0,
            avg_mev_per_block: 0,
            consistency_score: 0,
            volatility_score: 0,
            growth_trend: 0,
            seasonal_patterns: {},
            attribution_accuracy: 0,
            confidence_intervals: {},
            model_performance: {},
            peer_comparison: {},
            market_position: 'insufficient_data',
            improvement_potential: 0
        };
    }

    // Helper methods
    calculateConsistencyScore(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        if (mean === 0) return 0;
        const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
        return Math.max(0, 1 - (stdDev / mean));
    }

    calculateVolatilityScore(values) {
        const consistency = this.calculateConsistencyScore(values);
        return Math.max(0, 1 - consistency); // Volatility is inverse of consistency
    }

    calculateGrowthTrend(values) {
        if (values.length < 2) return 0;
        const x = Array.from({ length: values.length }, (_, i) => i);
        const n = values.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        
        const denominator = n * sumXX - sumX * sumX;
        return denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    }

    analyzeSeasonalPatterns(historicalData) {
        // Simplified seasonal analysis
        return {
            trend_direction: historicalData.length > 1 ? 
                (historicalData[historicalData.length - 1].mev_revenue > historicalData[0].mev_revenue ? 'increasing' : 'decreasing') : 'stable',
            volatility_pattern: 'normal' // Simplified
        };
    }
}

module.exports = ValidatorMEVProfiler;