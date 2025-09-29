const EventEmitter = require('events');

/**
 * MEV Earnings Calculator
 * Identifies and quantifies MEV-specific reward components from validator earnings
 */
class MEVEarningsCalculator extends EventEmitter {
    constructor(database, blockRewardParser, attributionEngine) {
        super();
        this.db = database;
        this.blockParser = blockRewardParser;
        this.attributionEngine = attributionEngine;
        
        // MEV calculation configuration
        this.config = {
            // MEV identification thresholds
            thresholds: {
                minMevReward: 0.0001,      // 0.0001 SOL minimum
                anomalyFactor: 2.0,         // 2x above baseline
                confidenceThreshold: 0.6,   // 60% confidence minimum
                correlationThreshold: 0.7   // 70% correlation with MEV activity
            },
            
            // Calculation methods
            methods: {
                statistical: { weight: 0.4 },
                pattern: { weight: 0.3 },
                correlation: { weight: 0.3 }
            },
            
            // MEV types and their characteristics
            mevTypes: {
                arbitrage: {
                    priority: 'high',
                    patterns: ['swap', 'route'],
                    avgDuration: 2000, // 2 seconds
                    profitMargin: 0.02 // 2%
                },
                sandwich: {
                    priority: 'high',
                    patterns: ['front', 'back', 'middle'],
                    avgDuration: 5000, // 5 seconds
                    profitMargin: 0.01 // 1%
                },
                liquidation: {
                    priority: 'medium',
                    patterns: ['liquidate', 'close'],
                    avgDuration: 10000, // 10 seconds
                    profitMargin: 0.05 // 5%
                }
            }
        };
        
        // Calculation cache
        this.calculationCache = new Map();
        this.baselineCache = new Map();
    }

    /**
     * Calculate MEV earnings for a validator over a time period
     */
    async calculateMEVEarnings(validatorAddress, startEpoch, endEpoch) {
        console.log(`Calculating MEV earnings for ${validatorAddress} (epochs ${startEpoch}-${endEpoch})`);
        
        try {
            // Get validator's block reward data
            const blockData = await this.getValidatorBlockData(validatorAddress, startEpoch, endEpoch);
            
            if (blockData.length === 0) {
                return {
                    validator_address: validatorAddress,
                    epoch_range: { start: startEpoch, end: endEpoch },
                    total_mev_earnings: 0,
                    mev_blocks: 0,
                    confidence_score: 0,
                    calculation_method: 'insufficient_data'
                };
            }
            
            // Get baseline rewards for comparison
            const baseline = await this.getValidatorBaseline(validatorAddress);
            
            // Calculate MEV earnings using multiple methods
            const calculations = await this.performMEVCalculations(blockData, baseline);
            
            // Combine results from different methods
            const finalEarnings = this.combineMEVCalculations(calculations);
            
            // Store calculation results
            await this.storeMEVEarnings(validatorAddress, startEpoch, endEpoch, finalEarnings);
            
            return {
                validator_address: validatorAddress,
                epoch_range: { start: startEpoch, end: endEpoch },
                ...finalEarnings,
                calculation_timestamp: new Date()
            };
            
        } catch (error) {
            console.error('Error calculating MEV earnings:', error);
            throw error;
        }
    }

    /**
     * Get validator block data for analysis
     */
    async getValidatorBlockData(validatorAddress, startEpoch, endEpoch) {
        try {
            const query = `
                SELECT 
                    pbr.*,
                    evp.epoch,
                    evp.epoch_rewards as baseline_rewards,
                    evp.stake_amount,
                    evp.is_jito_enabled
                FROM parsed_block_rewards pbr
                JOIN enhanced_validator_performance evp ON pbr.validator_address = evp.validator_address
                WHERE pbr.validator_address = $1
                AND evp.epoch BETWEEN $2 AND $3
                ORDER BY pbr.slot
            `;
            
            const result = await this.db.query(query, [validatorAddress, startEpoch, endEpoch]);
            return result.rows;
            
        } catch (error) {
            console.error('Error getting validator block data:', error);
            return [];
        }
    }

    /**
     * Get validator baseline rewards for comparison
     */
    async getValidatorBaseline(validatorAddress) {
        try {
            // Check cache first
            if (this.baselineCache.has(validatorAddress)) {
                const cached = this.baselineCache.get(validatorAddress);
                if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
                    return cached.data;
                }
            }
            
            const query = `
                SELECT 
                    AVG(epoch_rewards) as avg_rewards,
                    STDDEV(epoch_rewards) as stddev_rewards,
                    MIN(epoch_rewards) as min_rewards,
                    MAX(epoch_rewards) as max_rewards,
                    COUNT(*) as epoch_count,
                    AVG(stake_amount) as avg_stake,
                    is_jito_enabled
                FROM enhanced_validator_performance
                WHERE validator_address = $1
                AND timestamp > NOW() - INTERVAL '30 days'
                GROUP BY is_jito_enabled
            `;
            
            const result = await this.db.query(query, [validatorAddress]);
            
            const baseline = {
                avg_rewards: parseFloat(result.rows[0]?.avg_rewards || 0),
                stddev_rewards: parseFloat(result.rows[0]?.stddev_rewards || 0),
                min_rewards: parseFloat(result.rows[0]?.min_rewards || 0),
                max_rewards: parseFloat(result.rows[0]?.max_rewards || 0),
                epoch_count: parseInt(result.rows[0]?.epoch_count || 0),
                avg_stake: parseFloat(result.rows[0]?.avg_stake || 0),
                is_jito_enabled: result.rows[0]?.is_jito_enabled || false
            };
            
            // Cache the result
            this.baselineCache.set(validatorAddress, {
                data: baseline,
                timestamp: Date.now()
            });
            
            return baseline;
            
        } catch (error) {
            console.error('Error getting validator baseline:', error);
            return null;
        }
    }

    /**
     * Perform MEV calculations using multiple methods
     */
    async performMEVCalculations(blockData, baseline) {
        const calculations = {};
        
        // Method 1: Statistical anomaly detection
        calculations.statistical = await this.calculateStatisticalMEV(blockData, baseline);
        
        // Method 2: Pattern-based detection
        calculations.pattern = await this.calculatePatternBasedMEV(blockData);
        
        // Method 3: Correlation analysis
        calculations.correlation = await this.calculateCorrelationMEV(blockData);
        
        return calculations;
    }

    /**
     * Calculate MEV using statistical anomaly detection
     */
    async calculateStatisticalMEV(blockData, baseline) {
        if (!baseline || baseline.epoch_count < 5) {
            return {
                total_mev: 0,
                mev_blocks: 0,
                confidence: 0,
                method: 'statistical_insufficient_data'
            };
        }
        
        const threshold = baseline.avg_rewards + (baseline.stddev_rewards * this.config.thresholds.anomalyFactor);
        let totalMEV = 0;
        let mevBlocks = 0;
        let confidenceSum = 0;
        
        for (const block of blockData) {
            const totalRewards = parseFloat(block.total_fees || 0) + parseFloat(block.validator_rewards || 0);
            
            if (totalRewards > threshold) {
                const excessReward = totalRewards - baseline.avg_rewards;
                const confidence = this.calculateStatisticalConfidence(excessReward, baseline);
                
                if (confidence > this.config.thresholds.confidenceThreshold) {
                    totalMEV += excessReward;
                    mevBlocks++;
                    confidenceSum += confidence;
                }
            }
        }
        
        return {
            total_mev: totalMEV,
            mev_blocks: mevBlocks,
            confidence: mevBlocks > 0 ? confidenceSum / mevBlocks : 0,
            method: 'statistical_anomaly',
            threshold_used: threshold
        };
    }

    /**
     * Calculate statistical confidence for anomaly detection
     */
    calculateStatisticalConfidence(excessReward, baseline) {
        if (baseline.stddev_rewards === 0) return 0;
        
        const zScore = excessReward / baseline.stddev_rewards;
        
        // Convert z-score to confidence (simplified)
        if (zScore > 3) return 0.99;
        if (zScore > 2) return 0.95;
        if (zScore > 1.5) return 0.85;
        if (zScore > 1) return 0.70;
        
        return Math.max(0, zScore / 2);
    }

    /**
     * Calculate MEV using pattern-based detection
     */
    async calculatePatternBasedMEV(blockData) {
        let totalMEV = 0;
        let mevBlocks = 0;
        let confidenceSum = 0;
        
        for (const block of blockData) {
            // Analyze MEV patterns in the block
            const patternScore = this.calculatePatternScore(block);
            
            if (patternScore.score > 0.5) {
                const estimatedMEV = this.estimateMEVFromPatterns(block, patternScore);
                
                if (estimatedMEV > this.config.thresholds.minMevReward) {
                    totalMEV += estimatedMEV;
                    mevBlocks++;
                    confidenceSum += patternScore.confidence;
                }
            }
        }
        
        return {
            total_mev: totalMEV,
            mev_blocks: mevBlocks,
            confidence: mevBlocks > 0 ? confidenceSum / mevBlocks : 0,
            method: 'pattern_based'
        };
    }

    /**
     * Calculate pattern score for a block
     */
    calculatePatternScore(block) {
        let score = 0;
        let confidence = 0;
        
        // High priority fee transactions indicate MEV
        const highPriorityRatio = (block.high_priority_fee_count || 0) / Math.max(block.transaction_count, 1);
        score += highPriorityRatio * 0.4;
        
        // DEX interactions indicate potential MEV
        const dexInteractionRatio = (block.dex_interaction_count || 0) / Math.max(block.transaction_count, 1);
        score += dexInteractionRatio * 0.3;
        
        // High fee transactions
        const highFeeRatio = (block.high_fee_transactions || 0) / Math.max(block.transaction_count, 1);
        score += highFeeRatio * 0.2;
        
        // Specific MEV patterns
        const arbitrageScore = (block.arbitrage_count || 0) * 0.1;
        const sandwichScore = (block.sandwich_count || 0) * 0.1;
        score += arbitrageScore + sandwichScore;
        
        // Calculate confidence based on signal strength
        confidence = Math.min(1, score * 1.5);
        
        return {
            score: Math.min(1, score),
            confidence,
            components: {
                highPriorityRatio,
                dexInteractionRatio,
                highFeeRatio,
                arbitrageScore,
                sandwichScore
            }
        };
    }

    /**
     * Estimate MEV amount from patterns
     */
    estimateMEVFromPatterns(block, patternScore) {
        const totalFees = parseFloat(block.total_fees || 0);
        const priorityFees = parseFloat(block.priority_fees || 0);
        
        // Base MEV estimate on priority fees and pattern strength
        let mevEstimate = priorityFees * patternScore.score;
        
        // Adjust based on specific MEV types
        if (block.arbitrage_count > 0) {
            mevEstimate += block.arbitrage_count * this.config.mevTypes.arbitrage.profitMargin * totalFees;
        }
        
        if (block.sandwich_count > 0) {
            mevEstimate += block.sandwich_count * this.config.mevTypes.sandwich.profitMargin * totalFees;
        }
        
        return mevEstimate;
    }

    /**
     * Calculate MEV using correlation analysis
     */
    async calculateCorrelationMEV(blockData) {
        let totalMEV = 0;
        let mevBlocks = 0;
        let confidenceSum = 0;
        
        // Get network MEV activity for correlation
        const networkMEVActivity = await this.getNetworkMEVActivity(blockData);
        
        for (const block of blockData) {
            const correlation = this.calculateMEVCorrelation(block, networkMEVActivity);
            
            if (correlation.score > this.config.thresholds.correlationThreshold) {
                const estimatedMEV = correlation.estimatedMEV;
                
                if (estimatedMEV > this.config.thresholds.minMevReward) {
                    totalMEV += estimatedMEV;
                    mevBlocks++;
                    confidenceSum += correlation.confidence;
                }
            }
        }
        
        return {
            total_mev: totalMEV,
            mev_blocks: mevBlocks,
            confidence: mevBlocks > 0 ? confidenceSum / mevBlocks : 0,
            method: 'correlation_analysis'
        };
    }

    /**
     * Get network MEV activity for correlation analysis
     */
    async getNetworkMEVActivity(blockData) {
        try {
            const startTime = new Date(Math.min(...blockData.map(b => new Date(b.block_time).getTime())));
            const endTime = new Date(Math.max(...blockData.map(b => new Date(b.block_time).getTime())));
            
            const query = `
                SELECT 
                    AVG(total_fees) as avg_fees,
                    AVG(dex_interaction_count) as avg_dex_interactions,
                    AVG(high_priority_fee_count) as avg_high_priority_fees
                FROM parsed_block_rewards
                WHERE block_time BETWEEN $1 AND $2
            `;
            
            const result = await this.db.query(query, [startTime, endTime]);
            
            return {
                avg_fees: parseFloat(result.rows[0]?.avg_fees || 0),
                avg_dex_interactions: parseFloat(result.rows[0]?.avg_dex_interactions || 0),
                avg_high_priority_fees: parseFloat(result.rows[0]?.avg_high_priority_fees || 0)
            };
            
        } catch (error) {
            console.error('Error getting network MEV activity:', error);
            return { avg_fees: 0, avg_dex_interactions: 0, avg_high_priority_fees: 0 };
        }
    }

    /**
     * Calculate MEV correlation for a block
     */
    calculateMEVCorrelation(block, networkActivity) {
        let correlationScore = 0;
        
        // Fee correlation
        const feeRatio = networkActivity.avg_fees > 0 ? 
            parseFloat(block.total_fees || 0) / networkActivity.avg_fees : 0;
        correlationScore += Math.min(1, feeRatio / 2) * 0.4;
        
        // DEX interaction correlation
        const dexRatio = networkActivity.avg_dex_interactions > 0 ?
            (block.dex_interaction_count || 0) / networkActivity.avg_dex_interactions : 0;
        correlationScore += Math.min(1, dexRatio / 2) * 0.3;
        
        // High priority fee correlation
        const priorityRatio = networkActivity.avg_high_priority_fees > 0 ?
            (block.high_priority_fee_count || 0) / networkActivity.avg_high_priority_fees : 0;
        correlationScore += Math.min(1, priorityRatio / 2) * 0.3;
        
        // Estimate MEV based on correlation
        const estimatedMEV = parseFloat(block.priority_fees || 0) * correlationScore;
        
        return {
            score: Math.min(1, correlationScore),
            confidence: correlationScore,
            estimatedMEV
        };
    }

    /**
     * Combine MEV calculations from different methods
     */
    combineMEVCalculations(calculations) {
        const methods = this.config.methods;
        let totalMEV = 0;
        let weightedConfidence = 0;
        let totalWeight = 0;
        let mevBlocks = 0;
        
        for (const [method, result] of Object.entries(calculations)) {
            if (methods[method] && result.confidence > this.config.thresholds.confidenceThreshold) {
                const weight = methods[method].weight;
                totalMEV += result.total_mev * weight;
                weightedConfidence += result.confidence * weight;
                totalWeight += weight;
                mevBlocks = Math.max(mevBlocks, result.mev_blocks);
            }
        }
        
        return {
            total_mev_earnings: totalWeight > 0 ? totalMEV / totalWeight : 0,
            mev_blocks,
            confidence_score: totalWeight > 0 ? weightedConfidence / totalWeight : 0,
            calculation_method: 'combined_analysis',
            method_results: calculations
        };
    }

    /**
     * Store MEV earnings calculation results
     */
    async storeMEVEarnings(validatorAddress, startEpoch, endEpoch, earnings) {
        try {
            const query = `
                INSERT INTO validator_mev_earnings (
                    validator_address, epoch_start, epoch_end, total_mev_earnings,
                    mev_blocks, confidence_score, calculation_method, method_results,
                    calculation_timestamp
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (validator_address, epoch_start, epoch_end)
                DO UPDATE SET
                    total_mev_earnings = EXCLUDED.total_mev_earnings,
                    mev_blocks = EXCLUDED.mev_blocks,
                    confidence_score = EXCLUDED.confidence_score,
                    calculation_method = EXCLUDED.calculation_method,
                    method_results = EXCLUDED.method_results,
                    calculation_timestamp = EXCLUDED.calculation_timestamp
            `;
            
            await this.db.query(query, [
                validatorAddress,
                startEpoch,
                endEpoch,
                earnings.total_mev_earnings,
                earnings.mev_blocks,
                earnings.confidence_score,
                earnings.calculation_method,
                JSON.stringify(earnings.method_results),
                new Date()
            ]);
            
        } catch (error) {
            console.error('Error storing MEV earnings:', error);
        }
    }

    /**
     * Get MEV earnings for multiple validators
     */
    async calculateBatchMEVEarnings(validatorAddresses, startEpoch, endEpoch) {
        const results = [];
        
        for (const validatorAddress of validatorAddresses) {
            try {
                const earnings = await this.calculateMEVEarnings(validatorAddress, startEpoch, endEpoch);
                results.push(earnings);
            } catch (error) {
                console.error(`Error calculating MEV for ${validatorAddress}:`, error);
                results.push({
                    validator_address: validatorAddress,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

module.exports = MEVEarningsCalculator;