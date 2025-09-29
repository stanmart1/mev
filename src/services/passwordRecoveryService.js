const { EventEmitter } = require('events');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

/**
 * Password Recovery Service
 * Handles secure password recovery flows with email-based verification
 */
class PasswordRecoveryService extends EventEmitter {
    constructor(database, config, emailService = null) {
        super();
        this.db = database;
        this.config = config;
        this.emailService = emailService;
        
        // Token configuration
        this.tokenExpiryMinutes = 15; // 15 minutes for password reset
        this.saltRounds = 12;
        
        // Rate limiting for password reset requests
        this.resetAttempts = new Map(); // email -> { count, lastAttempt }
        this.maxResetAttempts = 3; // per hour
        this.resetAttemptWindow = 60 * 60 * 1000; // 1 hour
    }

    /**
     * Initiate password reset process
     * @param {string} email - User email
     * @param {Object} requestInfo - Request context (IP, user agent)
     * @returns {Promise<Object>} Reset initiation result
     */
    async initiatePasswordReset(email, requestInfo = {}) {
        try {
            const { ip_address, user_agent } = requestInfo;

            // Check rate limiting
            await this.checkResetRateLimit(email);

            // Verify user exists
            const user = await this.getUserByEmail(email);
            if (!user) {
                // Don't reveal if email exists - return success anyway for security
                return {
                    success: true,
                    message: 'If an account with this email exists, a password reset link has been sent.'
                };
            }

            // Check if user is active
            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }

            // Generate secure reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
            const expiresAt = new Date(Date.now() + this.tokenExpiryMinutes * 60 * 1000);

            // Store reset token in database
            const client = await this.db.connect();
            try {
                // Invalidate any existing tokens for this user
                await client.query(`
                    UPDATE password_recovery_tokens 
                    SET is_used = true 
                    WHERE user_id = $1 AND is_used = false
                `, [user.id]);

                // Insert new token
                await client.query(`
                    INSERT INTO password_recovery_tokens (
                        user_id, token_hash, expires_at, ip_address, user_agent
                    ) VALUES ($1, $2, $3, $4, $5)
                `, [user.id, tokenHash, expiresAt, ip_address, user_agent]);

                // Log security event
                await this.logPasswordResetRequest(user.id, ip_address, user_agent);

            } finally {
                client.release();
            }

            // Send password reset email (if email service is configured)
            if (this.emailService) {
                await this.sendPasswordResetEmail(user, resetToken);
            }

            // Record rate limiting attempt
            this.recordResetAttempt(email);

            this.emit('passwordResetInitiated', {
                userId: user.id,
                email: user.email,
                ip_address,
                timestamp: new Date()
            });

            return {
                success: true,
                message: 'Password reset link has been sent to your email address.',
                expiresIn: this.tokenExpiryMinutes * 60 // seconds
            };

        } catch (error) {
            this.emit('passwordResetError', {
                action: 'initiatePasswordReset',
                email,
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    /**
     * Validate password reset token
     * @param {string} token - Reset token
     * @returns {Promise<Object>} Token validation result
     */
    async validateResetToken(token) {
        try {
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    SELECT 
                        prt.*,
                        u.email,
                        u.is_active
                    FROM password_recovery_tokens prt
                    JOIN users u ON prt.user_id = u.id
                    WHERE prt.token_hash = $1 
                    AND prt.expires_at > NOW()
                    AND prt.is_used = false
                `, [tokenHash]);

                if (result.rows.length === 0) {
                    throw new Error('Invalid or expired reset token');
                }

                const tokenData = result.rows[0];

                // Check if user is still active
                if (!tokenData.is_active) {
                    throw new Error('Account is deactivated');
                }

                return {
                    valid: true,
                    userId: tokenData.user_id,
                    email: tokenData.email,
                    expiresAt: tokenData.expires_at
                };

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('passwordResetError', {
                action: 'validateResetToken',
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    /**
     * Complete password reset with new password
     * @param {string} token - Reset token
     * @param {string} newPassword - New password
     * @param {Object} requestInfo - Request context
     * @returns {Promise<Object>} Reset completion result
     */
    async completePasswordReset(token, newPassword, requestInfo = {}) {
        try {
            const { ip_address, user_agent } = requestInfo;

            // Validate password strength
            if (!this.isValidPassword(newPassword)) {
                throw new Error('Password does not meet security requirements');
            }

            // Validate token and get user data
            const tokenValidation = await this.validateResetToken(token);
            const { userId, email } = tokenValidation;

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            const client = await this.db.connect();
            try {
                await client.query('BEGIN');

                // Update user password
                await client.query(`
                    UPDATE users 
                    SET 
                        password_hash = $1,
                        password_reset_required = false,
                        updated_at = NOW()
                    WHERE id = $2
                `, [hashedPassword, userId]);

                // Mark token as used
                await client.query(`
                    UPDATE password_recovery_tokens 
                    SET is_used = true, used_at = NOW()
                    WHERE token_hash = $1
                `, [tokenHash]);

                // Invalidate all refresh tokens (force re-login)
                await client.query(`
                    DELETE FROM refresh_tokens WHERE user_id = $1
                `, [userId]);

                // Blacklist any existing access tokens by updating user's token version
                await client.query(`
                    UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1
                `, [userId]);

                await client.query('COMMIT');

                // Log security event
                await this.logPasswordResetCompleted(userId, ip_address, user_agent);

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

            // Send confirmation email (if email service is configured)
            if (this.emailService) {
                await this.sendPasswordResetConfirmation(email);
            }

            this.emit('passwordResetCompleted', {
                userId,
                email,
                ip_address,
                timestamp: new Date()
            });

            return {
                success: true,
                message: 'Password has been successfully reset. Please log in with your new password.'
            };

        } catch (error) {
            this.emit('passwordResetError', {
                action: 'completePasswordReset',
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    /**
     * Send verification email for email address changes
     * @param {string} userId - User ID
     * @param {string} newEmail - New email address
     * @param {Object} requestInfo - Request context
     * @returns {Promise<Object>} Verification initiation result
     */
    async initiateEmailVerification(userId, newEmail, requestInfo = {}) {
        try {
            const { ip_address, user_agent } = requestInfo;

            // Validate email format
            if (!this.isValidEmail(newEmail)) {
                throw new Error('Invalid email format');
            }

            // Check if email is already in use
            const existingUser = await this.getUserByEmail(newEmail);
            if (existingUser && existingUser.id !== userId) {
                throw new Error('Email address is already in use');
            }

            // Generate verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            const client = await this.db.connect();
            try {
                // Invalidate any existing email verification tokens for this user
                await client.query(`
                    UPDATE email_verification_tokens 
                    SET is_verified = true 
                    WHERE user_id = $1 AND is_verified = false
                `, [userId]);

                // Insert new verification token
                await client.query(`
                    INSERT INTO email_verification_tokens (
                        user_id, token_hash, email, expires_at
                    ) VALUES ($1, $2, $3, $4)
                `, [userId, tokenHash, newEmail.toLowerCase(), expiresAt]);

            } finally {
                client.release();
            }

            // Send verification email (if email service is configured)
            if (this.emailService) {
                await this.sendEmailVerification(newEmail, verificationToken);
            }

            this.emit('emailVerificationInitiated', {
                userId,
                newEmail,
                ip_address,
                timestamp: new Date()
            });

            return {
                success: true,
                message: 'Verification email has been sent to the new email address.',
                expiresIn: 24 * 60 * 60 // 24 hours in seconds
            };

        } catch (error) {
            this.emit('emailVerificationError', {
                action: 'initiateEmailVerification',
                userId,
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    /**
     * Complete email verification
     * @param {string} token - Verification token
     * @returns {Promise<Object>} Verification completion result
     */
    async completeEmailVerification(token) {
        try {
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            const client = await this.db.connect();
            try {
                const result = await client.query(`
                    SELECT evt.*, u.email as current_email
                    FROM email_verification_tokens evt
                    JOIN users u ON evt.user_id = u.id
                    WHERE evt.token_hash = $1 
                    AND evt.expires_at > NOW()
                    AND evt.is_verified = false
                `, [tokenHash]);

                if (result.rows.length === 0) {
                    throw new Error('Invalid or expired verification token');
                }

                const verificationData = result.rows[0];

                await client.query('BEGIN');

                // Update user email
                await client.query(`
                    UPDATE users 
                    SET 
                        email = $1,
                        email_verified = true,
                        updated_at = NOW()
                    WHERE id = $2
                `, [verificationData.email, verificationData.user_id]);

                // Mark verification token as used
                await client.query(`
                    UPDATE email_verification_tokens 
                    SET is_verified = true, verified_at = NOW()
                    WHERE token_hash = $1
                `, [tokenHash]);

                await client.query('COMMIT');

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

            this.emit('emailVerificationCompleted', {
                userId: verificationData.user_id,
                oldEmail: verificationData.current_email,
                newEmail: verificationData.email,
                timestamp: new Date()
            });

            return {
                success: true,
                message: 'Email address has been successfully verified and updated.'
            };

        } catch (error) {
            this.emit('emailVerificationError', {
                action: 'completeEmailVerification',
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    /**
     * Check rate limiting for password reset requests
     * @param {string} email - Email address
     * @returns {Promise<void>}
     */
    async checkResetRateLimit(email) {
        const normalizedEmail = email.toLowerCase();
        const now = Date.now();
        
        if (this.resetAttempts.has(normalizedEmail)) {
            const attempts = this.resetAttempts.get(normalizedEmail);
            const timeSinceFirst = now - attempts.firstAttempt;
            
            if (timeSinceFirst < this.resetAttemptWindow) {
                if (attempts.count >= this.maxResetAttempts) {
                    const remainingTime = Math.ceil((this.resetAttemptWindow - timeSinceFirst) / 60000);
                    throw new Error(`Too many password reset attempts. Please try again in ${remainingTime} minutes.`);
                }
            } else {
                // Reset window has passed, clear attempts
                this.resetAttempts.delete(normalizedEmail);
            }
        }
    }

    /**
     * Record password reset attempt for rate limiting
     * @param {string} email - Email address
     */
    recordResetAttempt(email) {
        const normalizedEmail = email.toLowerCase();
        const now = Date.now();
        
        if (this.resetAttempts.has(normalizedEmail)) {
            const attempts = this.resetAttempts.get(normalizedEmail);
            attempts.count++;
            attempts.lastAttempt = now;
        } else {
            this.resetAttempts.set(normalizedEmail, {
                count: 1,
                firstAttempt: now,
                lastAttempt: now
            });
        }
    }

    /**
     * Get user by email
     * @param {string} email - Email address
     * @returns {Promise<Object|null>} User object
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
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Validity
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {boolean} Validity
     */
    isValidPassword(password) {
        // Minimum 8 characters, at least one letter and one number
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
        return passwordRegex.test(password);
    }

    /**
     * Log password reset request for security audit
     * @param {string} userId - User ID
     * @param {string} ipAddress - IP address
     * @param {string} userAgent - User agent
     */
    async logPasswordResetRequest(userId, ipAddress, userAgent) {
        try {
            const client = await this.db.connect();
            try {
                await client.query(`
                    INSERT INTO user_activity_log (
                        user_id, activity_type, activity_description,
                        ip_address, user_agent, is_suspicious, risk_score
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    userId,
                    'password_reset_request',
                    'Password reset token requested',
                    ipAddress,
                    userAgent,
                    false,
                    30 // Medium risk score for password reset requests
                ]);
            } finally {
                client.release();
            }
        } catch (error) {
            // Don't throw on logging errors
            console.error('Failed to log password reset request:', error);
        }
    }

    /**
     * Log password reset completion for security audit
     * @param {string} userId - User ID
     * @param {string} ipAddress - IP address
     * @param {string} userAgent - User agent
     */
    async logPasswordResetCompleted(userId, ipAddress, userAgent) {
        try {
            const client = await this.db.connect();
            try {
                await client.query(`
                    INSERT INTO user_activity_log (
                        user_id, activity_type, activity_description,
                        ip_address, user_agent, is_suspicious, risk_score
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    userId,
                    'password_reset_completed',
                    'Password successfully reset using reset token',
                    ipAddress,
                    userAgent,
                    false,
                    40 // Higher risk score for password changes
                ]);
            } finally {
                client.release();
            }
        } catch (error) {
            // Don't throw on logging errors
            console.error('Failed to log password reset completion:', error);
        }
    }

    /**
     * Send password reset email (placeholder - requires email service integration)
     * @param {Object} user - User object
     * @param {string} resetToken - Reset token
     */
    async sendPasswordResetEmail(user, resetToken) {
        if (!this.emailService) {
            console.log('Email service not configured. Password reset email would be sent to:', user.email);
            console.log('Reset link: /reset-password?token=' + resetToken);
            return;
        }

        // Email service integration would go here
        const resetLink = `${this.config.frontendUrl}/reset-password?token=${resetToken}`;
        
        await this.emailService.sendEmail({
            to: user.email,
            subject: 'Password Reset Request - MEV Analytics Platform',
            template: 'password-reset',
            data: {
                resetLink,
                expiryMinutes: this.tokenExpiryMinutes,
                userEmail: user.email
            }
        });
    }

    /**
     * Send password reset confirmation email
     * @param {string} email - Email address
     */
    async sendPasswordResetConfirmation(email) {
        if (!this.emailService) {
            console.log('Password reset confirmation email would be sent to:', email);
            return;
        }

        await this.emailService.sendEmail({
            to: email,
            subject: 'Password Reset Confirmation - MEV Analytics Platform',
            template: 'password-reset-confirmation',
            data: {
                userEmail: email,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Send email verification email
     * @param {string} email - Email address
     * @param {string} verificationToken - Verification token
     */
    async sendEmailVerification(email, verificationToken) {
        if (!this.emailService) {
            console.log('Email verification would be sent to:', email);
            console.log('Verification link: /verify-email?token=' + verificationToken);
            return;
        }

        const verificationLink = `${this.config.frontendUrl}/verify-email?token=${verificationToken}`;
        
        await this.emailService.sendEmail({
            to: email,
            subject: 'Email Verification - MEV Analytics Platform',
            template: 'email-verification',
            data: {
                verificationLink,
                userEmail: email
            }
        });
    }

    /**
     * Clean up expired tokens (should be run periodically)
     * @returns {Promise<Object>} Cleanup results
     */
    async cleanupExpiredTokens() {
        try {
            const client = await this.db.connect();
            try {
                const [passwordTokens, emailTokens] = await Promise.all([
                    client.query(`
                        DELETE FROM password_recovery_tokens 
                        WHERE expires_at < NOW()
                        RETURNING id
                    `),
                    client.query(`
                        DELETE FROM email_verification_tokens 
                        WHERE expires_at < NOW()
                        RETURNING id
                    `)
                ]);

                const result = {
                    passwordTokensDeleted: passwordTokens.rows.length,
                    emailTokensDeleted: emailTokens.rows.length,
                    timestamp: new Date()
                };

                this.emit('tokensCleanedUp', result);
                return result;

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('passwordResetError', {
                action: 'cleanupExpiredTokens',
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }
}

module.exports = PasswordRecoveryService;
