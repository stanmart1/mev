const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthenticationService = require('../services/authenticationService');
const AuthorizationService = require('../services/authorizationService');
const ApiKeyService = require('../services/apiKeyService');
const { 
    authenticateToken, 
    requireOwnershipOrAdmin, 
    requireAdmin,
    rateLimitByUser,
    enhancedLoginRateLimit,
    recordFailedLogin,
    clearLoginAttempts,
    clearAllLoginAttempts,
    suspiciousActivityDetector
} = require('../middleware/auth');

function createAuthRoutes(database, config) {
    const router = express.Router();
    
    // Initialize services
    const authService = new AuthenticationService(database, config);
    const authzService = new AuthorizationService(database, config);
    const apiKeyService = new ApiKeyService(database, config);

    // Validation middleware
    const validateRegistration = [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('role').optional().isIn(['user', 'validator', 'searcher', 'researcher']),
        body('walletAddress').optional().isLength({ min: 32, max: 44 })
    ];

    const validateLogin = [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty()
    ];

    const validateWalletLogin = [
        body('walletAddress').notEmpty(),
        body('signature').notEmpty(),
        body('message').notEmpty()
    ];

    // Authentication routes
    router.post('/register', validateRegistration, async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: errors.array()
                });
            }

            const { email, password, role, walletAddress } = req.body;
            const result = await authService.registerUser({
                email,
                password,
                role,
                walletAddress
            });

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: result
            });

        } catch (error) {
            res.status(400).json({
                error: error.message,
                code: 'REGISTRATION_ERROR'
            });
        }
    });

    router.post('/login', 
        validateLogin, 
        enhancedLoginRateLimit(60 * 1000, 5), // 5 attempts per 60 seconds
        async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                recordFailedLogin(req.body.email, req.ip);
                return res.status(400).json({
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: errors.array()
                });
            }

            const { email, password } = req.body;
            
            try {
                const result = await authService.loginUser(email, password);
                
                // Clear failed login attempts on successful login
                clearLoginAttempts(email);
                
                res.json({
                    success: true,
                    message: 'Login successful',
                    data: result
                });
                
            } catch (loginError) {
                // Record failed login attempt
                recordFailedLogin(email, req.ip);
                
                res.status(401).json({
                    error: loginError.message,
                    code: 'LOGIN_ERROR'
                });
            }

        } catch (error) {
            recordFailedLogin(req.body.email, req.ip);
            res.status(500).json({
                error: 'Login error',
                code: 'SERVER_ERROR'
            });
        }
    });

    router.post('/wallet-login', 
        validateWalletLogin, 
        enhancedLoginRateLimit(60 * 1000, 3), // 3 attempts per 60 seconds for wallet login
        async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: errors.array()
                });
            }

            const { walletAddress, signature, message } = req.body;
            const result = await authService.loginWithWallet(walletAddress, signature, message);

            res.json({
                success: true,
                message: 'Wallet login successful',
                data: result
            });

        } catch (error) {
            res.status(401).json({
                error: error.message,
                code: 'WALLET_LOGIN_ERROR'
            });
        }
    });

    router.post('/refresh', async (req, res) => {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({
                    error: 'Refresh token required',
                    code: 'REFRESH_TOKEN_REQUIRED'
                });
            }

            const result = await authService.refreshTokens(refreshToken);

            res.json({
                success: true,
                message: 'Tokens refreshed successfully',
                data: result
            });

        } catch (error) {
            res.status(401).json({
                error: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }
    });

    router.post('/logout', authenticateToken(authService), async (req, res) => {
        try {
            const token = req.headers['authorization'].split(' ')[1];
            await authService.logoutUser(req.user.userId, token);

            res.json({
                success: true,
                message: 'Logout successful'
            });

        } catch (error) {
            res.status(500).json({
                error: 'Logout error',
                code: 'LOGOUT_ERROR'
            });
        }
    });

    // User management routes
    router.get('/verify', 
        rateLimitByUser(60, 10), // 10 requests per minute per user
        authenticateToken(authService), 
        async (req, res) => {
        try {
            const user = await authService.getUserById(req.user.userId);
            
            res.json({
                success: true,
                data: {
                    user: authService.sanitizeUser(user)
                }
            });
        } catch (error) {
            res.status(401).json({
                success: false,
                error: 'Token verification failed',
                code: 'TOKEN_INVALID'
            });
        }
    });

    router.post('/signup', [
        body('username').notEmpty().isLength({ min: 3, max: 50 }),
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 })
    ], async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { username, email, password } = req.body;
            const result = await authService.registerUser({
                username,
                email,
                password,
                role: 'user'
            });

            res.status(201).json({
                success: true,
                message: 'Account created successfully',
                token: result.token,
                user: result.user
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    });

    router.get('/profile', authenticateToken(authService), async (req, res) => {
        try {
            const user = await authService.getUserById(req.user.userId);
            const permissions = await authzService.getUserPermissions(req.user.userId);

            res.json({
                success: true,
                data: {
                    user: authService.sanitizeUser(user),
                    permissions
                }
            });

        } catch (error) {
            res.status(500).json({
                error: 'Profile fetch error',
                code: 'PROFILE_ERROR'
            });
        }
    });

    router.put('/profile', authenticateToken(authService), [
        body('username').optional().isLength({ min: 3, max: 50 }),
        body('email').optional().isEmail().normalizeEmail()
    ], async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { username, email } = req.body;
            await authService.updateProfile(req.user.userId, { username, email });

            res.json({
                success: true,
                message: 'Profile updated successfully'
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    });

    router.put('/password', authenticateToken(authService), [
        body('oldPassword').notEmpty(),
        body('newPassword').isLength({ min: 8 })
    ], async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: errors.array()
                });
            }

            const { oldPassword, newPassword } = req.body;
            await authService.changePassword(req.user.userId, oldPassword, newPassword);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            res.status(400).json({
                error: error.message,
                code: 'PASSWORD_CHANGE_ERROR'
            });
        }
    });

    router.put('/change-password', authenticateToken(authService), [
        body('currentPassword').notEmpty(),
        body('newPassword').isLength({ min: 6 })
    ], async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { currentPassword, newPassword } = req.body;
            await authService.changePassword(req.user.userId, currentPassword, newPassword);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    });

    // API Key Management routes
    router.get('/api-keys', authenticateToken(authService), async (req, res) => {
        try {
            const apiKeys = await apiKeyService.getUserApiKeys(req.user.userId);

            res.json({
                success: true,
                data: apiKeys
            });

        } catch (error) {
            res.status(500).json({
                error: 'API keys fetch error',
                code: 'API_KEYS_ERROR'
            });
        }
    });

    router.post('/api-keys', authenticateToken(authService), [
        body('name').notEmpty().isLength({ max: 100 }),
        body('plan').isIn(['free', 'developer', 'professional', 'enterprise'])
    ], async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: errors.array()
                });
            }

            const { name, plan } = req.body;
            const apiKey = await apiKeyService.generateApiKey(req.user.userId, name, plan);

            res.status(201).json({
                success: true,
                message: 'API key generated successfully',
                data: apiKey
            });

        } catch (error) {
            res.status(400).json({
                error: error.message,
                code: 'API_KEY_GENERATION_ERROR'
            });
        }
    });

    router.delete('/api-keys/:keyId', authenticateToken(authService), async (req, res) => {
        try {
            await apiKeyService.revokeApiKey(req.user.userId, req.params.keyId);

            res.json({
                success: true,
                message: 'API key revoked successfully'
            });

        } catch (error) {
            res.status(400).json({
                error: error.message,
                code: 'API_KEY_REVOKE_ERROR'
            });
        }
    });

    router.get('/api-keys/:keyId/usage', authenticateToken(authService), async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 30;
            const usage = await apiKeyService.getUsageStats(req.user.userId, req.params.keyId, days);

            res.json({
                success: true,
                data: usage
            });

        } catch (error) {
            res.status(500).json({
                error: 'Usage stats error',
                code: 'USAGE_STATS_ERROR'
            });
        }
    });

    // Emergency rate limit reset (admin only)
    router.post('/admin/reset-rate-limits',
        authenticateToken(authService),
        requireAdmin(authzService),
        async (req, res) => {
            try {
                clearAllLoginAttempts();
                res.json({
                    success: true,
                    message: 'All rate limits cleared'
                });
            } catch (error) {
                res.status(500).json({
                    error: 'Reset failed',
                    code: 'RESET_ERROR'
                });
            }
        }
    );

    // Admin routes
    router.put('/users/:userId/role', 
        authenticateToken(authService),
        requireAdmin(authzService),
        [body('role').isIn(['user', 'validator', 'searcher', 'researcher', 'admin'])],
        async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        error: 'Validation failed',
                        code: 'VALIDATION_ERROR',
                        details: errors.array()
                    });
                }

                const { role } = req.body;
                await authzService.assignRole(req.params.userId, role, req.user.userId);

                res.json({
                    success: true,
                    message: 'Role assigned successfully'
                });

            } catch (error) {
                res.status(400).json({
                    error: error.message,
                    code: 'ROLE_ASSIGNMENT_ERROR'
                });
            }
        }
    );

    return router;
}

module.exports = createAuthRoutes;