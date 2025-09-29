const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

/**
 * Comprehensive Authentication Service
 * Handles email/password, JWT tokens, and Solana wallet authentication
 */
class AuthenticationService extends EventEmitter {
    constructor(database, config) {
        super();
        this.db = database;
        this.config = config;
        this.saltRounds = 12;
        this.jwtSecret = config.jwt.secret;
        this.jwtExpiresIn = config.jwt.expiresIn || '24h';
        this.refreshTokenExpiresIn = config.jwt.refreshExpiresIn || '7d';
        
        // Initialize password recovery service
        this.passwordRecovery = new PasswordRecoveryService(database, config);
    }

    /**
     * Register new user with email and password
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} User object and tokens
     */
    async registerUser(userData) {
        try {
            const { email, password, role = 'user', walletAddress = null } = userData;

            // Validate email format
            if (!this.isValidEmail(email)) {
                throw new Error('Invalid email format');
            }

            // Check if user already exists
            const existingUser = await this.getUserByEmail(email);
            if (existingUser) {
                throw new Error('User already exists with this email');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, this.saltRounds);

            // Create user record
            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    INSERT INTO users (
                        id, email, password_hash, role, wallet_address, 
                        created_at, updated_at, is_active, email_verified
                    ) VALUES (
                        $1, $2, $3, $4, $5, NOW(), NOW(), true, false
                    ) RETURNING id, email, role, wallet_address, created_at
                `, [
                    crypto.randomUUID(),
                    email.toLowerCase(),
                    hashedPassword,
                    role,
                    walletAddress
                ]);

                const user = result.rows[0];

                // Generate tokens
                const tokens = await this.generateTokens(user);

                // Log registration event
                this.emit('userRegistered', {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    timestamp: new Date()
                });

                return {
                    user: this.sanitizeUser(user),
                    ...tokens
                };

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('authError', { action: 'register', error: error.message });
            throw error;
        }
    }

    /**
     * Authenticate user with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} User object and tokens
     */
    async loginUser(email, password) {
        try {
            // Get user by email
            const user = await this.getUserByEmail(email);
            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Check if user is active
            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Invalid credentials');
            }

            // Update last login
            await this.updateLastLogin(user.id);

            // Generate tokens
            const tokens = await this.generateTokens(user);

            // Log login event
            this.emit('userLogin', {
                userId: user.id,
                email: user.email,
                timestamp: new Date()
            });

            return {
                user: this.sanitizeUser(user),
                ...tokens
            };

        } catch (error) {
            this.emit('authError', { action: 'login', error: error.message });
            throw error;
        }
    }

    /**
     * Authenticate user with Solana wallet signature
     * @param {string} walletAddress - Solana wallet public key
     * @param {string} signature - Signed message
     * @param {string} message - Original message that was signed
     * @returns {Promise<Object>} User object and tokens
     */
    async loginWithWallet(walletAddress, signature, message) {
        try {
            // Verify the signature
            const isValidSignature = this.verifyWalletSignature(walletAddress, signature, message);
            if (!isValidSignature) {
                throw new Error('Invalid wallet signature');
            }

            // Check if message is recent (within 5 minutes)
            const messageData = JSON.parse(message);
            const messageTime = new Date(messageData.timestamp);
            const now = new Date();
            const timeDiff = (now - messageTime) / 1000; // seconds

            if (timeDiff > 300) { // 5 minutes
                throw new Error('Signature expired');
            }

            // Get or create user by wallet address
            let user = await this.getUserByWallet(walletAddress);
            
            if (!user) {
                // Create new user with wallet
                user = await this.createWalletUser(walletAddress);
            }

            // Check if user is active
            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }

            // Update last login
            await this.updateLastLogin(user.id);

            // Generate tokens
            const tokens = await this.generateTokens(user);

            // Log wallet login event
            this.emit('walletLogin', {
                userId: user.id,
                walletAddress: user.wallet_address,
                timestamp: new Date()
            });

            return {
                user: this.sanitizeUser(user),
                ...tokens
            };

        } catch (error) {
            this.emit('authError', { action: 'walletLogin', error: error.message });
            throw error;
        }
    }

    /**
     * Refresh JWT tokens
     * @param {string} refreshToken - Valid refresh token
     * @returns {Promise<Object>} New tokens
     */
    async refreshTokens(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, this.jwtSecret);
            
            // Get user
            const user = await this.getUserById(decoded.userId);
            if (!user || !user.is_active) {
                throw new Error('Invalid refresh token');
            }

            // Generate new tokens
            const tokens = await this.generateTokens(user);

            return tokens;

        } catch (error) {
            this.emit('authError', { action: 'refreshToken', error: error.message });
            throw error;
        }
    }

    /**
     * Logout user and invalidate tokens
     * @param {string} userId - User ID
     * @param {string} accessToken - Access token to invalidate
     */
    async logoutUser(userId, accessToken) {
        try {
            // Add token to blacklist
            await this.blacklistToken(accessToken);

            // Log logout event
            this.emit('userLogout', {
                userId: userId,
                timestamp: new Date()
            });

        } catch (error) {
            this.emit('authError', { action: 'logout', error: error.message });
            throw error;
        }
    }

    /**
     * Generate access and refresh tokens
     * @param {Object} user - User object
     * @returns {Promise<Object>} Token pair
     */
    async generateTokens(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            walletAddress: user.wallet_address
        };

        const accessToken = jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpiresIn,
            issuer: 'mev-analytics',
            audience: 'mev-users'
        });

        const refreshToken = jwt.sign(
            { userId: user.id, tokenType: 'refresh' },
            this.jwtSecret,
            {
                expiresIn: this.refreshTokenExpiresIn,
                issuer: 'mev-analytics',
                audience: 'mev-users'
            }
        );

        // Store refresh token in database
        await this.storeRefreshToken(user.id, refreshToken);

        return {
            accessToken,
            refreshToken,
            expiresIn: this.jwtExpiresIn
        };
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token
     * @returns {Promise<Object>} Decoded token or null
     */
    async verifyToken(token) {
        try {
            // Check if token is blacklisted
            const isBlacklisted = await this.isTokenBlacklisted(token);
            if (isBlacklisted) {
                return null;
            }

            // Verify token
            const decoded = jwt.verify(token, this.jwtSecret);
            return decoded;

        } catch (error) {
            return null;
        }
    }

    /**
     * Verify Solana wallet signature
     * @param {string} walletAddress - Public key
     * @param {string} signature - Signature
     * @param {string} message - Original message
     * @returns {boolean} Signature validity
     */
    verifyWalletSignature(walletAddress, signature, message) {
        try {
            const publicKeyBytes = bs58.decode(walletAddress);
            const signatureBytes = bs58.decode(signature);
            const messageBytes = new TextEncoder().encode(message);

            return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>} User object or null
     */
    async getUserByEmail(email) {
        const client = await this.db.connect();
        try {
            const result = await client.query(`
                SELECT * FROM users WHERE email = $1
            `, [email.toLowerCase()]);

            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Get user by wallet address
     * @param {string} walletAddress - Wallet address
     * @returns {Promise<Object|null>} User object or null
     */
    async getUserByWallet(walletAddress) {
        const client = await this.db.connect();
        try {
            const result = await client.query(`
                SELECT * FROM users WHERE wallet_address = $1
            `, [walletAddress]);

            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User object or null
     */
    async getUserById(userId) {
        const client = await this.db.connect();
        try {
            const result = await client.query(`
                SELECT * FROM users WHERE id = $1
            `, [userId]);

            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Create user with wallet address only
     * @param {string} walletAddress - Wallet address
     * @returns {Promise<Object>} User object
     */
    async createWalletUser(walletAddress) {
        const client = await this.db.connect();
        try {
            const result = await client.query(`
                INSERT INTO users (
                    id, wallet_address, role, created_at, updated_at, is_active
                ) VALUES (
                    $1, $2, 'user', NOW(), NOW(), true
                ) RETURNING id, wallet_address, role, created_at
            `, [crypto.randomUUID(), walletAddress]);

            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Update user last login timestamp
     * @param {string} userId - User ID
     */
    async updateLastLogin(userId) {
        const client = await this.db.connect();
        try {
            await client.query(`
                UPDATE users SET last_login = NOW() WHERE id = $1
            `, [userId]);
        } finally {
            client.release();
        }
    }

    /**
     * Store refresh token in database
     * @param {string} userId - User ID  
     * @param {string} refreshToken - Refresh token
     */
    async storeRefreshToken(userId, refreshToken) {
        const client = await this.db.connect();
        try {
            await client.query(`
                INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (user_id)
                DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()
            `, [
                userId,
                refreshToken,
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            ]);
        } finally {
            client.release();
        }
    }

    /**
     * Blacklist token
     * @param {string} token - Token to blacklist
     */
    async blacklistToken(token) {
        const client = await this.db.connect();
        try {
            const decoded = jwt.decode(token);
            const expiresAt = new Date(decoded.exp * 1000);

            await client.query(`
                INSERT INTO token_blacklist (token_hash, expires_at, created_at)
                VALUES ($1, $2, NOW())
            `, [
                crypto.createHash('sha256').update(token).digest('hex'),
                expiresAt
            ]);
        } finally {
            client.release();
        }
    }

    /**
     * Check if token is blacklisted
     * @param {string} token - Token to check
     * @returns {Promise<boolean>} Blacklist status
     */
    async isTokenBlacklisted(token) {
        const client = await this.db.connect();
        try {
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            
            const result = await client.query(`
                SELECT 1 FROM token_blacklist 
                WHERE token_hash = $1 AND expires_at > NOW()
            `, [tokenHash]);

            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Validity
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Remove sensitive data from user object
     * @param {Object} user - User object
     * @returns {Object} Sanitized user object
     */
    sanitizeUser(user) {
        const { password_hash, ...sanitizedUser } = user;
        return sanitizedUser;
    }

    /**
     * Change user password
     * @param {string} userId - User ID
     * @param {string} oldPassword - Current password
     * @param {string} newPassword - New password
     */
    async changePassword(userId, oldPassword, newPassword) {
        try {
            const user = await this.getUserById(userId);
            if (!user || !user.password_hash) {
                throw new Error('User not found or wallet-only account');
            }

            // Verify old password
            const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Invalid current password');
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

            // Update password
            const client = await this.db.connect();
            try {
                await client.query(`
                    UPDATE users SET password_hash = $1, updated_at = NOW()
                    WHERE id = $2
                `, [hashedPassword, userId]);

                this.emit('passwordChanged', { userId, timestamp: new Date() });

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('authError', { action: 'changePassword', error: error.message });
            throw error;
        }
    }

    /**
     * Reset password (admin function)
     * @param {string} email - User email
     * @returns {Promise<string>} Temporary password
     */
    async resetPassword(email) {
        try {
            const user = await this.getUserByEmail(email);
            if (!user) {
                throw new Error('User not found');
            }

            // Generate temporary password
            const tempPassword = crypto.randomBytes(12).toString('hex');
            const hashedPassword = await bcrypt.hash(tempPassword, this.saltRounds);

            // Update password
            const client = await this.db.connect();
            try {
                await client.query(`
                    UPDATE users SET 
                        password_hash = $1, 
                        password_reset_required = true,
                        updated_at = NOW()
                    WHERE id = $2
                `, [hashedPassword, user.id]);

                this.emit('passwordReset', { userId: user.id, email, timestamp: new Date() });

                return tempPassword;

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('authError', { action: 'resetPassword', error: error.message });
            throw error;
        }
    }

    /**
     * Send email verification for new registrations
     * @param {string} userId - User ID
     * @param {string} email - Email address
     * @returns {Promise<Object>} Verification result
     */
    async sendEmailVerification(userId, email) {
        try {
            const requestInfo = {
                ip_address: null, // Will be set by caller if available
                user_agent: null
            };
            
            return await this.passwordRecovery.initiateEmailVerification(userId, email, requestInfo);
            
        } catch (error) {
            this.emit('authError', { action: 'sendEmailVerification', userId, error: error.message });
            throw error;
        }
    }

    /**
     * Verify email address with token
     * @param {string} token - Verification token
     * @returns {Promise<Object>} Verification result
     */
    async verifyEmail(token) {
        try {
            return await this.passwordRecovery.completeEmailVerification(token);
            
        } catch (error) {
            this.emit('authError', { action: 'verifyEmail', error: error.message });
            throw error;
        }
    }

    /**
     * Initiate password recovery
     * @param {string} email - User email
     * @param {Object} requestInfo - Request context
     * @returns {Promise<Object>} Recovery initiation result
     */
    async initiatePasswordRecovery(email, requestInfo = {}) {
        try {
            return await this.passwordRecovery.initiatePasswordReset(email, requestInfo);
            
        } catch (error) {
            this.emit('authError', { action: 'initiatePasswordRecovery', email, error: error.message });
            throw error;
        }
    }

    /**
     * Complete password recovery
     * @param {string} token - Recovery token
     * @param {string} newPassword - New password
     * @param {Object} requestInfo - Request context
     * @returns {Promise<Object>} Recovery completion result
     */
    async completePasswordRecovery(token, newPassword, requestInfo = {}) {
        try {
            return await this.passwordRecovery.completePasswordReset(token, newPassword, requestInfo);
            
        } catch (error) {
            this.emit('authError', { action: 'completePasswordRecovery', error: error.message });
            throw error;
        }
    }
}

module.exports = AuthenticationService;