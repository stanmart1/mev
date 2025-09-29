const EventEmitter = require('events');

/**
 * MEV Reward Attribution Engine
 * Core system for attributing MEV rewards to specific validators by analyzing block rewards
 * and separating MEV earnings from regular staking rewards
 */
class MEVRewardAttributionEngine extends EventEmitter {
    constructor(database, solanaConnection) {
        super();
        this.db = database;
        this.connection = solanaConnection;
        this.attributionInterval = null;
        this.processingQueue = [];
        this.isProcessing = false;
        
        // Attribution configuration
        this.config = {
            // Analysis window in epochs
            analysisWindow: 10,
            
            // MEV detection thresholds
            mevThresholds: {
                minExcessReward: 0.001, // 0.001 SOL minimum MEV reward
                anomalyMultiplier: 1.5,  // 1.5x above baseline for MEV detection
                bundleCorrelationThreshold: 0.7 // Correlation with bundle activity
            },
            
            // Reward attribution weights
            attributionWeights: {
                blockPosition: 0.3,      // Weight for block position analysis
                transactionFees: 0.25,   // Weight for transaction fee analysis
                bundleActivity: 0.2,     // Weight for bundle correlation
                timePattern: 0.15,       // Weight for timing pattern analysis
                networkActivity: 0.1     // Weight for network congestion correlation
            },
            
            // Processing batch size
            batchSize: 50,
            
            // Cache TTL in minutes
            cacheTTL: 30
        };
        
        // Attribution cache
        this.attributionCache = new Map();
        this.baselineRewards = new Map();
        this.mevPatterns = new Map();
    }

    /**
     * Start MEV reward attribution processing
     */
    async startAttribution(intervalMs = 600000) { // 10 minutes
        console.log('Starting MEV reward attribution engine...');
        
        try {
            // Initialize baseline reward patterns
            await this.initializeBaselineRewards();
            
            // Start initial attribution analysis
            await this.performFullAttribution();
            
            // Set up periodic processing
            this.attributionInterval = setInterval(async () => {
                try {
                    await this.processAttributionQueue();
                } catch (error) {
                    console.error('Error in periodic attribution processing:', error);
                    this.emit('error', error);
                }
            }, intervalMs);
            
            this.emit('started', { interval: intervalMs });
            console.log('MEV reward attribution engine started successfully');
            
        } catch (error) {
            console.error('Error starting MEV attribution engine:', error);
            throw error;
        }
    }

    /**
     * Stop MEV reward attribution processing
     */
    stopAttribution() {
        if (this.attributionInterval) {
            clearInterval(this.attributionInterval);
            this.attributionInterval = null;
        }
        
        this.isProcessing = false;
        console.log('MEV reward attribution engine stopped');
        this.emit('stopped');
    }

    /**
     * Initialize baseline reward patterns for comparison
     */
    async initializeBaselineRewards() {
        console.log('Initializing baseline reward patterns...');
        
        try {
            // Get historical validator performance data
            const query = `
                SELECT 
                    validator_address,
                    epoch,
                    epoch_rewards,
                    stake_amount,
                    commission_rate,
                    is_jito_enabled
                FROM enhanced_validator_performance 
                WHERE timestamp > NOW() - INTERVAL '30 days'
                ORDER BY validator_address, epoch
            `;
            
            const result = await this.db.query(query);
            const validatorData = this.groupByValidator(result.rows);
            
            // Calculate baseline reward patterns for each validator
            for (const [validatorAddress, epochs] of validatorData.entries()) {
                const baseline = this.calculateBaselineRewards(epochs);
                this.baselineRewards.set(validatorAddress, baseline);
            }
            
            console.log(`Initialized baseline patterns for ${validatorData.size} validators`);
            
        } catch (error) {
            console.error('Error initializing baseline rewards:', error);
            throw error;
        }
    }

    /**
     * Calculate baseline reward patterns for a validator
     */
    calculateBaselineRewards(epochs) {
        if (epochs.length === 0) return null;
        
        // Separate Jito and regular epochs
        const jitoEpochs = epochs.filter(e => e.is_jito_enabled);
        const regularEpochs = epochs.filter(e => !e.is_jito_enabled);
        
        // Calculate statistics for each type
        const jitoStats = this.calculateRewardStatistics(jitoEpochs);
        const regularStats = this.calculateRewardStatistics(regularEpochs);
        
        return {
            validator_address: epochs[0].validator_address,
            jito_baseline: jitoStats,
            regular_baseline: regularStats,
            total_epochs: epochs.length,
            jito_epochs: jitoEpochs.length,
            regular_epochs: regularEpochs.length,
            avg_stake: epochs.reduce((sum, e) => sum + parseFloat(e.stake_amount), 0) / epochs.length,
            avg_commission: epochs.reduce((sum, e) => sum + parseFloat(e.commission_rate), 0) / epochs.length
        };
    }

    /**
     * Calculate reward statistics for a set of epochs
     */
    calculateRewardStatistics(epochs) {
        if (epochs.length === 0) {
            return {
                mean: 0,
                median: 0,
                stdDev: 0,
                min: 0,
                max: 0,
                percentile25: 0,
                percentile75: 0,
                count: 0
            };
        }
        
        const rewards = epochs.map(e => parseFloat(e.epoch_rewards)).sort((a, b) => a - b);
        const mean = rewards.reduce((sum, r) => sum + r, 0) / rewards.length;
        const variance = rewards.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rewards.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            mean,
            median: this.calculatePercentile(rewards, 50),
            stdDev,
            min: Math.min(...rewards),
            max: Math.max(...rewards),
            percentile25: this.calculatePercentile(rewards, 25),
            percentile75: this.calculatePercentile(rewards, 75),
            count: rewards.length
        };
    }

    /**
     * Perform full MEV attribution analysis
     */
    async performFullAttribution() {
        console.log('Performing full MEV attribution analysis...');
        
        try {
            // Get recent block data for analysis
            const blockData = await this.getRecentBlockData();
            
            if (blockData.length === 0) {
                console.log('No block data available for attribution');
                return;
            }
            
            const results = [];
            
            // Process blocks in batches
            for (let i = 0; i < blockData.length; i += this.config.batchSize) {
                const batch = blockData.slice(i, i + this.config.batchSize);
                const batchResults = await this.processBatch(batch);
                results.push(...batchResults);
                
                // Small delay between batches
                await this.sleep(100);
            }
            
            // Store attribution results
            await this.storeAttributionResults(results);
            
            this.emit('attributionCompleted', {
                timestamp: new Date(),
                blocksProcessed: blockData.length,
                attributionsCreated: results.length
            });
            
            console.log(`Attribution analysis completed: ${results.length} attributions created`);
            
        } catch (error) {
            console.error('Error performing full attribution:', error);
            throw error;
        }
    }

    /**
     * Process a batch of blocks for MEV attribution
     */
    async processBatch(blocks) {
        const results = [];
        
        for (const block of blocks) {
            try {
                const attribution = await this.attributeBlockRewards(block);
                if (attribution) {
                    results.push(attribution);
                }
            } catch (error) {
                console.error(`Error processing block ${block.slot}:`, error);
                // Continue processing other blocks
            }
        }
        
        return results;
    }

    /**
     * Attribute MEV rewards for a specific block
     */
    async attributeBlockRewards(block) {
        try {
            const validatorAddress = block.validator_address;
            
            // Get baseline rewards for this validator
            const baseline = this.baselineRewards.get(validatorAddress);
            if (!baseline) {
                console.log(`No baseline data for validator ${validatorAddress}`);
                return null;
            }
            
            // Calculate total block rewards
            const totalRewards = parseFloat(block.total_rewards || 0);
            
            // Analyze reward components
            const rewardAnalysis = await this.analyzeRewardComponents(block, baseline);
            
            // Calculate MEV attribution
            const mevAttribution = this.calculateMEVAttribution(rewardAnalysis, baseline);
            
            // Generate attribution record
            return {
                block_slot: block.slot,
                validator_address: validatorAddress,
                epoch: block.epoch,
                total_rewards: totalRewards,
                
                // Reward breakdown
                base_staking_rewards: mevAttribution.baseRewards,
                mev_rewards: mevAttribution.mevRewards,
                transaction_fees: mevAttribution.transactionFees,
                priority_fees: mevAttribution.priorityFees,
                
                // Attribution confidence and details
                attribution_confidence: mevAttribution.confidence,
                attribution_method: mevAttribution.method,
                mev_probability: mevAttribution.mevProbability,
                
                // Analysis details
                reward_anomaly_score: mevAttribution.anomalyScore,
                bundle_correlation: mevAttribution.bundleCorrelation,
                timing_pattern_score: mevAttribution.timingScore,
                
                // Metadata
                analysis_timestamp: new Date(),
                block_timestamp: new Date(block.timestamp),
                attribution_version: '1.0'
            };
            
        } catch (error) {
            console.error(`Error attributing rewards for block ${block.slot}:`, error);
            return null;
        }
    }

    /**
     * Analyze reward components of a block
     */
    async analyzeRewardComponents(block, baseline) {
        const analysis = {
            totalRewards: parseFloat(block.total_rewards || 0),
            transactionCount: parseInt(block.transaction_count || 0),
            avgTransactionFee: 0,
            priorityFeeTotal: 0,
            bundleActivity: 0,
            networkCongestion: 0
        };
        
        // Calculate average transaction fee
        if (analysis.transactionCount > 0) {
            analysis.avgTransactionFee = analysis.totalRewards / analysis.transactionCount;
        }
        
        // Get bundle activity for this block
        analysis.bundleActivity = await this.getBundleActivity(block.slot);
        
        // Get network congestion metrics
        analysis.networkCongestion = await this.getNetworkCongestion(block.epoch);
        
        // Calculate priority fees (estimated)
        analysis.priorityFeeTotal = analysis.totalRewards * 0.1; // Rough estimate
        
        return analysis;
    }

    /**
     * Calculate MEV attribution based on reward analysis
     */
    calculateMEVAttribution(analysis, baseline) {
        const isJitoValidator = baseline.jito_epochs > 0;
        const relevantBaseline = isJitoValidator ? baseline.jito_baseline : baseline.regular_baseline;
        
        // Calculate expected baseline rewards
        const expectedRewards = relevantBaseline.mean;
        const rewardThreshold = expectedRewards + (relevantBaseline.stdDev * this.config.mevThresholds.anomalyMultiplier);
        
        // Calculate excess rewards (potential MEV)
        const excessRewards = Math.max(0, analysis.totalRewards - rewardThreshold);
        
        // MEV probability based on multiple factors
        let mevProbability = 0;
        let confidence = 0;
        let anomalyScore = 0;
        
        // Factor 1: Reward anomaly
        if (analysis.totalRewards > rewardThreshold) {
            anomalyScore = (analysis.totalRewards - expectedRewards) / relevantBaseline.stdDev;
            mevProbability += this.config.attributionWeights.blockPosition * Math.min(1, anomalyScore / 3);
        }
        
        // Factor 2: Transaction fee analysis
        if (analysis.avgTransactionFee > 0.005) { // Above 0.005 SOL per transaction
            mevProbability += this.config.attributionWeights.transactionFees * 0.8;
        }
        
        // Factor 3: Bundle activity correlation
        const bundleCorrelation = Math.min(1, analysis.bundleActivity / 10);
        mevProbability += this.config.attributionWeights.bundleActivity * bundleCorrelation;
        
        // Factor 4: Network congestion correlation
        const congestionFactor = Math.min(1, analysis.networkCongestion / 0.8);
        mevProbability += this.config.attributionWeights.networkActivity * congestionFactor;
        
        // Calculate confidence based on data quality
        confidence = this.calculateAttributionConfidence(analysis, baseline, mevProbability);
        
        // Determine attribution method
        let method = 'statistical_analysis';
        if (bundleCorrelation > this.config.mevThresholds.bundleCorrelationThreshold) {
            method = 'bundle_correlation';
        } else if (anomalyScore > 2) {
            method = 'reward_anomaly';
        }
        
        // Calculate final MEV rewards
        let mevRewards = 0;
        if (mevProbability > 0.5 && excessRewards > this.config.mevThresholds.minExcessReward) {
            mevRewards = excessRewards * mevProbability;
        }
        
        return {
            baseRewards: analysis.totalRewards - mevRewards,
            mevRewards,
            transactionFees: analysis.avgTransactionFee * analysis.transactionCount,
            priorityFees: analysis.priorityFeeTotal,
            confidence: Math.round(confidence * 100) / 100,
            method,
            mevProbability: Math.round(mevProbability * 100) / 100,
            anomalyScore: Math.round(anomalyScore * 100) / 100,
            bundleCorrelation: Math.round(bundleCorrelation * 100) / 100,
            timingScore: 0 // Placeholder for timing analysis
        };
    }

    /**
     * Calculate attribution confidence score
     */
    calculateAttributionConfidence(analysis, baseline, mevProbability) {
        let confidence = 0.5; // Base confidence
        
        // Increase confidence with more baseline data
        if (baseline.total_epochs > 20) {
            confidence += 0.2;
        } else if (baseline.total_epochs > 10) {
            confidence += 0.1;
        }
        
        // Increase confidence with bundle correlation
        if (analysis.bundleActivity > 0) {
            confidence += 0.15;
        }
        
        // Increase confidence with clear anomalies
        if (mevProbability > 0.8) {
            confidence += 0.1;
        }
        
        // Decrease confidence with high variance baseline
        if (baseline.jito_baseline.stdDev > baseline.jito_baseline.mean * 0.5) {
            confidence -= 0.1;
        }
        
        return Math.max(0.1, Math.min(1.0, confidence));
    }

    /**
     * Get recent block data for attribution analysis
     */
    async getRecentBlockData(hours = 24) {
        try {
            // This would typically fetch from Solana block data or stored block information
            // For now, we'll generate mock block data structure
            
            const query = `
                SELECT 
                    vp.validator_address,
                    vp.epoch,
                    vp.epoch_rewards as total_rewards,
                    vp.timestamp,
                    vp.is_jito_enabled,
                    EXTRACT(EPOCH FROM vp.timestamp) * 1000000 as slot
                FROM enhanced_validator_performance vp
                WHERE vp.timestamp > NOW() - INTERVAL '${hours} hours'
                ORDER BY vp.timestamp DESC
                LIMIT 1000
            `;
            
            const result = await this.db.query(query);
            
            return result.rows.map(row => ({
                slot: parseInt(row.slot),
                validator_address: row.validator_address,
                epoch: row.epoch,
                total_rewards: row.total_rewards,
                timestamp: row.timestamp,
                transaction_count: Math.floor(Math.random() * 3000) + 100, // Mock transaction count
                is_jito_enabled: row.is_jito_enabled
            }));
            
        } catch (error) {
            console.error('Error getting recent block data:', error);
            return [];
        }
    }

    /**
     * Get bundle activity for a specific block slot
     */
    async getBundleActivity(slot) {
        try {
            // Query bundle activity from database
            const query = `
                SELECT COUNT(*) as bundle_count
                FROM mev_bundles mb
                WHERE mb.construction_timestamp > NOW() - INTERVAL '1 hour'
            `;
            
            const result = await this.db.query(query);
            return parseInt(result.rows[0]?.bundle_count || 0);
            
        } catch (error) {
            console.error('Error getting bundle activity:', error);
            return 0;
        }
    }

    /**
     * Get network congestion metrics for an epoch
     */
    async getNetworkCongestion(epoch) {
        try {
            // Calculate network congestion based on transaction volume and fees
            // This is a simplified calculation
            return Math.random() * 0.8; // Mock congestion value 0-0.8
            
        } catch (error) {
            console.error('Error getting network congestion:', error);
            return 0;
        }
    }

    /**
     * Store attribution results in database
     */
    async storeAttributionResults(results) {
        if (results.length === 0) return;
        
        try {
            for (const attribution of results) {
                const query = `
                    INSERT INTO mev_reward_attributions (
                        block_slot, validator_address, epoch, total_rewards,
                        base_staking_rewards, mev_rewards, transaction_fees, priority_fees,
                        attribution_confidence, attribution_method, mev_probability,
                        reward_anomaly_score, bundle_correlation, timing_pattern_score,
                        analysis_timestamp, block_timestamp, attribution_version
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
                    )
                    ON CONFLICT (block_slot, validator_address) 
                    DO UPDATE SET
                        total_rewards = EXCLUDED.total_rewards,
                        base_staking_rewards = EXCLUDED.base_staking_rewards,
                        mev_rewards = EXCLUDED.mev_rewards,
                        transaction_fees = EXCLUDED.transaction_fees,
                        priority_fees = EXCLUDED.priority_fees,
                        attribution_confidence = EXCLUDED.attribution_confidence,
                        attribution_method = EXCLUDED.attribution_method,
                        mev_probability = EXCLUDED.mev_probability,
                        reward_anomaly_score = EXCLUDED.reward_anomaly_score,
                        bundle_correlation = EXCLUDED.bundle_correlation,
                        timing_pattern_score = EXCLUDED.timing_pattern_score,
                        analysis_timestamp = EXCLUDED.analysis_timestamp,
                        attribution_version = EXCLUDED.attribution_version
                `;
                
                await this.db.query(query, [
                    attribution.block_slot,
                    attribution.validator_address,
                    attribution.epoch,
                    attribution.total_rewards,
                    attribution.base_staking_rewards,
                    attribution.mev_rewards,
                    attribution.transaction_fees,
                    attribution.priority_fees,
                    attribution.attribution_confidence,
                    attribution.attribution_method,
                    attribution.mev_probability,
                    attribution.reward_anomaly_score,
                    attribution.bundle_correlation,
                    attribution.timing_pattern_score,
                    attribution.analysis_timestamp,
                    attribution.block_timestamp,
                    attribution.attribution_version
                ]);
            }
            
            console.log(`Stored ${results.length} attribution results`);
            
        } catch (error) {
            console.error('Error storing attribution results:', error);
            throw error;
        }
    }

    /**
     * Process attribution queue
     */
    async processAttributionQueue() {
        if (this.isProcessing || this.processingQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            const batch = this.processingQueue.splice(0, this.config.batchSize);
            const results = await this.processBatch(batch);
            await this.storeAttributionResults(results);
            
            this.emit('queueProcessed', {
                timestamp: new Date(),
                processed: batch.length,
                remaining: this.processingQueue.length
            });
            
        } catch (error) {
            console.error('Error processing attribution queue:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get MEV attribution for a specific validator and time period
     */
    async getValidatorMEVAttribution(validatorAddress, epochStart, epochEnd) {
        try {
            const query = `
                SELECT 
                    epoch,
                    COUNT(*) as block_count,
                    SUM(total_rewards) as total_rewards,
                    SUM(base_staking_rewards) as total_base_rewards,
                    SUM(mev_rewards) as total_mev_rewards,
                    AVG(attribution_confidence) as avg_confidence,
                    AVG(mev_probability) as avg_mev_probability,
                    COUNT(CASE WHEN mev_rewards > 0 THEN 1 END) as mev_blocks
                FROM mev_reward_attributions
                WHERE validator_address = $1
                AND epoch BETWEEN $2 AND $3
                GROUP BY epoch
                ORDER BY epoch
            `;
            
            const result = await this.db.query(query, [validatorAddress, epochStart, epochEnd]);
            
            return {
                validator_address: validatorAddress,
                epoch_range: { start: epochStart, end: epochEnd },
                epoch_data: result.rows,
                summary: this.calculateAttributionSummary(result.rows)
            };
            
        } catch (error) {
            console.error('Error getting validator MEV attribution:', error);
            throw error;
        }
    }

    /**
     * Calculate attribution summary statistics
     */
    calculateAttributionSummary(epochData) {
        if (epochData.length === 0) {
            return {
                total_blocks: 0,
                total_rewards: 0,
                total_mev_rewards: 0,
                mev_percentage: 0,
                avg_confidence: 0,
                mev_block_percentage: 0
            };
        }
        
        const totalBlocks = epochData.reduce((sum, e) => sum + parseInt(e.block_count), 0);
        const totalRewards = epochData.reduce((sum, e) => sum + parseFloat(e.total_rewards), 0);
        const totalMevRewards = epochData.reduce((sum, e) => sum + parseFloat(e.total_mev_rewards), 0);
        const totalMevBlocks = epochData.reduce((sum, e) => sum + parseInt(e.mev_blocks), 0);
        const avgConfidence = epochData.reduce((sum, e) => sum + parseFloat(e.avg_confidence), 0) / epochData.length;
        
        return {
            total_blocks: totalBlocks,
            total_rewards: totalRewards,
            total_mev_rewards: totalMevRewards,
            mev_percentage: totalRewards > 0 ? (totalMevRewards / totalRewards) * 100 : 0,
            avg_confidence: avgConfidence,
            mev_block_percentage: totalBlocks > 0 ? (totalMevBlocks / totalBlocks) * 100 : 0
        };
    }

    // Utility methods
    groupByValidator(data) {
        const grouped = new Map();
        for (const item of data) {
            if (!grouped.has(item.validator_address)) {
                grouped.set(item.validator_address, []);
            }
            grouped.get(item.validator_address).push(item);
        }
        return grouped;
    }

    calculatePercentile(sortedArray, percentile) {
        if (sortedArray.length === 0) return 0;
        const index = (percentile / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;
        
        if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
        return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MEVRewardAttributionEngine;