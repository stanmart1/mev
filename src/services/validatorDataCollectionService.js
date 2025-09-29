const EventEmitter = require('events');
const { Connection, clusterApiUrl } = require('@solana/web3.js');

/**
 * Validator Data Collection Service
 * Comprehensive data collection system for validator performance metrics
 */
class ValidatorDataCollectionService extends EventEmitter {
    constructor(database, solanaConnection) {
        super();
        this.db = database;
        this.connection = solanaConnection;
        this.collectionInterval = null;
        this.epochChangeInterval = null;
        this.validatorCache = new Map();
        this.currentEpoch = null;
        this.isCollecting = false;
    }

    /**
     * Start validator data collection
     */
    async startDataCollection(intervalMs = 300000) { // 5 minutes
        console.log('Starting validator data collection service...');
        
        try {
            // Initialize current epoch
            await this.updateCurrentEpoch();
            
            // Start initial data collection
            await this.collectAllValidatorData();
            
            // Set up periodic data collection
            this.collectionInterval = setInterval(async () => {
                try {
                    await this.collectAllValidatorData();
                } catch (error) {
                    console.error('Error in periodic data collection:', error);
                    this.emit('error', error);
                }
            }, intervalMs);
            
            // Set up epoch change monitoring
            this.epochChangeInterval = setInterval(async () => {
                try {
                    await this.checkForEpochChange();
                } catch (error) {
                    console.error('Error checking epoch change:', error);
                }
            }, 60000); // Check every minute
            
            this.isCollecting = true;
            this.emit('started', { interval: intervalMs });
            
        } catch (error) {
            console.error('Error starting data collection:', error);
            throw error;
        }
    }

    /**
     * Stop data collection
     */
    stopDataCollection() {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }
        
        if (this.epochChangeInterval) {
            clearInterval(this.epochChangeInterval);
            this.epochChangeInterval = null;
        }
        
        this.isCollecting = false;
        console.log('Validator data collection stopped');
        this.emit('stopped');
    }

    /**
     * Check for epoch changes and trigger full collection
     */
    async checkForEpochChange() {
        try {
            const epochInfo = await this.connection.getEpochInfo();
            
            if (this.currentEpoch !== null && epochInfo.epoch !== this.currentEpoch) {
                console.log(`Epoch changed from ${this.currentEpoch} to ${epochInfo.epoch}`);
                
                // Trigger full data collection for new epoch
                await this.collectAllValidatorData();
                
                // Update current epoch
                this.currentEpoch = epochInfo.epoch;
                
                this.emit('epochChanged', {
                    previousEpoch: this.currentEpoch,
                    currentEpoch: epochInfo.epoch,
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.error('Error checking epoch change:', error);
        }
    }

    /**
     * Update current epoch information
     */
    async updateCurrentEpoch() {
        try {
            const epochInfo = await this.connection.getEpochInfo();
            this.currentEpoch = epochInfo.epoch;
            return epochInfo;
        } catch (error) {
            console.error('Error updating current epoch:', error);
            throw error;
        }
    }

    /**
     * Collect data for all validators
     */
    async collectAllValidatorData() {
        if (this.isCollecting) {
            console.log('Data collection already in progress, skipping...');
            return;
        }
        
        this.isCollecting = true;
        
        try {
            console.log('Starting comprehensive validator data collection...');
            
            // Get current epoch info
            const epochInfo = await this.updateCurrentEpoch();
            
            // Get all vote accounts (validators)
            const voteAccounts = await this.connection.getVoteAccounts();
            const allValidators = [...voteAccounts.current, ...voteAccounts.delinquent];
            
            console.log(`Found ${allValidators.length} validators to process`);
            
            const results = {
                processed: 0,
                successful: 0,
                failed: 0,
                errors: []
            };
            
            // Process validators in batches to avoid overwhelming the RPC
            const batchSize = 10;
            for (let i = 0; i < allValidators.length; i += batchSize) {
                const batch = allValidators.slice(i, i + batchSize);
                
                await Promise.allSettled(
                    batch.map(async (validator) => {
                        try {
                            await this.collectValidatorData(validator, epochInfo);
                            results.successful++;
                        } catch (error) {
                            results.failed++;
                            results.errors.push({
                                validator: validator.votePubkey,
                                error: error.message
                            });
                        }
                        results.processed++;
                    })
                );
                
                // Small delay between batches
                await this.sleep(100);
            }
            
            console.log(`Data collection completed: ${results.successful} successful, ${results.failed} failed`);
            
            this.emit('dataCollected', {
                timestamp: new Date(),
                epoch: epochInfo.epoch,
                ...results
            });
            
        } catch (error) {
            console.error('Error in comprehensive data collection:', error);
            this.emit('error', error);
        } finally {
            this.isCollecting = false;
        }
    }

    /**
     * Collect data for a specific validator
     */
    async collectValidatorData(validator, epochInfo) {
        try {
            const validatorAddress = validator.votePubkey;
            
            // Collect basic validator information
            const validatorData = await this.getValidatorInfo(validator, epochInfo);
            
            // Check if validator is Jito-enabled
            const isJitoEnabled = await this.checkJitoStatus(validatorAddress);
            validatorData.is_jito_enabled = isJitoEnabled;
            
            // Collect additional performance metrics
            const performanceMetrics = await this.getValidatorPerformanceMetrics(validatorAddress);
            Object.assign(validatorData, performanceMetrics);
            
            // Store in database
            await this.storeValidatorData(validatorData);
            
            // Update cache
            this.validatorCache.set(validatorAddress, {
                ...validatorData,
                last_updated: new Date()
            });
            
            return validatorData;
            
        } catch (error) {
            console.error(`Error collecting data for validator ${validator.votePubkey}:`, error);
            throw error;
        }
    }

    /**
     * Get basic validator information
     */
    async getValidatorInfo(validator, epochInfo) {
        return {
            validator_address: validator.votePubkey,
            epoch: epochInfo.epoch,
            timestamp: new Date(),
            epoch_rewards: validator.epochCredits || 0,
            stake_amount: validator.activatedStake / 1000000000, // Convert lamports to SOL
            commission_rate: validator.commission / 100, // Convert to decimal
            vote_credits: validator.epochVoteAccount?.epochCredits || 0,
            uptime_percentage: this.calculateUptimePercentage(validator),
            is_jito_enabled: false // Will be updated later
        };
    }

    /**
     * Get additional performance metrics for a validator
     */
    async getValidatorPerformanceMetrics(validatorAddress) {
        try {
            // Get validator account information
            const accountInfo = await this.connection.getAccountInfo(validatorAddress);
            
            // Get vote account information
            const voteAccountInfo = await this.connection.getVoteAccounts();
            const validatorVoteAccount = [...voteAccountInfo.current, ...voteAccountInfo.delinquent]
                .find(v => v.votePubkey === validatorAddress);
            
            if (!validatorVoteAccount) {
                return {
                    node_version: null,
                    last_vote_slot: 0,
                    root_slot: 0
                };
            }
            
            return {
                node_version: validatorVoteAccount.version || null,
                last_vote_slot: validatorVoteAccount.lastVote || 0,
                root_slot: validatorVoteAccount.rootSlot || 0
            };
            
        } catch (error) {
            console.error(`Error getting performance metrics for ${validatorAddress}:`, error);
            return {
                node_version: null,
                last_vote_slot: 0,
                root_slot: 0
            };
        }
    }

    /**
     * Check if validator is Jito-enabled
     */
    async checkJitoStatus(validatorAddress) {
        try {
            // This is a simplified check - in practice, you would need to query
            // Jito's validator registry or check for specific MEV transaction patterns
            
            // For now, we'll use a heuristic based on validator behavior
            // Check recent transaction patterns or known Jito validator lists
            
            // Mock implementation - replace with actual Jito detection logic
            const knownJitoValidators = await this.getKnownJitoValidators();
            return knownJitoValidators.includes(validatorAddress);
            
        } catch (error) {
            console.error(`Error checking Jito status for ${validatorAddress}:`, error);
            return false;
        }
    }

    /**
     * Get list of known Jito validators
     */
    async getKnownJitoValidators() {
        try {
            // In practice, this would query Jito's API or maintain a registry
            // For now, return validators we've identified as Jito-enabled
            const query = `
                SELECT DISTINCT validator_address 
                FROM validator_performance 
                WHERE is_jito_enabled = true
            `;
            
            const result = await this.db.query(query);
            return result.rows.map(row => row.validator_address);
            
        } catch (error) {
            console.error('Error getting known Jito validators:', error);
            return [];
        }
    }

    /**
     * Calculate uptime percentage for validator
     */
    calculateUptimePercentage(validator) {
        try {
            // Calculate based on vote credits and expected votes
            const epochCredits = validator.epochCredits || 0;
            const expectedCredits = 432000; // Approximate expected credits per epoch
            
            return Math.min(100, (epochCredits / expectedCredits) * 100);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Store validator data in database
     */
    async storeValidatorData(validatorData) {
        try {
            const query = `
                INSERT INTO validator_performance (
                    validator_address, epoch, timestamp, epoch_rewards, stake_amount,
                    commission_rate, is_jito_enabled, uptime_percentage, vote_credits
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (validator_address, epoch)
                DO UPDATE SET
                    timestamp = EXCLUDED.timestamp,
                    epoch_rewards = EXCLUDED.epoch_rewards,
                    stake_amount = EXCLUDED.stake_amount,
                    commission_rate = EXCLUDED.commission_rate,
                    is_jito_enabled = EXCLUDED.is_jito_enabled,
                    uptime_percentage = EXCLUDED.uptime_percentage,
                    vote_credits = EXCLUDED.vote_credits,
                    updated_at = NOW()
            `;
            
            await this.db.query(query, [
                validatorData.validator_address,
                validatorData.epoch,
                validatorData.timestamp,
                validatorData.epoch_rewards,
                validatorData.stake_amount,
                validatorData.commission_rate,
                validatorData.is_jito_enabled,
                validatorData.uptime_percentage,
                validatorData.vote_credits
            ]);
            
        } catch (error) {
            console.error('Error storing validator data:', error);
            throw error;
        }
    }

    /**
     * Collect historical data for a specific validator
     */
    async collectHistoricalValidatorData(validatorAddress, epochCount = 30) {
        try {
            console.log(`Collecting historical data for validator ${validatorAddress}...`);
            
            const currentEpoch = await this.getCurrentEpoch();
            const results = [];
            
            for (let i = 0; i < epochCount; i++) {
                const targetEpoch = currentEpoch - i;
                if (targetEpoch <= 0) break;
                
                try {
                    // Get historical epoch data
                    const epochData = await this.getHistoricalEpochData(validatorAddress, targetEpoch);
                    if (epochData) {
                        await this.storeValidatorData(epochData);
                        results.push(epochData);
                    }
                } catch (error) {
                    console.error(`Error collecting epoch ${targetEpoch} data:`, error);
                }
            }
            
            console.log(`Collected ${results.length} historical epochs for ${validatorAddress}`);
            return results;
            
        } catch (error) {
            console.error('Error collecting historical validator data:', error);
            throw error;
        }
    }

    /**
     * Get historical epoch data for validator
     */
    async getHistoricalEpochData(validatorAddress, epoch) {
        try {
            // This would typically query historical RPC data or use archived data
            // For now, we'll return null to indicate unavailable historical data
            return null;
        } catch (error) {
            console.error(`Error getting historical data for epoch ${epoch}:`, error);
            return null;
        }
    }

    /**
     * Bulk update Jito status for validators
     */
    async bulkUpdateJitoStatus(validatorStatusMap) {
        try {
            console.log('Performing bulk Jito status update...');
            
            for (const [validatorAddress, isJitoEnabled] of validatorStatusMap.entries()) {
                const query = `
                    UPDATE validator_performance 
                    SET is_jito_enabled = $1, updated_at = NOW()
                    WHERE validator_address = $2
                `;
                
                await this.db.query(query, [isJitoEnabled, validatorAddress]);
            }
            
            console.log(`Updated Jito status for ${validatorStatusMap.size} validators`);
            
        } catch (error) {
            console.error('Error in bulk Jito status update:', error);
            throw error;
        }
    }

    /**
     * Get validator data from cache or database
     */
    async getValidatorData(validatorAddress, epoch = null) {
        try {
            // Check cache first
            if (this.validatorCache.has(validatorAddress)) {
                const cached = this.validatorCache.get(validatorAddress);
                if (Date.now() - cached.last_updated.getTime() < 300000) { // 5 minutes
                    return cached;
                }
            }
            
            // Query database
            let query, params;
            if (epoch) {
                query = `
                    SELECT * FROM validator_performance 
                    WHERE validator_address = $1 AND epoch = $2
                `;
                params = [validatorAddress, epoch];
            } else {
                query = `
                    SELECT * FROM validator_performance 
                    WHERE validator_address = $1 
                    ORDER BY epoch DESC LIMIT 1
                `;
                params = [validatorAddress];
            }
            
            const result = await this.db.query(query, params);
            return result.rows[0] || null;
            
        } catch (error) {
            console.error('Error getting validator data:', error);
            throw error;
        }
    }

    /**
     * Get data collection statistics
     */
    async getCollectionStatistics(days = 7) {
        try {
            const query = `
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(DISTINCT validator_address) as validator_count,
                    COUNT(*) as total_records,
                    AVG(epoch_rewards) as avg_rewards,
                    AVG(stake_amount) as avg_stake,
                    SUM(CASE WHEN is_jito_enabled THEN 1 ELSE 0 END) as jito_count
                FROM validator_performance 
                WHERE timestamp > NOW() - INTERVAL '${days} days'
                GROUP BY DATE(timestamp)
                ORDER BY date DESC
            `;
            
            const result = await this.db.query(query);
            return result.rows;
            
        } catch (error) {
            console.error('Error getting collection statistics:', error);
            throw error;
        }
    }

    /**
     * Clean up old data
     */
    async cleanupOldData(retentionDays = 90) {
        try {
            const query = `
                DELETE FROM validator_performance 
                WHERE timestamp < NOW() - INTERVAL '${retentionDays} days'
            `;
            
            const result = await this.db.query(query);
            console.log(`Cleaned up ${result.rowCount} old validator performance records`);
            
            return result.rowCount;
            
        } catch (error) {
            console.error('Error cleaning up old data:', error);
            throw error;
        }
    }

    // Helper methods
    async getCurrentEpoch() {
        try {
            const epochInfo = await this.connection.getEpochInfo();
            return epochInfo.epoch;
        } catch (error) {
            console.error('Error getting current epoch:', error);
            return 0;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isDataCollectionRunning() {
        return this.isCollecting;
    }

    getValidatorCacheSize() {
        return this.validatorCache.size;
    }

    clearValidatorCache() {
        this.validatorCache.clear();
    }
}

module.exports = ValidatorDataCollectionService;