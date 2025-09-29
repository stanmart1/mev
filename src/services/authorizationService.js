const { EventEmitter } = require('events');

/**
 * Role-Based Access Control (RBAC) Authorization Service
 * Manages user roles and permissions for validators, searchers, researchers, and admins
 */
class AuthorizationService extends EventEmitter {
    constructor(database, config) {
        super();
        this.db = database;
        this.config = config;

        // Define role hierarchy and permissions
        this.roles = {
            admin: {
                level: 100,
                permissions: [
                    'admin:*',
                    'users:*',
                    'system:*',
                    'analytics:*',
                    'api:*'
                ]
            },
            validator: {
                level: 80,
                permissions: [
                    'validator:read',
                    'validator:performance',
                    'validator:analytics',
                    'validator:delegation',
                    'mev:attribution',
                    'api:validator'
                ]
            },
            searcher: {
                level: 70,
                permissions: [
                    'searcher:read',
                    'searcher:opportunities',
                    'searcher:bundles',
                    'searcher:execution',
                    'mev:detection',
                    'api:searcher'
                ]
            },
            researcher: {
                level: 60,
                permissions: [
                    'researcher:read',
                    'researcher:data',
                    'researcher:export',
                    'analytics:read',
                    'api:research'
                ]
            },
            premium: {
                level: 50,
                permissions: [
                    'user:premium',
                    'analytics:read',
                    'api:premium'
                ]
            },
            user: {
                level: 10,
                permissions: [
                    'user:read',
                    'analytics:basic',
                    'api:basic'
                ]
            }
        };

        // Define resource permissions
        this.resources = {
            'mev-opportunities': {
                'read': ['searcher', 'validator', 'researcher', 'admin'],
                'create': ['searcher', 'admin'],
                'update': ['searcher', 'admin'],
                'delete': ['admin']
            },
            'validator-analytics': {
                'read': ['validator', 'researcher', 'admin'],
                'create': ['validator', 'admin'],
                'update': ['validator', 'admin'],
                'delete': ['admin']
            },
            'bundle-construction': {
                'read': ['searcher', 'researcher', 'admin'],
                'create': ['searcher', 'admin'],
                'execute': ['searcher', 'admin'],
                'delete': ['searcher', 'admin']
            },
            'user-management': {
                'read': ['admin'],
                'create': ['admin'],
                'update': ['admin'],
                'delete': ['admin']
            },
            'system-config': {
                'read': ['admin'],
                'update': ['admin']
            },
            'api-keys': {
                'read': ['user', 'premium', 'searcher', 'validator', 'researcher', 'admin'],
                'create': ['user', 'premium', 'searcher', 'validator', 'researcher', 'admin'],
                'delete': ['user', 'premium', 'searcher', 'validator', 'researcher', 'admin']
            }
        };
    }

    /**
     * Check if user has permission for a specific action on a resource
     * @param {string} userId - User ID
     * @param {string} resource - Resource name
     * @param {string} action - Action to perform
     * @returns {Promise<boolean>} Permission result
     */
    async hasPermission(userId, resource, action) {
        try {
            const user = await this.getUserWithRoles(userId);
            if (!user) {
                return false;
            }

            // Check if user is active
            if (!user.is_active) {
                return false;
            }

            // Admin has all permissions
            if (user.role === 'admin') {
                return true;
            }

            // Check resource-specific permissions
            const resourceConfig = this.resources[resource];
            if (!resourceConfig) {
                return false;
            }

            const allowedRoles = resourceConfig[action];
            if (!allowedRoles) {
                return false;
            }

            // Check if user's role is in allowed roles
            const hasResourcePermission = allowedRoles.includes(user.role);
            if (hasResourcePermission) {
                return true;
            }

            // Check custom permissions
            const customPermissions = await this.getUserCustomPermissions(userId);
            const permissionKey = `${resource}:${action}`;
            
            return customPermissions.includes(permissionKey) || 
                   customPermissions.includes(`${resource}:*`) ||
                   customPermissions.includes('*');

        } catch (error) {
            this.emit('authzError', { 
                action: 'hasPermission', 
                userId, 
                resource, 
                action: action,
                error: error.message 
            });
            return false;
        }
    }

    /**
     * Check if user has any of the specified roles
     * @param {string} userId - User ID
     * @param {string[]} roles - Roles to check
     * @returns {Promise<boolean>} Role check result
     */
    async hasRole(userId, roles) {
        try {
            const user = await this.getUserWithRoles(userId);
            if (!user || !user.is_active) {
                return false;
            }

            return roles.includes(user.role);

        } catch (error) {
            this.emit('authzError', { 
                action: 'hasRole', 
                userId, 
                roles, 
                error: error.message 
            });
            return false;
        }
    }

    /**
     * Check if user has minimum role level
     * @param {string} userId - User ID
     * @param {string} minimumRole - Minimum required role
     * @returns {Promise<boolean>} Role level check result
     */
    async hasMinimumRole(userId, minimumRole) {
        try {
            const user = await this.getUserWithRoles(userId);
            if (!user || !user.is_active) {
                return false;
            }

            const userLevel = this.roles[user.role]?.level || 0;
            const minimumLevel = this.roles[minimumRole]?.level || 0;

            return userLevel >= minimumLevel;

        } catch (error) {
            this.emit('authzError', { 
                action: 'hasMinimumRole', 
                userId, 
                minimumRole, 
                error: error.message 
            });
            return false;
        }
    }

    /**
     * Assign role to user
     * @param {string} userId - User ID
     * @param {string} role - Role to assign
     * @param {string} assignedBy - Admin user ID
     * @returns {Promise<void>}
     */
    async assignRole(userId, role, assignedBy) {
        try {
            // Validate role exists
            if (!this.roles[role]) {
                throw new Error(`Invalid role: ${role}`);
            }

            // Check if assigner has permission
            const canAssign = await this.hasPermission(assignedBy, 'user-management', 'update');
            if (!canAssign) {
                throw new Error('Insufficient permissions to assign roles');
            }

            // Update user role
            const client = await this.db.connect();
            try {
                await client.query(`
                    UPDATE users 
                    SET role = $1, updated_at = NOW(), updated_by = $2
                    WHERE id = $3
                `, [role, assignedBy, userId]);

                // Log role assignment
                await this.logRoleChange({
                    userId,
                    newRole: role,
                    assignedBy,
                    action: 'assign',
                    timestamp: new Date()
                });

                this.emit('roleAssigned', { userId, role, assignedBy });

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('authzError', { 
                action: 'assignRole', 
                userId, 
                role, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Grant custom permission to user
     * @param {string} userId - User ID
     * @param {string} permission - Permission to grant
     * @param {string} grantedBy - Admin user ID
     * @returns {Promise<void>}
     */
    async grantPermission(userId, permission, grantedBy) {
        try {
            // Check if granter has permission
            const canGrant = await this.hasPermission(grantedBy, 'user-management', 'update');
            if (!canGrant) {
                throw new Error('Insufficient permissions to grant permissions');
            }

            const client = await this.db.connect();
            try {
                await client.query(`
                    INSERT INTO user_permissions (user_id, permission, granted_by, granted_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (user_id, permission) 
                    DO UPDATE SET granted_by = $3, granted_at = NOW()
                `, [userId, permission, grantedBy]);

                this.emit('permissionGranted', { userId, permission, grantedBy });

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('authzError', { 
                action: 'grantPermission', 
                userId, 
                permission, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Revoke custom permission from user
     * @param {string} userId - User ID
     * @param {string} permission - Permission to revoke
     * @param {string} revokedBy - Admin user ID
     * @returns {Promise<void>}
     */
    async revokePermission(userId, permission, revokedBy) {
        try {
            // Check if revoker has permission
            const canRevoke = await this.hasPermission(revokedBy, 'user-management', 'update');
            if (!canRevoke) {
                throw new Error('Insufficient permissions to revoke permissions');
            }

            const client = await this.db.connect();
            try {
                await client.query(`
                    DELETE FROM user_permissions 
                    WHERE user_id = $1 AND permission = $2
                `, [userId, permission]);

                this.emit('permissionRevoked', { userId, permission, revokedBy });

            } finally {
                client.release();
            }

        } catch (error) {
            this.emit('authzError', { 
                action: 'revokePermission', 
                userId, 
                permission, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get user's effective permissions
     * @param {string} userId - User ID
     * @returns {Promise<string[]>} List of permissions
     */
    async getUserPermissions(userId) {
        try {
            const user = await this.getUserWithRoles(userId);
            if (!user || !user.is_active) {
                return [];
            }

            // Get role-based permissions
            const rolePermissions = this.roles[user.role]?.permissions || [];

            // Get custom permissions
            const customPermissions = await this.getUserCustomPermissions(userId);

            // Combine and deduplicate
            const allPermissions = [...new Set([...rolePermissions, ...customPermissions])];

            return allPermissions;

        } catch (error) {
            this.emit('authzError', { 
                action: 'getUserPermissions', 
                userId, 
                error: error.message 
            });
            return [];
        }
    }

    /**
     * Get user with roles from database
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User object
     */
    async getUserWithRoles(userId) {
        const client = await this.db.connect();
        try {
            const result = await client.query(`
                SELECT id, email, role, wallet_address, is_active, created_at
                FROM users WHERE id = $1
            `, [userId]);

            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Get user's custom permissions
     * @param {string} userId - User ID
     * @returns {Promise<string[]>} Custom permissions
     */
    async getUserCustomPermissions(userId) {
        const client = await this.db.connect();
        try {
            const result = await client.query(`
                SELECT permission FROM user_permissions 
                WHERE user_id = $1
            `, [userId]);

            return result.rows.map(row => row.permission);
        } finally {
            client.release();
        }
    }

    /**
     * Log role change for audit purposes
     * @param {Object} changeData - Role change data
     */
    async logRoleChange(changeData) {
        const client = await this.db.connect();
        try {
            await client.query(`
                INSERT INTO role_audit_log 
                (user_id, new_role, changed_by, action, timestamp)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                changeData.userId,
                changeData.newRole,
                changeData.assignedBy,
                changeData.action,
                changeData.timestamp
            ]);
        } finally {
            client.release();
        }
    }

    /**
     * Create authorization middleware for Express
     * @param {string} resource - Resource name
     * @param {string} action - Required action
     * @returns {Function} Express middleware
     */
    createPermissionMiddleware(resource, action) {
        return async (req, res, next) => {
            try {
                if (!req.user || !req.user.userId) {
                    return res.status(401).json({ 
                        error: 'Authentication required',
                        code: 'AUTH_REQUIRED'
                    });
                }

                const hasPermission = await this.hasPermission(
                    req.user.userId,
                    resource,
                    action
                );

                if (!hasPermission) {
                    return res.status(403).json({ 
                        error: 'Insufficient permissions',
                        code: 'INSUFFICIENT_PERMISSIONS',
                        required: `${resource}:${action}`
                    });
                }

                next();
            } catch (error) {
                res.status(500).json({ 
                    error: 'Authorization error',
                    code: 'AUTHZ_ERROR'
                });
            }
        };
    }

    /**
     * Create role middleware for Express
     * @param {string[]} allowedRoles - Allowed roles
     * @returns {Function} Express middleware
     */
    createRoleMiddleware(allowedRoles) {
        return async (req, res, next) => {
            try {
                if (!req.user || !req.user.userId) {
                    return res.status(401).json({ 
                        error: 'Authentication required',
                        code: 'AUTH_REQUIRED'
                    });
                }

                const hasRole = await this.hasRole(req.user.userId, allowedRoles);

                if (!hasRole) {
                    return res.status(403).json({ 
                        error: 'Insufficient role',
                        code: 'INSUFFICIENT_ROLE',
                        required: allowedRoles
                    });
                }

                next();
            } catch (error) {
                res.status(500).json({ 
                    error: 'Authorization error',
                    code: 'AUTHZ_ERROR'
                });
            }
        };
    }

    /**
     * Get role hierarchy information
     * @returns {Object} Role hierarchy
     */
    getRoleHierarchy() {
        return this.roles;
    }

    /**
     * Get resource permissions configuration
     * @returns {Object} Resource permissions
     */
    getResourcePermissions() {
        return this.resources;
    }
}

module.exports = AuthorizationService;