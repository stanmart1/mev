const { EventEmitter } = require('events');
const crypto = require('crypto');

/**
 * User Profile Management Service
 * Handles user preferences, favorites, saved simulations, and profile data
 */
class UserProfileService extends EventEmitter {
    constructor(database, config) {
        super();
        this.db = database;
        this.config = config;
    }

    /**
     * Get complete user profile with all preferences
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Complete user profile
     */
    async getUserProfile(userId) {
        try {
            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    SELECT 
                        up.*,
                        us.two_factor_enabled,
                        us.login_alerts_enabled,
                        us.max_concurrent_sessions
                    FROM user_profiles up
                    LEFT JOIN user_security_settings us ON up.user_id = us.user_id
                    WHERE up.user_id = $1
                `, [userId]);

                if (result.rows.length === 0) {
                    // Create default profile if not exists
                    await this.createDefaultProfile(userId);
                    return await this.getUserProfile(userId);
                }

                const profile = result.rows[0];
                
                // Get saved simulations count
                const simCountResult = await client.query(`
                    SELECT COUNT(*) as count FROM saved_simulations WHERE user_id = $1
                `, [userId]);

                // Get active alerts count
                const alertCountResult = await client.query(`
                    SELECT COUNT(*) as count FROM user_alert_settings 
                    WHERE user_id = $1 AND is_enabled = true
                `, [userId]);

                // Get watchlists count
                const watchlistCountResult = await client.query(`
                    SELECT COUNT(*) as count FROM user_watchlists WHERE user_id = $1
                `, [userId]);

                return {
                    ...profile,
                    statistics: {
                        saved_simulations: parseInt(simCountResult.rows[0].count),
                        active_alerts: parseInt(alertCountResult.rows[0].count),
                        watchlists: parseInt(watchlistCountResult.rows[0].count)
                    }
                };

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'getUserProfile', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Update user preferences
     * @param {string} userId - User ID
     * @param {Object} preferences - Preferences to update
     * @returns {Promise<Object>} Updated profile
     */
    async updateUserPreferences(userId, preferences) {
        try {
            const client = await this.db.connect();
            try {
                const updates = [];
                const values = [userId];
                let paramIndex = 2;

                // Build dynamic update query based on provided preferences
                if (preferences.alert_thresholds) {
                    updates.push(`alert_thresholds = $${paramIndex}`);
                    values.push(JSON.stringify(preferences.alert_thresholds));
                    paramIndex++;
                }

                if (preferences.dashboard_preferences) {
                    updates.push(`dashboard_preferences = $${paramIndex}`);
                    values.push(JSON.stringify(preferences.dashboard_preferences));
                    paramIndex++;
                }

                if (preferences.notification_preferences) {
                    updates.push(`notification_preferences = $${paramIndex}`);
                    values.push(JSON.stringify(preferences.notification_preferences));
                    paramIndex++;
                }

                if (preferences.trading_preferences) {
                    updates.push(`trading_preferences = $${paramIndex}`);
                    values.push(JSON.stringify(preferences.trading_preferences));
                    paramIndex++;
                }

                if (preferences.favorite_validators) {
                    updates.push(`favorite_validators = $${paramIndex}`);
                    values.push(preferences.favorite_validators);
                    paramIndex++;
                }

                if (updates.length === 0) {
                    throw new Error('No valid preferences provided for update');
                }

                updates.push('updated_at = NOW()');

                const query = `
                    UPDATE user_profiles 
                    SET ${updates.join(', ')}
                    WHERE user_id = $1
                    RETURNING *
                `;

                const result = await client.query(query, values);

                if (result.rows.length === 0) {
                    throw new Error('User profile not found');
                }

                this.emit('preferencesUpdated', {
                    userId,
                    updatedFields: Object.keys(preferences),
                    timestamp: new Date()
                });

                return result.rows[0];

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'updateUserPreferences', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Add validator to favorites
     * @param {string} userId - User ID
     * @param {string} validatorAddress - Validator address to add
     * @returns {Promise<string[]>} Updated favorites list
     */
    async addFavoriteValidator(userId, validatorAddress) {
        try {
            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    UPDATE user_profiles 
                    SET favorite_validators = array_append(
                        COALESCE(favorite_validators, '{}'), 
                        $2
                    ),
                    updated_at = NOW()
                    WHERE user_id = $1 
                    AND NOT ($2 = ANY(COALESCE(favorite_validators, '{}')))
                    RETURNING favorite_validators
                `, [userId, validatorAddress]);

                if (result.rows.length === 0) {
                    throw new Error('Validator already in favorites or user profile not found');
                }

                this.emit('favoriteAdded', { userId, validatorAddress, timestamp: new Date() });

                return result.rows[0].favorite_validators;

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'addFavoriteValidator', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Remove validator from favorites
     * @param {string} userId - User ID
     * @param {string} validatorAddress - Validator address to remove
     * @returns {Promise<string[]>} Updated favorites list
     */
    async removeFavoriteValidator(userId, validatorAddress) {
        try {
            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    UPDATE user_profiles 
                    SET favorite_validators = array_remove(favorite_validators, $2),
                    updated_at = NOW()
                    WHERE user_id = $1
                    RETURNING favorite_validators
                `, [userId, validatorAddress]);

                if (result.rows.length === 0) {
                    throw new Error('User profile not found');
                }

                this.emit('favoriteRemoved', { userId, validatorAddress, timestamp: new Date() });

                return result.rows[0].favorite_validators;

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'removeFavoriteValidator', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Get user's favorite validators
     * @param {string} userId - User ID
     * @returns {Promise<string[]>} List of favorite validator addresses
     */
    async getFavoriteValidators(userId) {
        try {
            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    SELECT favorite_validators FROM user_profiles WHERE user_id = $1
                `, [userId]);

                return result.rows[0]?.favorite_validators || [];

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'getFavoriteValidators', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Save a simulation for the user
     * @param {string} userId - User ID
     * @param {Object} simulationData - Simulation data to save
     * @returns {Promise<Object>} Saved simulation
     */
    async saveSimulation(userId, simulationData) {
        try {
            const { name, description, simulation_type, parameters, results, tags, is_public } = simulationData;

            if (!name || !simulation_type || !parameters) {
                throw new Error('Missing required simulation fields: name, simulation_type, parameters');
            }

            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    INSERT INTO saved_simulations (
                        user_id, name, description, simulation_type, 
                        parameters, results, tags, is_public
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                `, [
                    userId, 
                    name, 
                    description || null,
                    simulation_type,
                    JSON.stringify(parameters),
                    results ? JSON.stringify(results) : null,
                    tags || [],
                    is_public || false
                ]);

                this.emit('simulationSaved', {
                    userId,
                    simulationId: result.rows[0].id,
                    simulation_type,
                    timestamp: new Date()
                });

                return result.rows[0];

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'saveSimulation', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Get user's saved simulations
     * @param {string} userId - User ID
     * @param {Object} filters - Optional filters
     * @returns {Promise<Object[]>} List of saved simulations
     */
    async getSavedSimulations(userId, filters = {}) {
        try {
            const { simulation_type, limit = 50, offset = 0 } = filters;

            let query = `
                SELECT * FROM saved_simulations 
                WHERE user_id = $1
            `;
            const values = [userId];
            let paramIndex = 2;

            if (simulation_type) {
                query += ` AND simulation_type = $${paramIndex}`;
                values.push(simulation_type);
                paramIndex++;
            }

            query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            values.push(limit, offset);

            const client = await this.db.connect();
            try {
                const result = await client.query(query, values);
                return result.rows;

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'getSavedSimulations', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Update a saved simulation
     * @param {string} userId - User ID
     * @param {string} simulationId - Simulation ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated simulation
     */
    async updateSimulation(userId, simulationId, updateData) {
        try {
            const client = await this.db.connect();
            try {
                const updates = [];
                const values = [userId, simulationId];
                let paramIndex = 3;

                // Build dynamic update query
                const allowedFields = ['name', 'description', 'parameters', 'results', 'tags', 'is_public'];
                
                for (const field of allowedFields) {
                    if (updateData[field] !== undefined) {
                        if (field === 'parameters' || field === 'results') {
                            updates.push(`${field} = $${paramIndex}`);
                            values.push(JSON.stringify(updateData[field]));
                        } else {
                            updates.push(`${field} = $${paramIndex}`);
                            values.push(updateData[field]);
                        }
                        paramIndex++;
                    }
                }

                if (updates.length === 0) {
                    throw new Error('No valid fields provided for update');
                }

                updates.push('updated_at = NOW()');

                const query = `
                    UPDATE saved_simulations 
                    SET ${updates.join(', ')}
                    WHERE user_id = $1 AND id = $2
                    RETURNING *
                `;

                const result = await client.query(query, values);

                if (result.rows.length === 0) {
                    throw new Error('Simulation not found or access denied');
                }

                this.emit('simulationUpdated', {
                    userId,
                    simulationId,
                    updatedFields: Object.keys(updateData),
                    timestamp: new Date()
                });

                return result.rows[0];

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'updateSimulation', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Delete a saved simulation
     * @param {string} userId - User ID
     * @param {string} simulationId - Simulation ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteSimulation(userId, simulationId) {
        try {
            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    DELETE FROM saved_simulations 
                    WHERE user_id = $1 AND id = $2
                    RETURNING id
                `, [userId, simulationId]);

                if (result.rows.length === 0) {
                    throw new Error('Simulation not found or access denied');
                }

                this.emit('simulationDeleted', {
                    userId,
                    simulationId,
                    timestamp: new Date()
                });

                return true;

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'deleteSimulation', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Set alert threshold for user
     * @param {string} userId - User ID
     * @param {string} alertType - Type of alert
     * @param {Object} alertConfig - Alert configuration
     * @returns {Promise<Object>} Alert setting
     */
    async setAlertThreshold(userId, alertType, alertConfig) {
        try {
            const {
                alert_name,
                threshold_value,
                threshold_operator = '>=',
                conditions = {},
                cooldown_minutes = 15,
                email_enabled = true,
                push_enabled = false,
                webhook_enabled = false
            } = alertConfig;

            if (!alert_name || threshold_value === undefined) {
                throw new Error('Missing required fields: alert_name, threshold_value');
            }

            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    INSERT INTO user_alert_settings (
                        user_id, alert_type, alert_name, threshold_value, 
                        threshold_operator, conditions, cooldown_minutes,
                        email_enabled, push_enabled, webhook_enabled
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (user_id, alert_type, alert_name)
                    DO UPDATE SET
                        threshold_value = EXCLUDED.threshold_value,
                        threshold_operator = EXCLUDED.threshold_operator,
                        conditions = EXCLUDED.conditions,
                        cooldown_minutes = EXCLUDED.cooldown_minutes,
                        email_enabled = EXCLUDED.email_enabled,
                        push_enabled = EXCLUDED.push_enabled,
                        webhook_enabled = EXCLUDED.webhook_enabled,
                        updated_at = NOW()
                    RETURNING *
                `, [
                    userId, alertType, alert_name, threshold_value,
                    threshold_operator, JSON.stringify(conditions), cooldown_minutes,
                    email_enabled, push_enabled, webhook_enabled
                ]);

                this.emit('alertThresholdSet', {
                    userId,
                    alertType,
                    alert_name,
                    threshold_value,
                    timestamp: new Date()
                });

                return result.rows[0];

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'setAlertThreshold', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Get user's alert thresholds
     * @param {string} userId - User ID
     * @param {string} alertType - Optional filter by alert type
     * @returns {Promise<Object[]>} Alert settings
     */
    async getAlertThresholds(userId, alertType = null) {
        try {
            let query = `
                SELECT * FROM user_alert_settings 
                WHERE user_id = $1
            `;
            const values = [userId];

            if (alertType) {
                query += ` AND alert_type = $2`;
                values.push(alertType);
            }

            query += ` ORDER BY created_at DESC`;

            const client = await this.db.connect();
            try {
                const result = await client.query(query, values);
                return result.rows;

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'getAlertThresholds', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Toggle alert on/off
     * @param {string} userId - User ID
     * @param {string} alertId - Alert ID
     * @param {boolean} enabled - Enable/disable status
     * @returns {Promise<Object>} Updated alert setting
     */
    async toggleAlert(userId, alertId, enabled) {
        try {
            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    UPDATE user_alert_settings 
                    SET is_enabled = $3, updated_at = NOW()
                    WHERE user_id = $1 AND id = $2
                    RETURNING *
                `, [userId, alertId, enabled]);

                if (result.rows.length === 0) {
                    throw new Error('Alert setting not found or access denied');
                }

                this.emit('alertToggled', {
                    userId,
                    alertId,
                    enabled,
                    timestamp: new Date()
                });

                return result.rows[0];

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'toggleAlert', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Create default profile for new user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Created profile
     */
    async createDefaultProfile(userId) {
        try {
            const client = await this.db.connect();
            try {
                // Create user profile with defaults
                const profileResult = await client.query(`
                    INSERT INTO user_profiles (user_id) 
                    VALUES ($1) 
                    ON CONFLICT (user_id) DO NOTHING
                    RETURNING *
                `, [userId]);

                // Create security settings with defaults
                await client.query(`
                    INSERT INTO user_security_settings (user_id)
                    VALUES ($1)
                    ON CONFLICT (user_id) DO NOTHING
                `, [userId]);

                this.emit('profileCreated', { userId, timestamp: new Date() });

                return profileResult.rows[0];

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'createDefaultProfile', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Get user activity statistics
     * @param {string} userId - User ID
     * @param {number} days - Number of days to look back
     * @returns {Promise<Object>} Activity statistics
     */
    async getUserActivityStats(userId, days = 30) {
        try {
            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    SELECT 
                        activity_type,
                        COUNT(*) as count,
                        DATE_TRUNC('day', created_at) as activity_date
                    FROM user_activity_log 
                    WHERE user_id = $1 
                    AND created_at > NOW() - INTERVAL '${days} days'
                    GROUP BY activity_type, DATE_TRUNC('day', created_at)
                    ORDER BY activity_date DESC
                `, [userId]);

                return result.rows;

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'getUserActivityStats', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Log user activity
     * @param {string} userId - User ID
     * @param {Object} activityData - Activity data
     * @returns {Promise<void>}
     */
    async logUserActivity(userId, activityData) {
        try {
            const {
                activity_type,
                activity_description,
                ip_address,
                user_agent,
                endpoint,
                metadata = {},
                is_suspicious = false,
                risk_score = 0
            } = activityData;

            const client = await this.db.connect();
            try {
                await client.query(`
                    INSERT INTO user_activity_log (
                        user_id, activity_type, activity_description,
                        ip_address, user_agent, endpoint, metadata,
                        is_suspicious, risk_score
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    userId, activity_type, activity_description,
                    ip_address, user_agent, endpoint,
                    JSON.stringify(metadata), is_suspicious, risk_score
                ]);

                if (is_suspicious || risk_score > 70) {
                    this.emit('suspiciousActivity', {
                        userId,
                        activity_type,
                        risk_score,
                        timestamp: new Date()
                    });
                }

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('profileError', { action: 'logUserActivity', userId, error: error.message });
            // Don't throw on activity logging errors
        }
    }
}

module.exports = UserProfileService;