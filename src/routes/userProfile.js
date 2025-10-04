const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const UserProfileService = require('../services/userProfileService');
const PasswordRecoveryService = require('../services/passwordRecoveryService');
const { 
    authenticateToken, 
    requireOwnershipOrAdmin,
    rateLimitByUser 
} = require('../middleware/auth');

function createUserProfileRoutes(database, config) {
    const router = express.Router();
    
    // Initialize services
    const userProfileService = new UserProfileService(database, config);
    const passwordRecoveryService = new PasswordRecoveryService(database, config);

    // Validation middleware
    const validatePreferences = [
        body('alert_thresholds').optional().isObject(),
        body('dashboard_preferences').optional().isObject(),
        body('notification_preferences').optional().isObject(),
        body('trading_preferences').optional().isObject(),
        body('favorite_validators').optional().isArray(),
        body('preferred_cluster').optional().isIn(['mainnet-beta', 'devnet', 'testnet'])
    ];

    const validateSimulation = [
        body('name').isLength({ min: 1, max: 255 }).withMessage('Simulation name is required and must be under 255 characters'),
        body('simulation_type').isIn(['arbitrage', 'liquidation', 'bundle', 'validator_delegation']).withMessage('Invalid simulation type'),
        body('parameters').isObject().withMessage('Parameters must be an object'),
        body('description').optional().isLength({ max: 1000 }),
        body('tags').optional().isArray(),
        body('is_public').optional().isBoolean()
    ];

    const validateAlertSetting = [
        body('alert_name').isLength({ min: 1, max: 255 }).withMessage('Alert name is required'),
        body('threshold_value').isNumeric().withMessage('Threshold value must be numeric'),
        body('threshold_operator').optional().isIn(['>=', '<=', '=', '>', '<']),
        body('conditions').optional().isObject(),
        body('cooldown_minutes').optional().isInt({ min: 1, max: 1440 }),
        body('email_enabled').optional().isBoolean(),
        body('push_enabled').optional().isBoolean(),
        body('webhook_enabled').optional().isBoolean()
    ];

    // Get complete user profile
    router.get('/', authenticateToken(userProfileService), async (req, res) => {
        try {
            const profile = await userProfileService.getUserProfile(req.user.userId);
            
            res.json({
                success: true,
                data: profile
            });

        } catch (error) {
            res.status(500).json({
                error: 'Failed to fetch user profile',
                code: 'PROFILE_FETCH_ERROR'
            });
        }
    });

    // Update user preferences
    router.put('/preferences', 
        authenticateToken(userProfileService),
        validatePreferences,
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

            const updatedProfile = await userProfileService.updateUserPreferences(
                req.user.userId,
                req.body
            );

            res.json({
                success: true,
                message: 'Preferences updated successfully',
                data: updatedProfile
            });

        } catch (error) {
            res.status(500).json({
                error: error.message,
                code: 'PREFERENCES_UPDATE_ERROR'
            });
        }
    });

    // Get favorite validators
    router.get('/favorites', authenticateToken(userProfileService), async (req, res) => {
        try {
            const favorites = await userProfileService.getFavoriteValidators(req.user.userId);
            
            res.json({
                success: true,
                data: favorites
            });

        } catch (error) {
            res.status(500).json({
                error: 'Failed to fetch favorite validators',
                code: 'FAVORITES_FETCH_ERROR'
            });
        }
    });

    // Add favorite validator
    router.post('/favorites', 
        authenticateToken(userProfileService),
        [body('validatorAddress').isLength({ min: 32, max: 44 }).withMessage('Invalid validator address')],
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

            const { validatorAddress } = req.body;
            const updatedFavorites = await userProfileService.addFavoriteValidator(
                req.user.userId,
                validatorAddress
            );

            res.json({
                success: true,
                message: 'Validator added to favorites',
                data: updatedFavorites
            });

        } catch (error) {
            const statusCode = error.message.includes('already in favorites') ? 409 : 500;
            res.status(statusCode).json({
                error: error.message,
                code: 'FAVORITE_ADD_ERROR'
            });
        }
    });

    // Remove favorite validator
    router.delete('/favorites/:validatorAddress', 
        authenticateToken(userProfileService),
        [param('validatorAddress').isLength({ min: 32, max: 44 }).withMessage('Invalid validator address')],
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

            const { validatorAddress } = req.params;
            const updatedFavorites = await userProfileService.removeFavoriteValidator(
                req.user.userId,
                validatorAddress
            );

            res.json({
                success: true,
                message: 'Validator removed from favorites',
                data: updatedFavorites
            });

        } catch (error) {
            res.status(500).json({
                error: error.message,
                code: 'FAVORITE_REMOVE_ERROR'
            });
        }
    });

    // Get saved simulations
    router.get('/simulations', 
        authenticateToken(userProfileService),
        [
            query('simulation_type').optional().isIn(['arbitrage', 'liquidation', 'bundle', 'validator_delegation']),
            query('limit').optional().isInt({ min: 1, max: 100 }),
            query('offset').optional().isInt({ min: 0 })
        ],
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

            const simulations = await userProfileService.getSavedSimulations(
                req.user.userId,
                req.query
            );

            res.json({
                success: true,
                data: simulations
            });

        } catch (error) {
            res.status(500).json({
                error: 'Failed to fetch saved simulations',
                code: 'SIMULATIONS_FETCH_ERROR'
            });
        }
    });

    // Save new simulation
    router.post('/simulations',
        authenticateToken(userProfileService),
        validateSimulation,
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

            const savedSimulation = await userProfileService.saveSimulation(
                req.user.userId,
                req.body
            );

            res.status(201).json({
                success: true,
                message: 'Simulation saved successfully',
                data: savedSimulation
            });

        } catch (error) {
            res.status(500).json({
                error: error.message,
                code: 'SIMULATION_SAVE_ERROR'
            });
        }
    });

    // Update saved simulation
    router.put('/simulations/:simulationId',
        authenticateToken(userProfileService),
        [
            param('simulationId').isUUID().withMessage('Invalid simulation ID'),
            body('name').optional().isLength({ min: 1, max: 255 }),
            body('description').optional().isLength({ max: 1000 }),
            body('parameters').optional().isObject(),
            body('results').optional().isObject(),
            body('tags').optional().isArray(),
            body('is_public').optional().isBoolean()
        ],
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

            const { simulationId } = req.params;
            const updatedSimulation = await userProfileService.updateSimulation(
                req.user.userId,
                simulationId,
                req.body
            );

            res.json({
                success: true,
                message: 'Simulation updated successfully',
                data: updatedSimulation
            });

        } catch (error) {
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                error: error.message,
                code: 'SIMULATION_UPDATE_ERROR'
            });
        }
    });

    // Delete saved simulation
    router.delete('/simulations/:simulationId',
        authenticateToken(userProfileService),
        [param('simulationId').isUUID().withMessage('Invalid simulation ID')],
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

            const { simulationId } = req.params;
            await userProfileService.deleteSimulation(req.user.userId, simulationId);

            res.json({
                success: true,
                message: 'Simulation deleted successfully'
            });

        } catch (error) {
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                error: error.message,
                code: 'SIMULATION_DELETE_ERROR'
            });
        }
    });

    // Get alert settings
    router.get('/alerts', 
        authenticateToken(userProfileService),
        [query('alert_type').optional().isLength({ min: 1 })],
        async (req, res) => {
        try {
            const alerts = await userProfileService.getAlertThresholds(
                req.user.userId,
                req.query.alert_type
            );

            res.json({
                success: true,
                data: alerts
            });

        } catch (error) {
            res.status(500).json({
                error: 'Failed to fetch alert settings',
                code: 'ALERTS_FETCH_ERROR'
            });
        }
    });

    // Set alert threshold
    router.post('/alerts/:alertType',
        authenticateToken(userProfileService),
        [param('alertType').isLength({ min: 1, max: 50 }).withMessage('Invalid alert type')],
        validateAlertSetting,
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

            const { alertType } = req.params;
            const alertSetting = await userProfileService.setAlertThreshold(
                req.user.userId,
                alertType,
                req.body
            );

            res.json({
                success: true,
                message: 'Alert threshold set successfully',
                data: alertSetting
            });

        } catch (error) {
            res.status(500).json({
                error: error.message,
                code: 'ALERT_SET_ERROR'
            });
        }
    });

    // Toggle alert on/off
    router.patch('/alerts/:alertId/toggle',
        authenticateToken(userProfileService),
        [
            param('alertId').isUUID().withMessage('Invalid alert ID'),
            body('enabled').isBoolean().withMessage('Enabled status must be boolean')
        ],
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

            const { alertId } = req.params;
            const { enabled } = req.body;

            const updatedAlert = await userProfileService.toggleAlert(
                req.user.userId,
                alertId,
                enabled
            );

            res.json({
                success: true,
                message: `Alert ${enabled ? 'enabled' : 'disabled'} successfully`,
                data: updatedAlert
            });

        } catch (error) {
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                error: error.message,
                code: 'ALERT_TOGGLE_ERROR'
            });
        }
    });

    // Get user activity statistics
    router.get('/activity',
        authenticateToken(userProfileService),
        [query('days').optional().isInt({ min: 1, max: 365 })],
        async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 30;
            const activity = await userProfileService.getUserActivityStats(req.user.userId, days);

            res.json({
                success: true,
                data: activity
            });

        } catch (error) {
            res.status(500).json({
                error: 'Failed to fetch user activity',
                code: 'ACTIVITY_FETCH_ERROR'
            });
        }
    });

    // Password recovery endpoints
    router.post('/password-recovery/initiate',
        rateLimitByUser(60 * 60 * 1000, 3), // 3 attempts per hour
        [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
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

            const { email } = req.body;
            const requestInfo = {
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            };

            const result = await passwordRecoveryService.initiatePasswordReset(email, requestInfo);

            res.json(result);

        } catch (error) {
            const statusCode = error.message.includes('Too many') ? 429 : 500;
            res.status(statusCode).json({
                error: error.message,
                code: 'PASSWORD_RESET_ERROR'
            });
        }
    });

    // Validate password reset token
    router.post('/password-recovery/validate',
        [body('token').isLength({ min: 64, max: 64 }).withMessage('Invalid token format')],
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

            const { token } = req.body;
            const validation = await passwordRecoveryService.validateResetToken(token);

            res.json({
                success: true,
                data: validation
            });

        } catch (error) {
            res.status(400).json({
                error: error.message,
                code: 'TOKEN_VALIDATION_ERROR'
            });
        }
    });

    // Complete password reset
    router.post('/password-recovery/complete',
        rateLimitByUser(60 * 60 * 1000, 5), // 5 attempts per hour
        [
            body('token').isLength({ min: 64, max: 64 }).withMessage('Invalid token format'),
            body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
                .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number')
        ],
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

            const { token, newPassword } = req.body;
            const requestInfo = {
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            };

            const result = await passwordRecoveryService.completePasswordReset(
                token,
                newPassword,
                requestInfo
            );

            res.json(result);

        } catch (error) {
            res.status(400).json({
                error: error.message,
                code: 'PASSWORD_RESET_COMPLETE_ERROR'
            });
        }
    });

    // Email verification endpoints
    router.post('/email-verification/initiate',
        authenticateToken(userProfileService),
        [body('newEmail').isEmail().normalizeEmail().withMessage('Valid email is required')],
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

            const { newEmail } = req.body;
            const requestInfo = {
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            };

            const result = await passwordRecoveryService.initiateEmailVerification(
                req.user.userId,
                newEmail,
                requestInfo
            );

            res.json(result);

        } catch (error) {
            res.status(400).json({
                error: error.message,
                code: 'EMAIL_VERIFICATION_ERROR'
            });
        }
    });

    // Complete email verification
    router.post('/email-verification/complete',
        [body('token').isLength({ min: 64, max: 64 }).withMessage('Invalid token format')],
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

            const { token } = req.body;
            const result = await passwordRecoveryService.completeEmailVerification(token);

            res.json(result);

        } catch (error) {
            res.status(400).json({
                error: error.message,
                code: 'EMAIL_VERIFICATION_COMPLETE_ERROR'
            });
        }
    });

    return router;
}

module.exports = createUserProfileRoutes;