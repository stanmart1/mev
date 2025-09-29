const WebSocket = require('ws');
const { EventEmitter } = require('events');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Comprehensive WebSocket Server for Real-Time MEV Analytics
 * Handles client subscriptions, push notifications, and real-time updates
 */
class MEVWebSocketServer extends EventEmitter {
    constructor(server, services, config) {
        super();
        this.server = server;
        this.services = services;
        this.config = config;
        this.clients = new Map(); // clientId -> clientData
        this.subscriptions = new Map(); // channel -> Set of clientIds
        this.metrics = {
            connectedClients: 0,
            totalConnections: 0,
            messagesSent: 0,
            messagesReceived: 0,
            subscriptionCount: 0
        };
        
        // Subscription channels
        this.channels = {
            MEV_OPPORTUNITIES: 'mev_opportunities',
            VALIDATOR_UPDATES: 'validator_updates',
            MARKET_DATA: 'market_data',
            SEARCHER_ANALYTICS: 'searcher_analytics',
            PRICE_UPDATES: 'price_updates',
            NETWORK_STATS: 'network_stats'
        };

        // Initialize WebSocket server
        this.wss = new WebSocket.Server({
            server: this.server,
            path: '/ws',
            perMessageDeflate: {
                zlibDeflateOptions: {
                    threshold: 256
                }
            }
        });

        this.setupWebSocketServer();
        this.setupEventListeners();
        
        // Heartbeat interval for connection health
        this.heartbeatInterval = setInterval(() => {
            this.performHeartbeat();
        }, 30000); // 30 seconds

        console.log('🔗 WebSocket server initialized');
    }

    /**
     * Setup WebSocket server event handlers
     */
    setupWebSocketServer() {
        this.wss.on('connection', async (ws, req) => {
            const clientId = crypto.randomUUID();
            const clientIP = req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'];

            // Initialize client data
            const clientData = {
                id: clientId,
                ws: ws,
                ip: clientIP,
                userAgent: userAgent,
                authenticated: false,
                user: null,
                subscriptions: new Set(),
                lastPing: Date.now(),
                connectedAt: new Date(),
                messageCount: 0
            };

            this.clients.set(clientId, clientData);
            this.metrics.connectedClients++;
            this.metrics.totalConnections++;

            console.log(`🔌 WebSocket client connected: ${clientId} from ${clientIP}`);

            // Setup message handlers
            ws.on('message', async (message) => {
                await this.handleMessage(clientId, message);
            });

            ws.on('close', () => {
                this.handleDisconnection(clientId);
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
                this.handleDisconnection(clientId);
            });

            // Setup ping/pong for connection health
            ws.on('pong', () => {
                const client = this.clients.get(clientId);
                if (client) {
                    client.lastPing = Date.now();
                }
            });

            // Send welcome message
            this.sendToClient(clientId, {
                type: 'welcome',
                clientId: clientId,
                channels: Object.values(this.channels),
                timestamp: new Date().toISOString()
            });
        });

        this.wss.on('error', (error) => {
            console.error('WebSocket server error:', error);
        });
    }

    /**
     * Setup event listeners for real-time data
     */
    setupEventListeners() {
        // MEV Opportunity Events
        this.services.transactionMonitor?.on('opportunityDetected', (opportunity) => {
            this.broadcastToChannel(this.channels.MEV_OPPORTUNITIES, {
                type: 'mev_opportunity',
                data: opportunity,
                timestamp: new Date().toISOString()
            });
        });

        this.services.transactionMonitor?.on('swapDetected', (swap) => {
            this.broadcastToChannel(this.channels.PRICE_UPDATES, {
                type: 'price_update',
                data: swap,
                timestamp: new Date().toISOString()
            });
        });

        // Validator Performance Events
        this.services.validatorTracker?.on('performanceUpdate', (validator) => {
            this.broadcastToChannel(this.channels.VALIDATOR_UPDATES, {
                type: 'validator_performance',
                data: validator,
                timestamp: new Date().toISOString()
            });
        });

        // Market Data Events
        this.services.marketAnalyzer?.on('marketUpdate', (marketData) => {
            this.broadcastToChannel(this.channels.MARKET_DATA, {
                type: 'market_update',
                data: marketData,
                timestamp: new Date().toISOString()
            });
        });

        // Network Statistics Events
        this.on('networkStatsUpdate', (stats) => {
            this.broadcastToChannel(this.channels.NETWORK_STATS, {
                type: 'network_stats',
                data: stats,
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Handle incoming WebSocket messages
     */
    async handleMessage(clientId, rawMessage) {
        try {
            const client = this.clients.get(clientId);
            if (!client) return;

            const message = JSON.parse(rawMessage.toString());
            client.messageCount++;
            this.metrics.messagesReceived++;

            console.log(`📨 Message from ${clientId}:`, message.action);

            switch (message.action) {
                case 'authenticate':
                    await this.handleAuthentication(clientId, message);
                    break;
                
                case 'subscribe':
                    await this.handleSubscription(clientId, message);
                    break;
                
                case 'unsubscribe':
                    await this.handleUnsubscription(clientId, message);
                    break;
                
                case 'ping':
                    this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
                    break;
                
                case 'get_stats':
                    this.sendToClient(clientId, {
                        type: 'stats',
                        data: this.getServerStats(),
                        timestamp: new Date().toISOString()
                    });
                    break;
                
                default:
                    this.sendToClient(clientId, {
                        type: 'error',
                        message: 'Unknown action',
                        code: 'UNKNOWN_ACTION'
                    });
            }

        } catch (error) {
            console.error(`Error handling message from ${clientId}:`, error);
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Invalid message format',
                code: 'INVALID_MESSAGE'
            });
        }
    }

    /**
     * Handle client authentication
     */
    async handleAuthentication(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) return;

        try {
            let user = null;

            if (message.token) {
                // JWT token authentication
                const decoded = await this.services.authenticationService.verifyToken(message.token);
                if (decoded) {
                    user = await this.services.authenticationService.getUserById(decoded.userId);
                }
            } else if (message.apiKey) {
                // API key authentication
                const keyData = await this.services.apiKeyService.validateApiKey(message.apiKey);
                if (keyData && !keyData.rateLimited) {
                    user = { userId: keyData.user_id, role: keyData.role, apiKey: keyData };
                }
            }

            if (user) {
                client.authenticated = true;
                client.user = user;
                
                this.sendToClient(clientId, {
                    type: 'authenticated',
                    user: { userId: user.userId, role: user.role },
                    timestamp: new Date().toISOString()
                });

                console.log(`✅ Client ${clientId} authenticated as ${user.userId}`);
            } else {
                this.sendToClient(clientId, {
                    type: 'authentication_failed',
                    message: 'Invalid credentials',
                    code: 'AUTH_FAILED'
                });
            }

        } catch (error) {
            console.error(`Authentication error for ${clientId}:`, error);
            this.sendToClient(clientId, {
                type: 'authentication_failed',
                message: 'Authentication error',
                code: 'AUTH_ERROR'
            });
        }
    }

    /**
     * Handle channel subscription
     */
    async handleSubscription(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const { channel, filters = {} } = message;

        // Validate channel
        if (!Object.values(this.channels).includes(channel)) {
            return this.sendToClient(clientId, {
                type: 'subscription_failed',
                message: 'Invalid channel',
                code: 'INVALID_CHANNEL'
            });
        }

        // Check permissions for premium channels
        if (!this.hasChannelPermission(client, channel)) {
            return this.sendToClient(clientId, {
                type: 'subscription_failed',
                message: 'Insufficient permissions for channel',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Add subscription
        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, new Set());
        }

        this.subscriptions.get(channel).add(clientId);
        client.subscriptions.add(channel);
        
        // Store filters for this subscription
        client.filters = client.filters || {};
        client.filters[channel] = filters;

        this.metrics.subscriptionCount++;

        this.sendToClient(clientId, {
            type: 'subscribed',
            channel: channel,
            filters: filters,
            timestamp: new Date().toISOString()
        });

        console.log(`📺 Client ${clientId} subscribed to ${channel}`);

        // Send initial data for the channel
        await this.sendInitialChannelData(clientId, channel, filters);
    }

    /**
     * Handle channel unsubscription
     */
    async handleUnsubscription(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const { channel } = message;

        if (this.subscriptions.has(channel)) {
            this.subscriptions.get(channel).delete(clientId);
            if (this.subscriptions.get(channel).size === 0) {
                this.subscriptions.delete(channel);
            }
        }

        client.subscriptions.delete(channel);
        if (client.filters && client.filters[channel]) {
            delete client.filters[channel];
        }

        this.metrics.subscriptionCount--;

        this.sendToClient(clientId, {
            type: 'unsubscribed',
            channel: channel,
            timestamp: new Date().toISOString()
        });

        console.log(`📺 Client ${clientId} unsubscribed from ${channel}`);
    }

    /**
     * Handle client disconnection
     */
    handleDisconnection(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Remove from all subscriptions
        for (const channel of client.subscriptions) {
            if (this.subscriptions.has(channel)) {
                this.subscriptions.get(channel).delete(clientId);
                if (this.subscriptions.get(channel).size === 0) {
                    this.subscriptions.delete(channel);
                }
            }
        }

        // Remove client
        this.clients.delete(clientId);
        this.metrics.connectedClients--;

        console.log(`🔌 WebSocket client disconnected: ${clientId}`);
    }

    /**
     * Send message to specific client
     */
    sendToClient(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            client.ws.send(JSON.stringify(data));
            this.metrics.messagesSent++;
            return true;
        } catch (error) {
            console.error(`Error sending message to ${clientId}:`, error);
            this.handleDisconnection(clientId);
            return false;
        }
    }

    /**
     * Broadcast message to all subscribers of a channel
     */
    broadcastToChannel(channel, data, filters = null) {
        const subscribers = this.subscriptions.get(channel);
        if (!subscribers || subscribers.size === 0) return;

        let sentCount = 0;
        
        for (const clientId of subscribers) {
            const client = this.clients.get(clientId);
            if (!client) continue;

            // Apply client-specific filters
            if (this.shouldSendToClient(client, channel, data, filters)) {
                if (this.sendToClient(clientId, data)) {
                    sentCount++;
                }
            }
        }

        console.log(`📡 Broadcasted to ${sentCount} clients on ${channel}`);
        return sentCount;
    }

    /**
     * Check if client should receive the message based on filters
     */
    shouldSendToClient(client, channel, data, globalFilters) {
        const clientFilters = client.filters?.[channel] || {};
        
        // Combine global and client filters
        const allFilters = { ...globalFilters, ...clientFilters };
        
        if (Object.keys(allFilters).length === 0) return true;

        // Apply filters based on data content
        for (const [key, value] of Object.entries(allFilters)) {
            if (data.data && data.data[key] !== undefined) {
                if (Array.isArray(value)) {
                    if (!value.includes(data.data[key])) return false;
                } else if (data.data[key] !== value) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Check if client has permission for channel
     */
    hasChannelPermission(client, channel) {
        // Public channels (no authentication required)
        const publicChannels = [this.channels.PRICE_UPDATES, this.channels.NETWORK_STATS];
        if (publicChannels.includes(channel)) return true;

        // Require authentication for premium channels
        if (!client.authenticated) return false;

        // Check API key features or user role
        if (client.user?.apiKey) {
            const features = JSON.parse(client.user.apiKey.features || '[]');
            
            const channelRequirements = {
                [this.channels.MEV_OPPORTUNITIES]: ['mev-detection'],
                [this.channels.VALIDATOR_UPDATES]: ['validator-analytics'],
                [this.channels.MARKET_DATA]: ['analytics'],
                [this.channels.SEARCHER_ANALYTICS]: ['searcher-analytics']
            };

            const required = channelRequirements[channel] || [];
            return features.includes('*') || required.some(req => features.includes(req));
        }

        return true; // Allow for JWT users
    }

    /**
     * Send initial data when client subscribes to channel
     */
    async sendInitialChannelData(clientId, channel, filters) {
        try {
            let initialData = null;

            switch (channel) {
                case this.channels.MEV_OPPORTUNITIES:
                    initialData = await this.getRecentMEVOpportunities(filters);
                    break;
                case this.channels.VALIDATOR_UPDATES:
                    initialData = await this.getRecentValidatorUpdates(filters);
                    break;
                case this.channels.MARKET_DATA:
                    initialData = await this.getCurrentMarketData(filters);
                    break;
                case this.channels.NETWORK_STATS:
                    initialData = await this.getNetworkStats();
                    break;
            }

            if (initialData) {
                this.sendToClient(clientId, {
                    type: 'initial_data',
                    channel: channel,
                    data: initialData,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`Error sending initial data for ${channel}:`, error);
        }
    }

    /**
     * Get recent MEV opportunities for initial data
     */
    async getRecentMEVOpportunities(filters = {}) {
        try {
            let query = 'SELECT * FROM mev_opportunities WHERE 1=1';
            let values = [];
            let paramIndex = 1;
            
            // Apply filters
            if (filters.type) {
                query += ` AND opportunity_type = $${paramIndex}`;
                values.push(filters.type);
                paramIndex++;
            }
            
            if (filters.dex) {
                query += ` AND primary_dex = $${paramIndex}`;
                values.push(filters.dex);
                paramIndex++;
            }
            
            if (filters.minProfit) {
                query += ` AND estimated_profit_sol >= $${paramIndex}`;
                values.push(parseFloat(filters.minProfit));
                paramIndex++;
            }
            
            if (filters.maxRisk) {
                query += ` AND execution_risk_score <= $${paramIndex}`;
                values.push(parseInt(filters.maxRisk));
                paramIndex++;
            }
            
            query += ` ORDER BY detection_timestamp DESC LIMIT $${paramIndex}`;
            values.push(filters.limit || 20);
            
            if (this.services?.pool) {
                const client = await this.services.pool.connect();
                const result = await client.query(query, values);
                client.release();
                
                return {
                    opportunities: result.rows,
                    count: result.rows.length,
                    filters: filters
                };
            }
            
            return { opportunities: [], count: 0, filters: filters };
        } catch (error) {
            console.error('Error fetching recent MEV opportunities:', error);
            return { opportunities: [], count: 0, filters: filters, error: error.message };
        }
    }

    /**
     * Get recent validator updates
     */
    async getRecentValidatorUpdates(filters = {}) {
        try {
            let query = `
                SELECT 
                    vm.*,
                    vp.epoch_rewards,
                    vp.mev_earnings_sol,
                    vp.total_stake_sol,
                    vp.commission_rate
                FROM validator_metrics vm
                LEFT JOIN validator_performance vp ON vm.validator_pubkey = vp.validator_pubkey
                WHERE vm.epoch_timestamp > NOW() - INTERVAL '24 hours'
            `;
            let values = [];
            let paramIndex = 1;
            
            // Apply filters
            if (filters.validator) {
                query += ` AND vm.validator_pubkey = $${paramIndex}`;
                values.push(filters.validator);
                paramIndex++;
            }
            
            if (filters.minMevEarnings) {
                query += ` AND vp.mev_earnings_sol >= $${paramIndex}`;
                values.push(parseFloat(filters.minMevEarnings));
                paramIndex++;
            }
            
            query += ` ORDER BY vm.epoch_timestamp DESC LIMIT $${paramIndex}`;
            values.push(filters.limit || 20);
            
            if (this.services?.pool) {
                const client = await this.services.pool.connect();
                const result = await client.query(query, values);
                client.release();
                
                return {
                    updates: result.rows,
                    count: result.rows.length,
                    filters: filters
                };
            }
            
            return { updates: [], count: 0, filters: filters };
        } catch (error) {
            console.error('Error fetching recent validator updates:', error);
            return { updates: [], count: 0, filters: filters, error: error.message };
        }
    }

    /**
     * Get current market data
     */
    async getCurrentMarketData(filters = {}) {
        try {
            // Get recent price data from DEX prices
            const priceQuery = `
                SELECT 
                    token_mint_a,
                    token_mint_b,
                    dex_name,
                    price,
                    volume_24h_usd,
                    timestamp
                FROM dex_prices 
                WHERE timestamp > NOW() - INTERVAL '1 hour'
                ORDER BY timestamp DESC
                LIMIT 100
            `;
            
            // Get MEV market statistics
            const mevStatsQuery = `
                SELECT 
                    COUNT(*) as total_opportunities,
                    SUM(estimated_profit_sol) as total_mev_sol,
                    AVG(estimated_profit_sol) as avg_mev_per_opportunity,
                    COUNT(DISTINCT primary_dex) as active_dexs
                FROM mev_opportunities 
                WHERE detection_timestamp > NOW() - INTERVAL '24 hours'
            `;
            
            if (this.services?.pool) {
                const client = await this.services.pool.connect();
                const [priceResult, mevStatsResult] = await Promise.all([
                    client.query(priceQuery),
                    client.query(mevStatsQuery)
                ]);
                client.release();
                
                // Process price data
                const prices = {};
                let totalVolume24h = 0;
                
                priceResult.rows.forEach(row => {
                    const pair = `${row.token_mint_a}/${row.token_mint_b}`;
                    if (!prices[pair] || new Date(row.timestamp) > new Date(prices[pair].timestamp)) {
                        prices[pair] = {
                            price: parseFloat(row.price),
                            dex: row.dex_name,
                            timestamp: row.timestamp,
                            volume24h: parseFloat(row.volume_24h_usd || 0)
                        };
                    }
                    totalVolume24h += parseFloat(row.volume_24h_usd || 0);
                });
                
                const mevStats = mevStatsResult.rows[0] || {};
                
                return {
                    prices: prices,
                    volume24h: totalVolume24h,
                    mevStatistics: {
                        totalOpportunities: parseInt(mevStats.total_opportunities || 0),
                        totalMevSol: parseFloat(mevStats.total_mev_sol || 0),
                        avgMevPerOpportunity: parseFloat(mevStats.avg_mev_per_opportunity || 0),
                        activeDexs: parseInt(mevStats.active_dexs || 0)
                    },
                    timestamp: new Date().toISOString(),
                    filters: filters
                };
            }
            
            return {
                prices: {},
                volume24h: 0,
                mevStatistics: { totalOpportunities: 0, totalMevSol: 0, avgMevPerOpportunity: 0, activeDexs: 0 },
                timestamp: new Date().toISOString(),
                filters: filters
            };
        } catch (error) {
            console.error('Error fetching current market data:', error);
            return {
                prices: {},
                volume24h: 0,
                mevStatistics: { totalOpportunities: 0, totalMevSol: 0, avgMevPerOpportunity: 0, activeDexs: 0 },
                timestamp: new Date().toISOString(),
                filters: filters,
                error: error.message
            };
        }
    }

    /**
     * Get network statistics
     */
    async getNetworkStats() {
        return {
            connectedClients: this.metrics.connectedClients,
            activeSubscriptions: this.metrics.subscriptionCount,
            totalMessages: this.metrics.messagesSent,
            uptime: process.uptime()
        };
    }

    /**
     * Perform heartbeat check on all connections
     */
    performHeartbeat() {
        const now = Date.now();
        const timeout = 60000; // 60 seconds

        for (const [clientId, client] of this.clients.entries()) {
            if (now - client.lastPing > timeout) {
                console.log(`💀 Client ${clientId} timed out`);
                client.ws.terminate();
                this.handleDisconnection(clientId);
            } else if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.ping();
            }
        }
    }

    /**
     * Get server statistics
     */
    getServerStats() {
        const channelStats = {};
        for (const [channel, subscribers] of this.subscriptions.entries()) {
            channelStats[channel] = subscribers.size;
        }

        return {
            ...this.metrics,
            channels: channelStats,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Manual trigger for testing
     */
    triggerTestMessage(channel, data) {
        this.broadcastToChannel(channel, {
            type: 'test_message',
            data: data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('🔌 Shutting down WebSocket server...');
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // Notify all clients
        for (const [clientId] of this.clients.entries()) {
            this.sendToClient(clientId, {
                type: 'server_shutdown',
                message: 'Server is shutting down',
                timestamp: new Date().toISOString()
            });
        }

        // Close all connections
        this.wss.close(() => {
            console.log('✅ WebSocket server closed');
        });
    }
}

module.exports = MEVWebSocketServer;