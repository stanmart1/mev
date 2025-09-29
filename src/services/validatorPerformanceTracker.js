const { EventEmitter } = require('events');
const { PublicKey } = require('@solana/web3.js');

/**
 * Validator Performance Tracking System
 * Monitors epoch rewards, stake amounts, commission rates, and MEV efficiency
 */
class ValidatorPerformanceTracker extends EventEmitter {
    constructor(solanaService, databasePool, config = {}) {
        super();
        this.solanaService = solanaService;
        this.databasePool = databasePool;
        
        this.config = {
            trackingInterval: config.trackingInterval || 300000, // 5 minutes
            epochTrackingEnabled: config.epochTrackingEnabled !== false,
            mevTrackingEnabled: config.mevTrackingEnabled !== false,
            maxValidatorsToTrack: config.maxValidatorsToTrack || 500,
            dataRetentionEpochs: config.dataRetentionEpochs || 100,
            jitoValidatorEndpoint: config.jitoValidatorEndpoint || 'https://mainnet.block-engine.jito.wtf/api/v1/validators',
            ...config
        };

        // Validator data storage
        this.validatorData = {
            active: new Map(),
            historical: new Map(),
            jitoEnabled: new Set(),
            performance: new Map(),
            rankings: new Map()
        };

        // Epoch tracking
        this.currentEpoch = 0;
        this.epochStartTime = Date.now();
        this.epochHistory = new Map();

        // MEV tracking
        this.mevMetrics = new Map();
        
        // Performance calculation intervals
        this.trackingInterval = null;
        this.epochCheckInterval = null;

        this.initializeTracking();
    }

    /**
     * Initialize the tracking system
     */
    async initializeTracking() {
        try {
            // Load existing validator data
            await this.loadValidatorData();
            
            // Get current epoch information
            await this.updateEpochInfo();
            
            // Load Jito validator list
            await this.updateJitoValidatorList();
            
            // Start tracking intervals
            this.startTracking();
            
            this.emit('trackingInitialized', {
                validatorCount: this.validatorData.active.size,
                jitoValidatorCount: this.validatorData.jitoEnabled.size,
                currentEpoch: this.currentEpoch
            });
            
        } catch (error) {
            this.emit('error', { message: 'Failed to initialize tracking', error });
            throw error;
        }
    }

    /**
     * Start tracking intervals
     */
    startTracking() {
        // Main tracking interval
        this.trackingInterval = setInterval(async () => {
            try {
                await this.performTrackingCycle();
            } catch (error) {
                this.emit('error', { message: 'Tracking cycle failed', error });
            }
        }, this.config.trackingInterval);

        // Epoch check interval (more frequent)
        this.epochCheckInterval = setInterval(async () => {
            try {
                await this.checkEpochChange();
            } catch (error) {
                this.emit('error', { message: 'Epoch check failed', error });
            }
        }, 60000); // Check every minute
    }

    /**
     * Perform main tracking cycle
     */
    async performTrackingCycle() {
        const startTime = Date.now();
        
        try {
            // Update validator information
            await this.updateValidatorInfo();
            
            // Update MEV metrics
            if (this.config.mevTrackingEnabled) {
                await this.updateMEVMetrics();
            }
            
            // Calculate performance metrics
            await this.calculatePerformanceMetrics();
            
            // Update rankings
            await this.updateValidatorRankings();
            
            // Store data
            await this.storePerformanceData();
            
            const duration = Date.now() - startTime;
            this.emit('trackingCycleComplete', {
                duration,
                validatorsTracked: this.validatorData.active.size,
                timestamp: Date.now()
            });
            
        } catch (error) {
            this.emit('error', { message: 'Tracking cycle error', error });
        }
    }

    /**
     * Update current epoch information
     */
    async updateEpochInfo() {
        try {
            const connection = this.solanaService.getConnection();
            const epochInfo = await connection.getEpochInfo();
            
            if (epochInfo.epoch !== this.currentEpoch) {
                // Epoch changed - trigger epoch-end processing
                await this.handleEpochChange(this.currentEpoch, epochInfo.epoch);
            }
            
            this.currentEpoch = epochInfo.epoch;
            this.epochStartTime = Date.now() - (epochInfo.slotIndex * 400); // Approximate start time
            
            return epochInfo;
        } catch (error) {
            throw new Error(`Failed to update epoch info: ${error.message}`);
        }
    }

    /**
     * Handle epoch change
     */
    async handleEpochChange(oldEpoch, newEpoch) {
        try {
            // Finalize previous epoch data
            if (oldEpoch > 0) {
                await this.finalizeEpochData(oldEpoch);
            }
            
            // Initialize new epoch tracking
            await this.initializeEpochTracking(newEpoch);
            
            this.emit('epochChanged', {
                oldEpoch,
                newEpoch,
                validatorsTracked: this.validatorData.active.size
            });
            
        } catch (error) {
            this.emit('error', { message: 'Epoch change handling failed', error });
        }
    }

    /**
     * Update validator information
     */
    async updateValidatorInfo() {
        try {
            const connection = this.solanaService.getConnection();
            
            // Get all validators
            const voteAccounts = await connection.getVoteAccounts();
            const allValidators = [...voteAccounts.current, ...voteAccounts.delinquent];
            
            // Process each validator
            for (const validator of allValidators) {
                await this.processValidatorData(validator);
            }
            
            // Clean up inactive validators
            this.cleanupInactiveValidators(allValidators);
            
        } catch (error) {
            throw new Error(`Failed to update validator info: ${error.message}`);
        }
    }

    /**
     * Process individual validator data
     */
    async processValidatorData(validatorInfo) {
        const validatorPubkey = validatorInfo.votePubkey;
        const nodePubkey = validatorInfo.nodePubkey;
        
        const validatorData = {
            votePubkey: validatorPubkey,
            nodePubkey: nodePubkey,
            activatedStake: validatorInfo.activatedStake || 0,
            commission: validatorInfo.commission || 0,
            epochVoteAccount: validatorInfo.epochVoteAccount || false,
            epochCredits: validatorInfo.epochCredits || [],
            lastVote: validatorInfo.lastVote || 0,
            rootSlot: validatorInfo.rootSlot || 0,
            
            // Additional tracking data
            isJitoEnabled: this.validatorData.jitoEnabled.has(validatorPubkey),
            lastUpdated: Date.now(),
            epoch: this.currentEpoch,
            
            // Performance metrics (calculated separately)
            performance: {
                apy: 0,
                skipRate: 0,
                uptimeScore: 0,
                mevEfficiency: 0,
                totalRewards: 0
            }
        };

        // Store validator data
        this.validatorData.active.set(validatorPubkey, validatorData);
        
        // Update historical tracking
        this.updateHistoricalData(validatorPubkey, validatorData);
        
        return validatorData;
    }

    /**
     * Update Jito validator list
     */
    async updateJitoValidatorList() {
        try {
            // In production, this would fetch from actual Jito API
            // For now, we'll use a mock implementation
            const jitoValidators = await this.fetchJitoValidators();
            
            this.validatorData.jitoEnabled.clear();
            jitoValidators.forEach(validator => {
                this.validatorData.jitoEnabled.add(validator.pubkey);
            });
            
            this.emit('jitoValidatorListUpdated', {
                count: this.validatorData.jitoEnabled.size,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.warn('Failed to update Jito validator list:', error.message);
            // Continue with existing data
        }
    }

    /**
     * Fetch Jito validators (mock implementation)
     */
    async fetchJitoValidators() {
        // Mock Jito validator data - in production, fetch from actual API
        const mockJitoValidators = [];
        const jitoCount = Math.floor(Math.random() * 50) + 20; // 20-70 validators
        
        for (let i = 0; i < jitoCount; i++) {
            mockJitoValidators.push({
                pubkey: `jito_validator_${i}_${Math.random().toString(36).substr(2, 9)}`,
                mevCommission: Math.random() * 10, // 0-10%
                bundles24h: Math.floor(Math.random() * 1000),
                mevRewards24h: Math.random() * 100
            });
        }
        
        return mockJitoValidators;
    }

    /**
     * Update MEV metrics for validators
     */
    async updateMEVMetrics() {
        try {
            for (const [validatorPubkey, validatorData] of this.validatorData.active) {
                if (validatorData.isJitoEnabled) {
                    const mevMetrics = await this.calculateValidatorMEVMetrics(validatorPubkey);
                    this.mevMetrics.set(validatorPubkey, mevMetrics);
                }
            }
        } catch (error) {
            throw new Error(`Failed to update MEV metrics: ${error.message}`);
        }
    }

    /**
     * Calculate MEV metrics for a validator
     */
    async calculateValidatorMEVMetrics(validatorPubkey) {
        // Mock implementation - in production, query actual MEV data
        const mockMetrics = {
            bundles24h: Math.floor(Math.random() * 500),
            mevRewards24h: Math.random() * 50,
            mevRewardsTotal: Math.random() * 1000,
            averageBundleValue: Math.random() * 0.1,
            mevCommission: Math.random() * 10,
            bundleSuccessRate: 0.7 + Math.random() * 0.25,
            
            // Efficiency metrics
            mevPerStake: 0,
            mevPerBlock: 0,
            competitiveRanking: 0,
            
            timestamp: Date.now(),
            epoch: this.currentEpoch
        };
        
        // Calculate efficiency metrics
        const validatorData = this.validatorData.active.get(validatorPubkey);
        if (validatorData && validatorData.activatedStake > 0) {
            mockMetrics.mevPerStake = mockMetrics.mevRewards24h / (validatorData.activatedStake / 1e9);
            mockMetrics.mevPerBlock = mockMetrics.mevRewards24h / Math.max(1, mockMetrics.bundles24h);
        }
        
        return mockMetrics;
    }

    /**
     * Calculate performance metrics for all validators
     */
    async calculatePerformanceMetrics() {
        try {
            for (const [validatorPubkey, validatorData] of this.validatorData.active) {
                const performance = await this.calculateValidatorPerformance(validatorPubkey, validatorData);
                validatorData.performance = performance;
                
                // Store performance metrics
                this.validatorData.performance.set(validatorPubkey, performance);
            }
        } catch (error) {
            throw new Error(`Failed to calculate performance metrics: ${error.message}`);
        }
    }

    /**
     * Calculate performance metrics for a single validator
     */
    async calculateValidatorPerformance(validatorPubkey, validatorData) {
        const historical = this.validatorData.historical.get(validatorPubkey) || [];
        const mevMetrics = this.mevMetrics.get(validatorPubkey);
        
        // Calculate APY based on epoch credits
        const apy = this.calculateAPY(validatorData, historical);
        
        // Calculate skip rate
        const skipRate = this.calculateSkipRate(validatorData, historical);
        
        // Calculate uptime score
        const uptimeScore = this.calculateUptimeScore(validatorData, historical);
        
        // Calculate total rewards
        const totalRewards = this.calculateTotalRewards(validatorData, mevMetrics);
        
        // Calculate MEV efficiency
        const mevEfficiency = this.calculateMEVEfficiency(validatorData, mevMetrics);
        
        return {
            apy,
            skipRate,
            uptimeScore,
            mevEfficiency,
            totalRewards,
            
            // Additional metrics
            stakeGrowth: this.calculateStakeGrowth(validatorData, historical),
            commissionTrend: this.calculateCommissionTrend(validatorData, historical),
            performanceScore: this.calculateOverallPerformanceScore({
                apy, skipRate, uptimeScore, mevEfficiency
            }),
            
            calculatedAt: Date.now(),
            epoch: this.currentEpoch
        };
    }

    /**
     * Calculate APY for validator
     */
    calculateAPY(validatorData, historical) {
        if (!validatorData.epochCredits || validatorData.epochCredits.length < 2) {
            return 0;
        }
        
        // Mock APY calculation - in production, use actual epoch credits
        const baseAPY = 6 + Math.random() * 4; // 6-10% base APY
        const commissionImpact = validatorData.commission / 100;
        
        return Math.max(0, baseAPY * (1 - commissionImpact));
    }

    /**
     * Calculate skip rate for validator
     */
    calculateSkipRate(validatorData, historical) {
        // Mock skip rate - in production, calculate from actual block production data
        return Math.random() * 0.05; // 0-5% skip rate
    }

    /**
     * Calculate uptime score
     */
    calculateUptimeScore(validatorData, historical) {
        // Mock uptime score - in production, calculate from vote activity
        return 0.95 + Math.random() * 0.05; // 95-100% uptime
    }

    /**
     * Calculate total rewards (staking + MEV)
     */
    calculateTotalRewards(validatorData, mevMetrics) {
        const stakingRewards = (validatorData.activatedStake / 1e9) * (validatorData.performance?.apy || 0) / 365;
        const mevRewards = mevMetrics?.mevRewards24h || 0;
        
        return stakingRewards + mevRewards;
    }

    /**
     * Calculate MEV efficiency score
     */
    calculateMEVEfficiency(validatorData, mevMetrics) {
        if (!validatorData.isJitoEnabled || !mevMetrics) {
            return 0;
        }
        
        // MEV efficiency based on multiple factors
        const bundleSuccessRate = mevMetrics.bundleSuccessRate || 0;
        const mevPerStake = mevMetrics.mevPerStake || 0;
        const competitiveRanking = mevMetrics.competitiveRanking || 0;
        
        // Weighted efficiency score (0-100)
        return (bundleSuccessRate * 40) + (Math.min(mevPerStake * 1000, 30)) + (competitiveRanking * 30);
    }

    /**
     * Calculate stake growth
     */
    calculateStakeGrowth(validatorData, historical) {
        if (historical.length < 2) return 0;
        
        const current = validatorData.activatedStake;
        const previous = historical[historical.length - 1]?.activatedStake || current;
        
        return previous > 0 ? ((current - previous) / previous) * 100 : 0;
    }

    /**
     * Calculate commission trend
     */
    calculateCommissionTrend(validatorData, historical) {
        if (historical.length < 2) return 0;
        
        const current = validatorData.commission;
        const previous = historical[historical.length - 1]?.commission || current;
        
        return current - previous;
    }

    /**
     * Calculate overall performance score
     */
    calculateOverallPerformanceScore(metrics) {
        const weights = {
            apy: 0.3,
            skipRate: 0.2, // Lower is better
            uptimeScore: 0.2,
            mevEfficiency: 0.3
        };
        
        const normalizedSkipRate = Math.max(0, 1 - (metrics.skipRate * 20)); // Convert to 0-1 scale
        
        return (
            (metrics.apy / 10) * weights.apy +
            normalizedSkipRate * weights.skipRate +
            metrics.uptimeScore * weights.uptimeScore +
            (metrics.mevEfficiency / 100) * weights.mevEfficiency
        ) * 100;
    }

    /**
     * Update validator rankings
     */
    async updateValidatorRankings() {
        try {
            const validators = Array.from(this.validatorData.active.values());
            
            // Create different ranking categories
            const rankings = {
                overall: this.rankValidators(validators, 'performance.performanceScore'),
                apy: this.rankValidators(validators, 'performance.apy'),
                mevEfficiency: this.rankValidators(validators.filter(v => v.isJitoEnabled), 'performance.mevEfficiency'),
                stake: this.rankValidators(validators, 'activatedStake'),
                uptime: this.rankValidators(validators, 'performance.uptimeScore')
            };
            
            // Store rankings
            this.validatorData.rankings.set(this.currentEpoch, {
                ...rankings,
                generatedAt: Date.now(),
                epoch: this.currentEpoch,
                totalValidators: validators.length,
                jitoValidators: validators.filter(v => v.isJitoEnabled).length
            });
            
            this.emit('rankingsUpdated', rankings);
            
        } catch (error) {
            throw new Error(`Failed to update rankings: ${error.message}`);
        }
    }

    /**
     * Rank validators by specified metric
     */
    rankValidators(validators, metricPath, descending = true) {
        return validators
            .map(validator => ({
                ...validator,
                metricValue: this.getNestedProperty(validator, metricPath)
            }))
            .filter(v => v.metricValue !== undefined && v.metricValue !== null)
            .sort((a, b) => descending ? b.metricValue - a.metricValue : a.metricValue - b.metricValue)
            .map((validator, index) => ({
                rank: index + 1,
                votePubkey: validator.votePubkey,
                nodePubkey: validator.nodePubkey,
                isJitoEnabled: validator.isJitoEnabled,
                metricValue: validator.metricValue,
                activatedStake: validator.activatedStake,
                commission: validator.commission
            }));
    }

    /**
     * Get nested property value
     */
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Update historical data
     */
    updateHistoricalData(validatorPubkey, validatorData) {
        if (!this.validatorData.historical.has(validatorPubkey)) {
            this.validatorData.historical.set(validatorPubkey, []);
        }
        
        const history = this.validatorData.historical.get(validatorPubkey);
        
        // Add current data to history
        history.push({
            ...validatorData,
            timestamp: Date.now()
        });
        
        // Keep only recent history
        if (history.length > this.config.dataRetentionEpochs) {
            history.splice(0, history.length - this.config.dataRetentionEpochs);
        }
    }

    /**
     * Store performance data in database
     */
    async storePerformanceData() {
        if (!this.databasePool) return;
        
        try {
            const client = await this.databasePool.connect();
            
            for (const [validatorPubkey, validatorData] of this.validatorData.active) {
                await this.storeValidatorData(client, validatorPubkey, validatorData);
            }
            
            client.release();
            
        } catch (error) {
            console.error('Error storing performance data:', error);
        }
    }

    /**
     * Store individual validator data
     */
    async storeValidatorData(client, validatorPubkey, validatorData) {
        const mevMetrics = this.mevMetrics.get(validatorPubkey);
        
        const query = `
            INSERT INTO validator_performance (
                validator_pubkey, epoch, activated_stake, commission,
                apy, skip_rate, uptime_score, mev_efficiency,
                total_rewards, performance_score, is_jito_enabled,
                mev_rewards_24h, bundles_24h, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
            ON CONFLICT (validator_pubkey, epoch) 
            DO UPDATE SET
                activated_stake = EXCLUDED.activated_stake,
                commission = EXCLUDED.commission,
                apy = EXCLUDED.apy,
                skip_rate = EXCLUDED.skip_rate,
                uptime_score = EXCLUDED.uptime_score,
                mev_efficiency = EXCLUDED.mev_efficiency,
                total_rewards = EXCLUDED.total_rewards,
                performance_score = EXCLUDED.performance_score,
                is_jito_enabled = EXCLUDED.is_jito_enabled,
                mev_rewards_24h = EXCLUDED.mev_rewards_24h,
                bundles_24h = EXCLUDED.bundles_24h,
                updated_at = NOW()
        `;
        
        await client.query(query, [
            validatorPubkey,
            this.currentEpoch,
            validatorData.activatedStake,
            validatorData.commission,
            validatorData.performance.apy,
            validatorData.performance.skipRate,
            validatorData.performance.uptimeScore,
            validatorData.performance.mevEfficiency,
            validatorData.performance.totalRewards,
            validatorData.performance.performanceScore,
            validatorData.isJitoEnabled,
            mevMetrics?.mevRewards24h || 0,
            mevMetrics?.bundles24h || 0
        ]);
    }

    /**
     * Load existing validator data from database
     */
    async loadValidatorData() {
        if (!this.databasePool) return;
        
        try {
            const client = await this.databasePool.connect();
            
            const query = `
                SELECT * FROM validator_performance 
                WHERE epoch >= $1 
                ORDER BY validator_pubkey, epoch DESC
            `;
            
            const result = await client.query(query, [this.currentEpoch - 5]);
            client.release();
            
            // Process loaded data
            for (const row of result.rows) {
                this.processLoadedValidatorData(row);
            }
            
        } catch (error) {
            console.warn('Failed to load validator data:', error.message);
        }
    }

    /**
     * Process loaded validator data from database
     */
    processLoadedValidatorData(row) {
        const validatorPubkey = row.validator_pubkey;
        
        if (!this.validatorData.historical.has(validatorPubkey)) {
            this.validatorData.historical.set(validatorPubkey, []);
        }
        
        const history = this.validatorData.historical.get(validatorPubkey);
        history.push({
            votePubkey: validatorPubkey,
            activatedStake: parseFloat(row.activated_stake),
            commission: row.commission,
            isJitoEnabled: row.is_jito_enabled,
            performance: {
                apy: parseFloat(row.apy),
                skipRate: parseFloat(row.skip_rate),
                uptimeScore: parseFloat(row.uptime_score),
                mevEfficiency: parseFloat(row.mev_efficiency),
                totalRewards: parseFloat(row.total_rewards),
                performanceScore: parseFloat(row.performance_score)
            },
            epoch: row.epoch,
            timestamp: row.created_at.getTime()
        });
    }

    /**
     * Get validator performance data
     */
    getValidatorPerformance(validatorPubkey) {
        return this.validatorData.active.get(validatorPubkey);
    }

    /**
     * Get validator rankings
     */
    getValidatorRankings(category = 'overall', limit = 50) {
        const currentRankings = this.validatorData.rankings.get(this.currentEpoch);
        if (!currentRankings || !currentRankings[category]) {
            return [];
        }
        
        return currentRankings[category].slice(0, limit);
    }

    /**
     * Get Jito vs regular validator comparison
     */
    getJitoComparison() {
        const allValidators = Array.from(this.validatorData.active.values());
        const jitoValidators = allValidators.filter(v => v.isJitoEnabled);
        const regularValidators = allValidators.filter(v => !v.isJitoEnabled);
        
        return {
            jito: this.calculateGroupMetrics(jitoValidators),
            regular: this.calculateGroupMetrics(regularValidators),
            comparison: this.compareValidatorGroups(jitoValidators, regularValidators)
        };
    }

    /**
     * Calculate metrics for a group of validators
     */
    calculateGroupMetrics(validators) {
        if (validators.length === 0) {
            return {
                count: 0,
                totalStake: 0,
                avgAPY: 0,
                avgSkipRate: 0,
                avgUptimeScore: 0,
                avgMevEfficiency: 0,
                avgCommission: 0
            };
        }
        
        const totalStake = validators.reduce((sum, v) => sum + v.activatedStake, 0);
        const avgAPY = validators.reduce((sum, v) => sum + v.performance.apy, 0) / validators.length;
        const avgSkipRate = validators.reduce((sum, v) => sum + v.performance.skipRate, 0) / validators.length;
        const avgUptimeScore = validators.reduce((sum, v) => sum + v.performance.uptimeScore, 0) / validators.length;
        const avgMevEfficiency = validators.reduce((sum, v) => sum + v.performance.mevEfficiency, 0) / validators.length;
        const avgCommission = validators.reduce((sum, v) => sum + v.commission, 0) / validators.length;
        
        return {
            count: validators.length,
            totalStake,
            avgAPY,
            avgSkipRate,
            avgUptimeScore,
            avgMevEfficiency,
            avgCommission,
            marketShare: totalStake / Array.from(this.validatorData.active.values()).reduce((sum, v) => sum + v.activatedStake, 0)
        };
    }

    /**
     * Compare Jito vs regular validator groups
     */
    compareValidatorGroups(jitoValidators, regularValidators) {
        const jitoMetrics = this.calculateGroupMetrics(jitoValidators);
        const regularMetrics = this.calculateGroupMetrics(regularValidators);
        
        return {
            apyDifference: jitoMetrics.avgAPY - regularMetrics.avgAPY,
            skipRateDifference: jitoMetrics.avgSkipRate - regularMetrics.avgSkipRate,
            uptimeDifference: jitoMetrics.avgUptimeScore - regularMetrics.avgUptimeScore,
            commissionDifference: jitoMetrics.avgCommission - regularMetrics.avgCommission,
            marketShareRatio: jitoMetrics.marketShare / Math.max(regularMetrics.marketShare, 0.001)
        };
    }

    /**
     * Clean up inactive validators
     */
    cleanupInactiveValidators(activeValidators) {
        const activeSet = new Set(activeValidators.map(v => v.votePubkey));
        
        for (const [validatorPubkey] of this.validatorData.active) {
            if (!activeSet.has(validatorPubkey)) {
                this.validatorData.active.delete(validatorPubkey);
                this.mevMetrics.delete(validatorPubkey);
            }
        }
    }

    /**
     * Check for epoch change
     */
    async checkEpochChange() {
        try {
            await this.updateEpochInfo();
        } catch (error) {
            console.warn('Epoch check failed:', error.message);
        }
    }

    /**
     * Finalize epoch data
     */
    async finalizeEpochData(epoch) {
        try {
            // Store epoch summary
            const epochSummary = {
                epoch,
                totalValidators: this.validatorData.active.size,
                jitoValidators: Array.from(this.validatorData.active.values()).filter(v => v.isJitoEnabled).length,
                totalStake: Array.from(this.validatorData.active.values()).reduce((sum, v) => sum + v.activatedStake, 0),
                avgAPY: this.calculateGroupMetrics(Array.from(this.validatorData.active.values())).avgAPY,
                finalizedAt: Date.now()
            };
            
            this.epochHistory.set(epoch, epochSummary);
            
            // Clean up old epoch data
            const cutoff = epoch - this.config.dataRetentionEpochs;
            for (const [oldEpoch] of this.epochHistory) {
                if (oldEpoch < cutoff) {
                    this.epochHistory.delete(oldEpoch);
                }
            }
            
        } catch (error) {
            console.error('Error finalizing epoch data:', error);
        }
    }

    /**
     * Initialize epoch tracking
     */
    async initializeEpochTracking(epoch) {
        // Reset tracking data for new epoch
        this.emit('epochInitialized', { epoch, validatorCount: this.validatorData.active.size });
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            isTracking: this.trackingInterval !== null,
            currentEpoch: this.currentEpoch,
            validatorsTracked: this.validatorData.active.size,
            jitoValidatorsTracked: Array.from(this.validatorData.active.values()).filter(v => v.isJitoEnabled).length,
            lastUpdate: Math.max(...Array.from(this.validatorData.active.values()).map(v => v.lastUpdated)),
            trackingInterval: this.config.trackingInterval,
            mevTrackingEnabled: this.config.mevTrackingEnabled
        };
    }

    /**
     * Stop tracking
     */
    stop() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
        
        if (this.epochCheckInterval) {
            clearInterval(this.epochCheckInterval);
            this.epochCheckInterval = null;
        }
        
        this.emit('trackingStopped');
    }
}

module.exports = ValidatorPerformanceTracker;