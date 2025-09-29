const EventEmitter = require('events');

/**
 * Historical MEV Performance Tracker
 * Tracks MEV performance across epochs with trend analysis and historical insights
 */
class HistoricalMEVTracker extends EventEmitter {
    constructor(database, mevEarningsCalculator) {
        super();
        this.db = database;
        this.earningsCalculator = mevEarningsCalculator;
        this.trackingInterval = null;
        
        this.config = {
            // Analysis window settings
            trackingWindow: 30,        // Track last 30 epochs
            trendAnalysisWindow: 10,   // 10 epochs for trend analysis
            
            // Performance thresholds
            thresholds: {
                significantChange: 0.1,    // 10% change is significant
                trendConfidence: 0.7,      // 70% confidence for trends
                minDataPoints: 5           // Minimum epochs for analysis
            },
            
            // Update frequency
            updateInterval: 600000,    // 10 minutes
            
            // Batch processing
            batchSize: 50
        };
    }

    /**
     * Start historical MEV tracking
     */
    async startTracking() {
        console.log('Starting historical MEV performance tracking...');
        
        try {
            // Initialize historical data
            await this.initializeHistoricalData();
            
            // Start periodic tracking
            this.trackingInterval = setInterval(async () => {
                try {
                    await this.updateHistoricalPerformance();
                } catch (error) {
                    console.error('Error in periodic historical tracking:', error);
                    this.emit('error', error);
                }
            }, this.config.updateInterval);
            
            this.emit('started');
            console.log('Historical MEV tracking started successfully');
            
        } catch (error) {
            console.error('Error starting historical MEV tracking:', error);
            throw error;
        }
    }

    /**
     * Stop historical MEV tracking
     */
    stopTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
        
        console.log('Historical MEV tracking stopped');
        this.emit('stopped');
    }

    /**
     * Initialize historical data for all validators
     */
    async initializeHistoricalData() {
        console.log('Initializing historical MEV data...');
        
        try {
            // Get all validators with MEV attribution data
            const validators = await this.getValidatorsWithMEVData();
            
            console.log(`Found ${validators.length} validators with MEV data`);
            
            // Process validators in batches
            for (let i = 0; i < validators.length; i += this.config.batchSize) {
                const batch = validators.slice(i, i + this.config.batchSize);
                
                await Promise.all(batch.map(validator => 
                    this.initializeValidatorHistory(validator.validator_address)
                ));
                
                console.log(`Processed ${Math.min(i + this.config.batchSize, validators.length)}/${validators.length} validators`);
            }
            
            this.emit('historyInitialized', {
                timestamp: new Date(),
                validatorCount: validators.length
            });
            
        } catch (error) {
            console.error('Error initializing historical data:', error);
            throw error;
        }
    }

    /**
     * Get validators that have MEV attribution data
     */
    async getValidatorsWithMEVData() {
        try {
            const query = `
                SELECT DISTINCT validator_address 
                FROM mev_reward_attributions 
                WHERE analysis_timestamp > NOW() - INTERVAL '30 days'
                ORDER BY validator_address
            `;
            
            const result = await this.db.query(query);
            return result.rows;
            
        } catch (error) {
            console.error('Error getting validators with MEV data:', error);
            return [];
        }
    }

    /**
     * Initialize historical data for a specific validator
     */
    async initializeValidatorHistory(validatorAddress) {
        try {
            // Get available epochs for this validator
            const epochs = await this.getValidatorEpochs(validatorAddress);
            
            if (epochs.length < this.config.thresholds.minDataPoints) {
                console.log(`Insufficient data for validator ${validatorAddress}`);
                return;
            }
            
            // Process each epoch
            for (const epoch of epochs) {
                await this.processEpochPerformance(validatorAddress, epoch);
            }
            
        } catch (error) {
            console.error(`Error initializing history for ${validatorAddress}:`, error);
        }
    }

    /**
     * Get epochs with data for a validator
     */
    async getValidatorEpochs(validatorAddress) {
        try {
            const query = `
                SELECT DISTINCT epoch 
                FROM mev_reward_attributions 
                WHERE validator_address = $1
                ORDER BY epoch DESC
                LIMIT $2
            `;
            
            const result = await this.db.query(query, [validatorAddress, this.config.trackingWindow]);
            return result.rows.map(row => row.epoch);
            
        } catch (error) {
            console.error('Error getting validator epochs:', error);
            return [];
        }
    }

    /**
     * Process MEV performance for a specific epoch
     */
    async processEpochPerformance(validatorAddress, epoch) {
        try {
            // Get MEV data for this epoch
            const mevData = await this.getEpochMEVData(validatorAddress, epoch);
            
            if (!mevData || mevData.length === 0) {
                return;
            }
            
            // Calculate epoch metrics
            const epochMetrics = this.calculateEpochMetrics(mevData);
            
            // Calculate trends
            const trends = await this.calculateTrends(validatorAddress, epoch);
            
            // Calculate comparative metrics
            const comparative = await this.calculateComparativeMetrics(validatorAddress, epoch, epochMetrics);
            
            // Store historical performance data
            await this.storeHistoricalPerformance(validatorAddress, epoch, {
                ...epochMetrics,
                ...trends,
                ...comparative
            });
            
        } catch (error) {
            console.error(`Error processing epoch ${epoch} for ${validatorAddress}:`, error);
        }
    }

    /**
     * Get MEV data for a specific validator and epoch
     */
    async getEpochMEVData(validatorAddress, epoch) {
        try {
            const query = `
                SELECT * FROM mev_reward_attributions
                WHERE validator_address = $1 AND epoch = $2
                ORDER BY block_slot
            `;
            
            const result = await this.db.query(query, [validatorAddress, epoch]);
            return result.rows;
            
        } catch (error) {
            console.error('Error getting epoch MEV data:', error);
            return [];
        }
    }

    /**
     * Calculate epoch-level MEV metrics
     */
    calculateEpochMetrics(mevData) {
        const totalBlocks = mevData.length;
        const mevBlocks = mevData.filter(block => parseFloat(block.mev_rewards) > 0).length;
        const totalMEVRevenue = mevData.reduce((sum, block) => sum + parseFloat(block.mev_rewards || 0), 0);
        const totalRewards = mevData.reduce((sum, block) => sum + parseFloat(block.total_rewards || 0), 0);
        
        return {
            mev_revenue: totalMEVRevenue,
            mev_blocks: mevBlocks,
            total_blocks: totalBlocks,
            mev_block_percentage: totalBlocks > 0 ? (mevBlocks / totalBlocks) * 100 : 0,
            avg_mev_per_block: mevBlocks > 0 ? totalMEVRevenue / mevBlocks : 0,
            mev_share_of_rewards: totalRewards > 0 ? (totalMEVRevenue / totalRewards) * 100 : 0
        };
    }

    /**
     * Calculate performance trends
     */
    async calculateTrends(validatorAddress, currentEpoch) {
        try {
            // Get historical data for trend analysis
            const historicalData = await this.getHistoricalPerformanceData(
                validatorAddress, 
                currentEpoch - this.config.trendAnalysisWindow, 
                currentEpoch - 1
            );
            
            if (historicalData.length < 3) {
                return {
                    revenue_trend: 0,
                    block_trend: 0,
                    efficiency_trend: 0
                };
            }
            
            // Calculate trends using linear regression
            const epochs = historicalData.map((_, index) => index);
            const revenues = historicalData.map(data => parseFloat(data.mev_revenue || 0));
            const blockPercentages = historicalData.map(data => parseFloat(data.mev_block_percentage || 0));
            const avgMevPerBlock = historicalData.map(data => parseFloat(data.mev_revenue || 0) / Math.max(data.mev_blocks || 1, 1));
            
            return {
                revenue_trend: this.calculateLinearTrend(epochs, revenues),
                block_trend: this.calculateLinearTrend(epochs, blockPercentages),
                efficiency_trend: this.calculateLinearTrend(epochs, avgMevPerBlock)
            };
            
        } catch (error) {
            console.error('Error calculating trends:', error);
            return {
                revenue_trend: 0,
                block_trend: 0,
                efficiency_trend: 0
            };
        }
    }

    /**
     * Calculate linear trend using simple linear regression
     */
    calculateLinearTrend(x, y) {
        if (x.length !== y.length || x.length < 2) return 0;
        
        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        
        const denominator = n * sumXX - sumX * sumX;
        if (denominator === 0) return 0;
        
        const slope = (n * sumXY - sumX * sumY) / denominator;
        return slope;
    }

    /**
     * Get historical performance data for trend analysis
     */
    async getHistoricalPerformanceData(validatorAddress, startEpoch, endEpoch) {
        try {
            const query = `
                SELECT * FROM historical_mev_performance
                WHERE validator_address = $1 
                AND epoch BETWEEN $2 AND $3
                ORDER BY epoch
            `;
            
            const result = await this.db.query(query, [validatorAddress, startEpoch, endEpoch]);
            return result.rows;
            
        } catch (error) {
            console.error('Error getting historical performance data:', error);
            return [];
        }
    }

    /**
     * Calculate comparative metrics against network and peers
     */
    async calculateComparativeMetrics(validatorAddress, epoch, epochMetrics) {
        try {
            // Get network totals for this epoch
            const networkTotals = await this.getNetworkMEVTotals(epoch);
            
            // Calculate network share
            const networkMEVShare = networkTotals.total_mev > 0 ? 
                epochMetrics.mev_revenue / networkTotals.total_mev : 0;
            
            // Get validator rankings for this epoch
            const rankings = await this.getEpochValidatorRankings(epoch);
            
            // Find this validator's rank
            const validatorRanking = rankings.find(r => r.validator_address === validatorAddress);
            const networkRank = validatorRanking ? validatorRanking.rank : 0;
            
            // Get type-specific rank (Jito vs regular)
            const isJitoEnabled = validatorRanking ? validatorRanking.is_jito_enabled : false;
            const typeRankings = rankings.filter(r => r.is_jito_enabled === isJitoEnabled);
            const validatorTypeRank = typeRankings.findIndex(r => r.validator_address === validatorAddress) + 1;
            
            return {
                network_mev_share: networkMEVShare,
                network_rank: networkRank,
                validator_type_rank: validatorTypeRank,
                total_network_validators: rankings.length,
                total_type_validators: typeRankings.length
            };
            
        } catch (error) {
            console.error('Error calculating comparative metrics:', error);
            return {
                network_mev_share: 0,
                network_rank: 0,
                validator_type_rank: 0,
                total_network_validators: 0,
                total_type_validators: 0
            };
        }
    }

    /**
     * Get network MEV totals for an epoch
     */
    async getNetworkMEVTotals(epoch) {
        try {
            const query = `
                SELECT 
                    SUM(mev_rewards) as total_mev,
                    COUNT(DISTINCT validator_address) as validator_count,
                    COUNT(*) as total_blocks
                FROM mev_reward_attributions
                WHERE epoch = $1
            `;
            
            const result = await this.db.query(query, [epoch]);
            return {
                total_mev: parseFloat(result.rows[0]?.total_mev || 0),
                validator_count: parseInt(result.rows[0]?.validator_count || 0),
                total_blocks: parseInt(result.rows[0]?.total_blocks || 0)
            };
            
        } catch (error) {
            console.error('Error getting network MEV totals:', error);
            return { total_mev: 0, validator_count: 0, total_blocks: 0 };
        }
    }

    /**
     * Get validator rankings for an epoch
     */
    async getEpochValidatorRankings(epoch) {
        try {
            const query = `
                SELECT 
                    validator_address,
                    SUM(mev_rewards) as total_mev,
                    COUNT(*) as mev_blocks,
                    MAX(pbr.is_jito_enabled) as is_jito_enabled,
                    ROW_NUMBER() OVER (ORDER BY SUM(mev_rewards) DESC) as rank
                FROM mev_reward_attributions mra
                LEFT JOIN parsed_block_rewards pbr ON mra.block_slot = pbr.slot
                WHERE mra.epoch = $1
                GROUP BY validator_address
                ORDER BY total_mev DESC
            `;
            
            const result = await this.db.query(query, [epoch]);
            return result.rows;
            
        } catch (error) {
            console.error('Error getting epoch validator rankings:', error);
            return [];
        }
    }

    /**
     * Store historical performance data
     */
    async storeHistoricalPerformance(validatorAddress, epoch, performanceData) {
        try {
            const query = `
                INSERT INTO historical_mev_performance (
                    validator_address, epoch, mev_revenue, mev_blocks, total_blocks,
                    mev_block_percentage, revenue_trend, block_trend, efficiency_trend,
                    network_mev_share, validator_type_rank, network_rank,
                    data_quality_score, analysis_confidence
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
                )
                ON CONFLICT (validator_address, epoch)
                DO UPDATE SET
                    mev_revenue = EXCLUDED.mev_revenue,
                    mev_blocks = EXCLUDED.mev_blocks,
                    total_blocks = EXCLUDED.total_blocks,
                    mev_block_percentage = EXCLUDED.mev_block_percentage,
                    revenue_trend = EXCLUDED.revenue_trend,
                    block_trend = EXCLUDED.block_trend,
                    efficiency_trend = EXCLUDED.efficiency_trend,
                    network_mev_share = EXCLUDED.network_mev_share,
                    validator_type_rank = EXCLUDED.validator_type_rank,
                    network_rank = EXCLUDED.network_rank,
                    data_quality_score = EXCLUDED.data_quality_score,
                    analysis_confidence = EXCLUDED.analysis_confidence
            `;
            
            // Calculate data quality and confidence scores
            const dataQualityScore = Math.min(1, performanceData.total_blocks / 100); // Normalize by expected block count
            const analysisConfidence = Math.min(1, performanceData.total_blocks >= 10 ? 0.9 : performanceData.total_blocks / 10);
            
            await this.db.query(query, [
                validatorAddress,
                epoch,
                performanceData.mev_revenue || 0,
                performanceData.mev_blocks || 0,
                performanceData.total_blocks || 0,
                performanceData.mev_block_percentage || 0,
                performanceData.revenue_trend || 0,
                performanceData.block_trend || 0,
                performanceData.efficiency_trend || 0,
                performanceData.network_mev_share || 0,
                performanceData.validator_type_rank || 0,
                performanceData.network_rank || 0,
                dataQualityScore,
                analysisConfidence
            ]);
            
        } catch (error) {
            console.error('Error storing historical performance:', error);
        }
    }

    /**
     * Update historical performance for recent epochs
     */
    async updateHistoricalPerformance() {
        console.log('Updating historical MEV performance...');
        
        try {
            // Get recent epochs that need updating
            const recentEpochs = await this.getRecentEpochs();
            
            if (recentEpochs.length === 0) {
                console.log('No recent epochs to update');
                return;
            }
            
            // Get validators with recent activity
            const validators = await this.getActiveValidators(recentEpochs);
            
            let processed = 0;
            
            // Update performance for each validator and epoch combination
            for (const validator of validators) {
                for (const epoch of recentEpochs) {
                    await this.processEpochPerformance(validator.validator_address, epoch);
                    processed++;
                }
            }
            
            this.emit('performanceUpdated', {
                timestamp: new Date(),
                epochsProcessed: recentEpochs.length,
                validatorsProcessed: validators.length,
                totalRecordsProcessed: processed
            });
            
            console.log(`Updated historical performance: ${processed} records processed`);
            
        } catch (error) {
            console.error('Error updating historical performance:', error);
        }
    }

    /**
     * Get recent epochs that need updating
     */
    async getRecentEpochs(count = 5) {
        try {
            const query = `
                SELECT DISTINCT epoch 
                FROM mev_reward_attributions 
                WHERE analysis_timestamp > NOW() - INTERVAL '24 hours'
                ORDER BY epoch DESC
                LIMIT $1
            `;
            
            const result = await this.db.query(query, [count]);
            return result.rows.map(row => row.epoch);
            
        } catch (error) {
            console.error('Error getting recent epochs:', error);
            return [];
        }
    }

    /**
     * Get validators with activity in recent epochs
     */
    async getActiveValidators(epochs) {
        try {
            const query = `
                SELECT DISTINCT validator_address 
                FROM mev_reward_attributions 
                WHERE epoch = ANY($1)
                ORDER BY validator_address
            `;
            
            const result = await this.db.query(query, [epochs]);
            return result.rows;
            
        } catch (error) {
            console.error('Error getting active validators:', error);
            return [];
        }
    }

    /**
     * Get historical MEV performance for a validator
     */
    async getValidatorHistoricalPerformance(validatorAddress, epochCount = 30) {
        try {
            const query = `
                SELECT * FROM historical_mev_performance
                WHERE validator_address = $1
                ORDER BY epoch DESC
                LIMIT $2
            `;
            
            const result = await this.db.query(query, [validatorAddress, epochCount]);
            
            return {
                validator_address: validatorAddress,
                historical_data: result.rows.reverse(), // Return in chronological order
                summary: this.calculateHistoricalSummary(result.rows)
            };
            
        } catch (error) {
            console.error('Error getting validator historical performance:', error);
            throw error;
        }
    }

    /**
     * Calculate summary statistics for historical data
     */
    calculateHistoricalSummary(historicalData) {
        if (historicalData.length === 0) {
            return {
                total_epochs: 0,
                total_mev_revenue: 0,
                avg_mev_per_epoch: 0,
                best_epoch_revenue: 0,
                consistency_score: 0
            };
        }
        
        const totalRevenue = historicalData.reduce((sum, epoch) => sum + parseFloat(epoch.mev_revenue || 0), 0);
        const avgRevenue = totalRevenue / historicalData.length;
        const maxRevenue = Math.max(...historicalData.map(epoch => parseFloat(epoch.mev_revenue || 0)));
        
        // Calculate consistency (inverse of coefficient of variation)
        const revenues = historicalData.map(epoch => parseFloat(epoch.mev_revenue || 0));
        const stdDev = this.calculateStandardDeviation(revenues);
        const consistency = avgRevenue > 0 ? Math.max(0, 1 - (stdDev / avgRevenue)) : 0;
        
        return {
            total_epochs: historicalData.length,
            total_mev_revenue: totalRevenue,
            avg_mev_per_epoch: avgRevenue,
            best_epoch_revenue: maxRevenue,
            consistency_score: consistency
        };
    }

    /**
     * Calculate standard deviation
     */
    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        
        return Math.sqrt(variance);
    }
}

module.exports = HistoricalMEVTracker;