const crypto = require('crypto');
const { EventEmitter } = require('events');

/**
 * API Key Management Service
 * Handles generation, validation, and management of API keys with usage limits
 */
class ApiKeyService extends EventEmitter {
    constructor(database, config) {
        super();
        this.db = database;
        this.config = config;
        
        // Subscription plan limits
        this.planLimits = {
            free: {
                requestsPerMonth: 10000,
                requestsPerMinute: 10,
                features: ['basic-analytics']
            },
            developer: {
                requestsPerMonth: 50000,
                requestsPerMinute: 50,
                features: ['basic-analytics', 'validator-analytics']
            },
            professional: {
                requestsPerMonth: 500000,
                requestsPerMinute: 200,
                features: ['basic-analytics', 'validator-analytics', 'mev-detection']
            },
            enterprise: {
                requestsPerMonth: -1, // unlimited
                requestsPerMinute: 1000,
                features: ['*']
            }
        };
    }

    /**
     * Generate new API key for user
     * @param {string} userId - User ID
     * @param {string} name - Key name/description
     * @param {string} plan - Subscription plan
     * @returns {Promise<Object>} API key data
     */
    async generateApiKey(userId, name, plan = 'free') {
        try {
            // Validate plan
            if (!this.planLimits[plan]) {
                throw new Error('Invalid subscription plan');
            }

            // Check if user has reached key limit
            const existingKeys = await this.getUserApiKeys(userId);
            const maxKeys = plan === 'enterprise' ? 10 : 3;
            
            if (existingKeys.length >= maxKeys) {
                throw new Error(`Maximum ${maxKeys} API keys allowed for ${plan} plan`);
            }

            // Generate key
            const keyId = crypto.randomUUID();
            const apiKey = this.generateSecureKey();
            const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    INSERT INTO api_keys (
                        id, user_id, name, key_hash, plan, 
                        requests_per_month, requests_per_minute,
                        features, created_at, last_used_at, is_active
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NULL, true)
                    RETURNING id, name, plan, created_at
                `, [
                    keyId,
                    userId,
                    name,
                    keyHash,
                    plan,
                    this.planLimits[plan].requestsPerMonth,
                    this.planLimits[plan].requestsPerMinute,
                    JSON.stringify(this.planLimits[plan].features)
                ]);

                const keyData = result.rows[0];

                this.emit('apiKeyGenerated', {
                    userId,
                    keyId,
                    plan,
                    timestamp: new Date()
                });

                return {
                    ...keyData,
                    api_key: apiKey // Only return plain key on generation
                };

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('apiKeyError', { action: 'generate', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Validate API key and check usage limits
     * @param {string} apiKey - API key to validate
     * @returns {Promise<Object|null>} Key data if valid
     */
    async validateApiKey(apiKey) {
        try {
            const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
            
            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    SELECT ak.*, u.role, u.is_active as user_active
                    FROM api_keys ak
                    JOIN users u ON ak.user_id = u.id
                    WHERE ak.key_hash = $1 AND ak.is_active = true
                `, [keyHash]);

                if (result.rows.length === 0) {
                    return null;
                }

                const keyData = result.rows[0];

                // Check if user is active
                if (!keyData.user_active) {
                    return null;
                }

                // Check usage limits
                const canProceed = await this.checkUsageLimits(keyData.id);
                if (!canProceed) {
                    return { ...keyData, rateLimited: true };
                }

                // Update last used timestamp
                await client.query(`
                    UPDATE api_keys SET last_used_at = NOW() WHERE id = $1
                `, [keyData.id]);

                return keyData;

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('apiKeyError', { action: 'validate', error: error.message });
            return null;
        }
    }

    /**
     * Record API usage
     * @param {string} keyId - API key ID
     * @param {string} endpoint - API endpoint called
     * @param {number} responseTime - Response time in ms
     * @returns {Promise<void>}
     */
    async recordUsage(keyId, endpoint, responseTime = 0) {
        try {
            const client = await this.db.connect();
            try {
                await client.query(`
                    INSERT INTO api_usage (
                        key_id, endpoint, timestamp, response_time
                    ) VALUES ($1, $2, NOW(), $3)
                `, [keyId, endpoint, responseTime]);

            } finally {
                client.release();
            }

        } catch (error) {
            // Don't throw on usage recording errors
            this.emit('apiKeyError', { action: 'recordUsage', keyId, error: error.message });
        }
    }

    /**
     * Check if API key is within usage limits
     * @param {string} keyId - API key ID
     * @returns {Promise<boolean>} Whether usage is within limits
     */
    async checkUsageLimits(keyId) {
        try {
            const client = await this.db.connect();
            try {
                // Get key limits
                const keyResult = await client.query(`
                    SELECT requests_per_month, requests_per_minute 
                    FROM api_keys WHERE id = $1
                `, [keyId]);

                if (keyResult.rows.length === 0) {
                    return false;
                }

                const { requests_per_month, requests_per_minute } = keyResult.rows[0];

                // Check monthly limit
                if (requests_per_month > 0) {
                    const monthlyUsage = await client.query(`
                        SELECT COUNT(*) as count FROM api_usage 
                        WHERE key_id = $1 AND timestamp >= DATE_TRUNC('month', NOW())
                    `, [keyId]);

                    if (monthlyUsage.rows[0].count >= requests_per_month) {
                        return false;
                    }
                }

                // Check per-minute limit
                if (requests_per_minute > 0) {
                    const minuteUsage = await client.query(`
                        SELECT COUNT(*) as count FROM api_usage 
                        WHERE key_id = $1 AND timestamp >= NOW() - INTERVAL '1 minute'
                    `, [keyId]);

                    if (minuteUsage.rows[0].count >= requests_per_minute) {
                        return false;
                    }
                }

                return true;

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('apiKeyError', { action: 'checkLimits', keyId, error: error.message });
            return false;
        }
    }

    /**
     * Get user's API keys
     * @param {string} userId - User ID
     * @returns {Promise<Array>} List of API keys (without actual keys)
     */
    async getUserApiKeys(userId) {
        const client = await this.db.connect();
        try {
            const result = await client.query(`
                SELECT id, name, plan, created_at, last_used_at, is_active,
                       requests_per_month, requests_per_minute, features
                FROM api_keys 
                WHERE user_id = $1 
                ORDER BY created_at DESC
            `, [userId]);

            return result.rows.map(key => ({
                ...key,
                features: JSON.parse(key.features || '[]')
            }));

        } finally {
            client.release();
        }
    }

    /**
     * Revoke API key
     * @param {string} userId - User ID
     * @param {string} keyId - API key ID
     * @returns {Promise<void>}
     */
    async revokeApiKey(userId, keyId) {
        try {
            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    UPDATE api_keys 
                    SET is_active = false, revoked_at = NOW()
                    WHERE id = $1 AND user_id = $2
                    RETURNING id, name
                `, [keyId, userId]);

                if (result.rows.length === 0) {
                    throw new Error('API key not found');
                }

                this.emit('apiKeyRevoked', {
                    userId,
                    keyId,
                    keyName: result.rows[0].name,
                    timestamp: new Date()
                });

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('apiKeyError', { action: 'revoke', userId, keyId, error: error.message });
            throw error;
        }
    }

    /**
     * Get API usage statistics
     * @param {string} userId - User ID
     * @param {string} keyId - API key ID (optional)
     * @param {number} days - Number of days to look back
     * @returns {Promise<Object>} Usage statistics
     */
    async getUsageStats(userId, keyId = null, days = 30) {
        const client = await this.db.connect();
        try {
            let query = `
                SELECT 
                    DATE(au.timestamp) as date,
                    COUNT(*) as requests,
                    AVG(au.response_time) as avg_response_time,
                    ak.name as key_name
                FROM api_usage au
                JOIN api_keys ak ON au.key_id = ak.id
                WHERE ak.user_id = $1
                AND au.timestamp >= NOW() - INTERVAL '${days} days'
            `;
            
            const params = [userId];
            
            if (keyId) {
                query += ` AND ak.id = $2`;
                params.push(keyId);
            }
            
            query += ` GROUP BY DATE(au.timestamp), ak.name ORDER BY date DESC`;

            const result = await client.query(query, params);

            return {
                daily_usage: result.rows,
                total_requests: result.rows.reduce((sum, row) => sum + parseInt(row.requests), 0),
                average_response_time: result.rows.length > 0 
                    ? result.rows.reduce((sum, row) => sum + parseFloat(row.avg_response_time), 0) / result.rows.length
                    : 0
            };

        } finally {
            client.release();
        }
    }

    /**
     * Generate secure API key
     * @returns {string} Secure API key
     */
    generateSecureKey() {
        const prefix = 'mev_';
        const randomBytes = crypto.randomBytes(32).toString('hex');
        return `${prefix}${randomBytes}`;
    }

    /**
     * Create API key middleware for Express
     * @param {string[]} requiredFeatures - Required features
     * @returns {Function} Express middleware
     */
    createApiKeyMiddleware(requiredFeatures = []) {
        return async (req, res, next) => {
            try {
                const apiKey = req.headers['x-api-key'] || req.query.api_key;
                
                if (!apiKey) {
                    return res.status(401).json({
                        error: 'API key required',
                        code: 'API_KEY_REQUIRED'
                    });
                }

                const keyData = await this.validateApiKey(apiKey);
                
                if (!keyData) {
                    return res.status(401).json({
                        error: 'Invalid API key',
                        code: 'INVALID_API_KEY'
                    });
                }

                if (keyData.rateLimited) {
                    return res.status(429).json({
                        error: 'Rate limit exceeded',
                        code: 'RATE_LIMIT_EXCEEDED'
                    });
                }

                // Check feature access
                const keyFeatures = JSON.parse(keyData.features || '[]');
                const hasAllFeatures = keyFeatures.includes('*') || 
                    requiredFeatures.every(feature => keyFeatures.includes(feature));

                if (!hasAllFeatures) {
                    return res.status(403).json({
                        error: 'Insufficient API access level',
                        code: 'INSUFFICIENT_ACCESS',
                        required_features: requiredFeatures
                    });
                }

                // Record usage
                const startTime = Date.now();
                req.apiKey = keyData;
                req.user = { userId: keyData.user_id, role: keyData.role };

                // Record usage after response
                res.on('finish', () => {
                    const responseTime = Date.now() - startTime;
                    this.recordUsage(keyData.id, req.path, responseTime);
                });

                next();

            } catch (error) {
                res.status(500).json({
                    error: 'API key validation error',
                    code: 'API_KEY_ERROR'
                });
            }
        };
    }
}

module.exports = ApiKeyService;