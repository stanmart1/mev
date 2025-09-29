const EventEmitter = require('events');

/**
 * Block Reward Parser
 * Parses Solana block data to extract validator rewards and transaction details
 */
class BlockRewardParser extends EventEmitter {
    constructor(solanaConnection, database) {
        super();
        this.connection = solanaConnection;
        this.db = database;
        this.isProcessing = false;
        
        this.config = {
            batchSize: 20,
            rewardExtraction: {
                includeTransactionFees: true,
                includePriorityFees: true,
                includeVoteRewards: true
            }
        };
        
        this.blockCache = new Map();
    }

    async startParsing(intervalMs = 300000) {
        console.log('Starting block reward parser...');
        
        try {
            await this.parseRecentBlocks();
            
            this.parsingInterval = setInterval(async () => {
                try {
                    await this.parseRecentBlocks(50);
                } catch (error) {
                    console.error('Error in periodic parsing:', error);
                    this.emit('error', error);
                }
            }, intervalMs);
            
            this.emit('started', { interval: intervalMs });
            
        } catch (error) {
            console.error('Error starting parser:', error);
            throw error;
        }
    }

    stopParsing() {
        if (this.parsingInterval) {
            clearInterval(this.parsingInterval);
            this.parsingInterval = null;
        }
        this.isProcessing = false;
        this.emit('stopped');
    }

    async parseRecentBlocks(blockCount = 100) {
        try {
            const currentSlot = await this.connection.getSlot();
            const recentBlocks = await this.getRecentConfirmedBlocks(currentSlot, blockCount);
            
            if (recentBlocks.length === 0) return;
            
            for (let i = 0; i < recentBlocks.length; i += this.config.batchSize) {
                const batch = recentBlocks.slice(i, i + this.config.batchSize);
                await this.parseBatch(batch);
                await this.sleep(200);
            }
            
            this.emit('recentBlocksParsed', {
                timestamp: new Date(),
                blocksParsed: recentBlocks.length
            });
            
        } catch (error) {
            console.error('Error parsing recent blocks:', error);
        }
    }

    async getRecentConfirmedBlocks(currentSlot, count) {
        const blocks = [];
        
        for (let i = 0; i < count; i++) {
            const slot = currentSlot - i;
            
            try {
                const block = await this.connection.getBlock(slot, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0
                });
                
                if (block) {
                    blocks.push({ slot, ...block });
                }
            } catch (error) {
                continue;
            }
            
            if (i % 10 === 0) await this.sleep(100);
        }
        
        return blocks;
    }

    async parseBatch(blocks) {
        const results = [];
        
        for (const block of blocks) {
            try {
                const parsedBlock = await this.parseBlock(block);
                if (parsedBlock) results.push(parsedBlock);
            } catch (error) {
                console.error(`Error parsing block ${block.slot}:`, error);
            }
        }
        
        if (results.length > 0) {
            await this.storeParsedBlocks(results);
        }
        
        return results;
    }

    async parseBlock(block) {
        try {
            const slot = block.slot;
            
            if (this.blockCache.has(slot)) {
                return this.blockCache.get(slot);
            }
            
            const blockInfo = {
                slot,
                block_hash: block.blockhash,
                parent_slot: block.parentSlot,
                block_time: new Date(block.blockTime * 1000),
                transaction_count: block.transactions?.length || 0
            };
            
            const validatorInfo = await this.getBlockValidator(block);
            const rewardData = await this.parseBlockRewards(block);
            const transactionAnalysis = await this.analyzeTransactions(block.transactions || []);
            
            const parsedBlock = {
                ...blockInfo,
                ...validatorInfo,
                ...rewardData,
                ...transactionAnalysis,
                parsed_timestamp: new Date()
            };
            
            this.blockCache.set(slot, parsedBlock);
            return parsedBlock;
            
        } catch (error) {
            console.error(`Error parsing block ${block.slot}:`, error);
            return null;
        }
    }

    async getBlockValidator(block) {
        return {
            validator_address: 'UnknownValidator',
            is_jito_enabled: false
        };
    }

    async parseBlockRewards(block) {
        const rewardData = {
            total_fees: 0,
            transaction_fees: 0,
            priority_fees: 0,
            validator_rewards: 0
        };
        
        if (block.transactions) {
            for (const tx of block.transactions) {
                if (tx.meta && tx.meta.fee) {
                    const fee = tx.meta.fee / 1000000000; // Convert to SOL
                    rewardData.total_fees += fee;
                    rewardData.transaction_fees += fee * 0.7;
                    rewardData.priority_fees += fee * 0.3;
                }
            }
        }
        
        if (block.rewards) {
            for (const reward of block.rewards) {
                const rewardSOL = reward.lamports / 1000000000;
                rewardData.validator_rewards += rewardSOL;
            }
        }
        
        return rewardData;
    }

    async analyzeTransactions(transactions) {
        const analysis = {
            mev_indicators: {
                arbitrage_count: 0,
                sandwich_count: 0,
                high_priority_fee_count: 0,
                dex_interaction_count: 0
            },
            transaction_patterns: {
                avg_fee: 0,
                max_fee: 0,
                high_fee_transactions: 0
            },
            dex_activity: {
                raydium_interactions: 0,
                orca_interactions: 0,
                serum_interactions: 0
            }
        };
        
        if (!transactions || transactions.length === 0) return analysis;
        
        let totalFees = 0;
        let maxFee = 0;
        
        for (const tx of transactions) {
            const fee = tx.meta?.fee || 0;
            totalFees += fee;
            maxFee = Math.max(maxFee, fee);
            
            if (fee > 50000) analysis.transaction_patterns.high_fee_transactions++;
            if (fee > 10000) analysis.mev_indicators.high_priority_fee_count++;
            
            await this.analyzeSingleTransaction(tx, analysis);
        }
        
        analysis.transaction_patterns.avg_fee = transactions.length > 0 ? 
            (totalFees / transactions.length) / 1000000000 : 0;
        analysis.transaction_patterns.max_fee = maxFee / 1000000000;
        
        return analysis;
    }

    async analyzeSingleTransaction(transaction, analysis) {
        try {
            if (!transaction.transaction?.message) return;
            
            const message = transaction.transaction.message;
            const instructions = message.instructions || [];
            
            for (const instruction of instructions) {
                const programId = message.accountKeys[instruction.programIdIndex];
                await this.checkDEXInteraction(programId, analysis);
            }
        } catch (error) {
            console.error('Error analyzing transaction:', error);
        }
    }

    async checkDEXInteraction(programId, analysis) {
        const dexPrograms = {
            'RVKd61ztZW9GUwhRbbLoYVRE5Xf1B2tVscKqwZqXgEr': 'raydium',
            'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'orca',
            '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin': 'serum'
        };
        
        const dexName = dexPrograms[programId];
        if (dexName) {
            analysis.mev_indicators.dex_interaction_count++;
            analysis.dex_activity[`${dexName}_interactions`]++;
        }
    }

    async storeParsedBlocks(parsedBlocks) {
        try {
            for (const block of parsedBlocks) {
                const query = `
                    INSERT INTO parsed_block_rewards (
                        slot, block_hash, parent_slot, block_time, transaction_count,
                        validator_address, is_jito_enabled, total_fees, transaction_fees,
                        priority_fees, validator_rewards, arbitrage_count, sandwich_count,
                        high_priority_fee_count, dex_interaction_count, avg_fee, max_fee,
                        high_fee_transactions, raydium_interactions, orca_interactions,
                        serum_interactions, parsed_timestamp
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                        $16, $17, $18, $19, $20, $21, $22
                    )
                    ON CONFLICT (slot) DO UPDATE SET
                        total_fees = EXCLUDED.total_fees,
                        transaction_fees = EXCLUDED.transaction_fees,
                        priority_fees = EXCLUDED.priority_fees,
                        validator_rewards = EXCLUDED.validator_rewards,
                        parsed_timestamp = EXCLUDED.parsed_timestamp
                `;
                
                await this.db.query(query, [
                    block.slot, block.block_hash, block.parent_slot, block.block_time,
                    block.transaction_count, block.validator_address, block.is_jito_enabled,
                    block.total_fees, block.transaction_fees, block.priority_fees,
                    block.validator_rewards, block.mev_indicators?.arbitrage_count || 0,
                    block.mev_indicators?.sandwich_count || 0,
                    block.mev_indicators?.high_priority_fee_count || 0,
                    block.mev_indicators?.dex_interaction_count || 0,
                    block.transaction_patterns?.avg_fee || 0,
                    block.transaction_patterns?.max_fee || 0,
                    block.transaction_patterns?.high_fee_transactions || 0,
                    block.dex_activity?.raydium_interactions || 0,
                    block.dex_activity?.orca_interactions || 0,
                    block.dex_activity?.serum_interactions || 0,
                    block.parsed_timestamp
                ]);
            }
            
            console.log(`Stored ${parsedBlocks.length} parsed blocks`);
            
        } catch (error) {
            console.error('Error storing parsed blocks:', error);
        }
    }

    async getParsedBlockData(startSlot, endSlot) {
        try {
            const query = `SELECT * FROM parsed_block_rewards WHERE slot BETWEEN $1 AND $2 ORDER BY slot DESC`;
            const result = await this.db.query(query, [startSlot, endSlot]);
            return result.rows;
        } catch (error) {
            console.error('Error getting parsed block data:', error);
            throw error;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = BlockRewardParser;