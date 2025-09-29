/**
 * WebSocket Client Example for MEV Analytics Platform
 * 
 * This example demonstrates how to connect to the WebSocket server and subscribe to channels
 * for real-time MEV opportunities, validator updates, and market data.
 * 
 * Usage:
 * node websocket-client-example.js
 */

const WebSocket = require('ws');

class MEVWebSocketClient {
    constructor(url = 'ws://localhost:3001/ws') {
        this.url = url;
        this.ws = null;
        this.authenticated = false;
        this.subscriptions = new Set();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000; // 5 seconds
    }

    /**
     * Connect to WebSocket server
     */
    async connect() {
        return new Promise((resolve, reject) => {
            console.log(`🔗 Connecting to ${this.url}...`);
            
            this.ws = new WebSocket(this.url);

            this.ws.on('open', () => {
                console.log('✅ Connected to MEV Analytics WebSocket server');
                this.reconnectAttempts = 0;
                this.setupHeartbeat();
                resolve();
            });

            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });

            this.ws.on('close', (code, reason) => {
                console.log(`🔌 Connection closed: ${code} - ${reason}`);
                this.authenticated = false;
                this.subscriptions.clear();
                this.attemptReconnect();
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error.message);
                reject(error);
            });
        });
    }

    /**
     * Handle incoming messages
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            
            switch (message.type) {
                case 'welcome':
                    console.log('👋 Welcome message received');
                    console.log(`📺 Available channels: ${message.channels.join(', ')}`);
                    break;
                
                case 'authenticated':
                    console.log('🔐 Authentication successful');
                    this.authenticated = true;
                    break;
                
                case 'authentication_failed':
                    console.log('❌ Authentication failed:', message.message);
                    break;
                
                case 'subscribed':
                    console.log(`📺 Subscribed to channel: ${message.channel}`);
                    this.subscriptions.add(message.channel);
                    break;
                
                case 'unsubscribed':
                    console.log(`📺 Unsubscribed from channel: ${message.channel}`);
                    this.subscriptions.delete(message.channel);
                    break;
                
                case 'mev_opportunity':
                    console.log('💰 MEV Opportunity detected:');
                    console.log(`   Type: ${message.data.type || message.data.opportunity_type}`);
                    console.log(`   Profit: ${message.data.estimated_profit_sol || message.data.profitSOL || 'N/A'} SOL`);
                    console.log(`   DEX: ${message.data.primary_dex || message.data.dex || 'N/A'}`);
                    break;
                
                case 'arbitrage_opportunity':
                    console.log('🎯 Arbitrage Opportunity detected:');
                    console.log(`   Pair: ${message.data.pair}`);
                    console.log(`   Buy DEX: ${message.data.buyDex}`);
                    console.log(`   Sell DEX: ${message.data.sellDex}`);
                    console.log(`   Profit: ${message.data.calculation?.netProfitSOL?.toFixed(6)} SOL`);
                    break;
                
                case 'liquidation_opportunity':
                    console.log('💧 Liquidation Opportunity detected:');
                    console.log(`   Protocol: ${message.data.protocol}`);
                    console.log(`   Health Factor: ${message.data.healthFactor?.toFixed(3)}`);
                    console.log(`   Profit: ${message.data.profitSOL?.toFixed(6)} SOL`);
                    break;
                
                case 'validator_performance':
                    console.log('🏗️ Validator Performance Update:');
                    console.log(`   Validator: ${message.data.validator_pubkey?.slice(0, 8)}...`);
                    console.log(`   MEV Earnings: ${message.data.mev_earnings_sol || 'N/A'} SOL`);
                    break;
                
                case 'market_update':
                    console.log('📊 Market Data Update:');
                    console.log(`   Total MEV: ${message.data.mevStatistics?.totalMevSol || 'N/A'} SOL`);
                    console.log(`   Active DEXs: ${message.data.mevStatistics?.activeDexs || 'N/A'}`);
                    break;
                
                case 'network_stats':
                    console.log('🌐 Network Statistics Update:');
                    console.log(`   Services Online: ${message.data.servicesOnline?.join(', ') || 'N/A'}`);
                    break;
                
                case 'pong':
                    // Heartbeat response
                    break;
                
                case 'error':
                    console.error(`❌ Server error: ${message.message} (${message.code})`);
                    break;
                
                default:
                    console.log('📨 Unknown message type:', message.type);
                    console.log('   Data:', JSON.stringify(message, null, 2));
            }
        } catch (error) {
            console.error('❌ Error parsing message:', error.message);
        }
    }

    /**
     * Authenticate with the server
     */
    authenticate(credentials) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket not connected');
            return;
        }

        const message = {
            action: 'authenticate',
            ...credentials
        };

        this.ws.send(JSON.stringify(message));
        console.log('🔐 Authentication request sent');
    }

    /**
     * Subscribe to a channel
     */
    subscribe(channel, filters = {}) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket not connected');
            return;
        }

        const message = {
            action: 'subscribe',
            channel: channel,
            filters: filters
        };

        this.ws.send(JSON.stringify(message));
        console.log(`📺 Subscribing to channel: ${channel}`);
    }

    /**
     * Unsubscribe from a channel
     */
    unsubscribe(channel) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket not connected');
            return;
        }

        const message = {
            action: 'unsubscribe',
            channel: channel
        };

        this.ws.send(JSON.stringify(message));
        console.log(`📺 Unsubscribing from channel: ${channel}`);
    }

    /**
     * Get server statistics
     */
    getStats() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket not connected');
            return;
        }

        const message = {
            action: 'get_stats'
        };

        this.ws.send(JSON.stringify(message));
    }

    /**
     * Setup heartbeat mechanism
     */
    setupHeartbeat() {
        setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ action: 'ping' }));
            }
        }, 30000); // 30 seconds
    }

    /**
     * Attempt to reconnect
     */
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connect().catch(error => {
                    console.error('❌ Reconnection failed:', error.message);
                });
            }, this.reconnectDelay);
        } else {
            console.error('❌ Max reconnection attempts reached. Giving up.');
        }
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Example usage
async function runExample() {
    const client = new MEVWebSocketClient();

    try {
        await client.connect();

        // Example 1: Subscribe to public channels (no authentication required)
        console.log('\n--- Subscribing to public channels ---');
        client.subscribe('price_updates');
        client.subscribe('network_stats');

        // Wait a bit for initial data
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Example 2: Authenticate (optional, for access to premium channels)
        // Uncomment if you have valid credentials
        /*
        console.log('\n--- Authenticating ---');
        client.authenticate({
            // Option 1: API Key
            apiKey: 'your-api-key-here'
            
            // Option 2: JWT Token
            // token: 'your-jwt-token-here'
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Subscribe to premium channels after authentication
        console.log('\n--- Subscribing to premium channels ---');
        client.subscribe('mev_opportunities', { 
            type: 'arbitrage',
            minProfit: 0.001 
        });
        client.subscribe('validator_updates');
        client.subscribe('market_data');
        */

        // Example 3: Get server statistics
        console.log('\n--- Getting server statistics ---');
        client.getStats();

        // Keep the connection alive for demonstration
        console.log('\n--- Listening for real-time updates... (Press Ctrl+C to exit) ---');
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n👋 Disconnecting...');
            client.disconnect();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Failed to connect:', error.message);
        process.exit(1);
    }
}

// Available channels:
const CHANNELS = {
    MEV_OPPORTUNITIES: 'mev_opportunities',      // Requires authentication
    VALIDATOR_UPDATES: 'validator_updates',      // Requires authentication  
    MARKET_DATA: 'market_data',                  // Requires authentication
    SEARCHER_ANALYTICS: 'searcher_analytics',   // Requires authentication
    PRICE_UPDATES: 'price_updates',              // Public
    NETWORK_STATS: 'network_stats'               // Public
};

console.log('🚀 MEV Analytics WebSocket Client Example');
console.log('📋 Available channels:', Object.values(CHANNELS).join(', '));
console.log('💡 Tip: Authenticate to access premium channels with real MEV data');

// Run the example
if (require.main === module) {
    runExample();
}

module.exports = MEVWebSocketClient;