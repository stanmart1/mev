import config from '../config';
import { logError, errorCodes } from '../utils/errorHandler';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.websocket.maxReconnectAttempts;
    this.reconnectInterval = config.websocket.reconnectInterval;
    this.subscriptions = new Map();
    this.isConnected = false;
    this.listeners = new Map();
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
    this.connectionStatus = 'disconnected'; // 'connecting', 'connected', 'disconnected', 'error'
    
    // Channel definitions - match backend
    this.channels = {
      MEV_OPPORTUNITIES: 'MEV_OPPORTUNITIES',
      VALIDATOR_PERFORMANCE: 'VALIDATOR_PERFORMANCE', 
      MARKET_DATA: 'MARKET_DATA',
      USER_NOTIFICATIONS: 'USER_NOTIFICATIONS',
      PRICE_UPDATES: 'PRICE_UPDATES',
      NETWORK_STATS: 'NETWORK_STATS'
    };
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      return;
    }
    
    try {
      this.connectionStatus = 'connecting';
      this.emit('statusChange', this.connectionStatus);
      
      this.ws = new WebSocket(`${config.websocket.url}/ws`);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.resubscribeAll();
        this.emit('connected');
        this.emit('statusChange', this.connectionStatus);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          logError(error, {
            type: 'websocket_message_parse_error',
            rawMessage: event.data
          });
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        this.stopHeartbeat();
        this.emit('disconnected', { code: event.code, reason: event.reason });
        this.emit('statusChange', this.connectionStatus);
        
        if (event.code !== 1000) { // Not a normal closure
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionStatus = 'error';
        logError(new Error('WebSocket connection error'), {
          type: 'websocket_error',
          url: config.websocket.url
        });
        this.emit('error', error);
        this.emit('statusChange', this.connectionStatus);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.connectionStatus = 'error';
      this.emit('statusChange', this.connectionStatus);
      this.attemptReconnect();
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.lastHeartbeat = Date.now();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        // Update heartbeat on any activity
        this.lastHeartbeat = Date.now();
      }
    }, 30000); // Check every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  resubscribeAll() {
    // Resubscribe to all channels after reconnection
    for (const [channel, filters] of this.subscriptions.entries()) {
      this.send({
        action: 'subscribe',
        channel,
        filters
      });
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    }
  }

  subscribe(channel, filters = {}) {
    if (this.isConnected) {
      this.send({
        action: 'subscribe',
        channel,
        filters
      });
    }
    this.subscriptions.set(channel, filters);
  }

  unsubscribe(channel) {
    if (this.isConnected) {
      this.send({
        action: 'unsubscribe',
        channel
      });
    }
    this.subscriptions.delete(channel);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  handleMessage(message) {
    const { type, channel, data } = message;
    
    // Update heartbeat on any message
    this.lastHeartbeat = Date.now();
    
    // Handle heartbeat
    if (type === 'pong') {
      return;
    }
    
    // Handle authentication responses
    if (type === 'authenticated' || type === 'authentication_failed') {
      this.emit(type, data);
      return;
    }
    
    // Handle subscription confirmations
    if (type === 'subscribed' || type === 'unsubscribed') {
      this.emit(type, { channel, ...data });
      return;
    }
    
    // Handle data messages
    switch (type) {
      case 'mev_opportunity':
        this.emit('mev_opportunity', data);
        this.emit(`channel:${this.channels.MEV_OPPORTUNITIES}`, data);
        break;
      case 'validator_performance':
        this.emit('validator_update', data);
        this.emit(`channel:${this.channels.VALIDATOR_PERFORMANCE}`, data);
        break;
      case 'price_update':
        this.emit('price_update', data);
        this.emit(`channel:${this.channels.PRICE_UPDATES}`, data);
        break;
      case 'market_update':
        this.emit('market_update', data);
        this.emit(`channel:${this.channels.MARKET_DATA}`, data);
        break;
      case 'network_stats':
        this.emit('network_stats', data);
        this.emit(`channel:${this.channels.NETWORK_STATS}`, data);
        break;
      case 'user_notification':
        this.emit('user_notification', data);
        this.emit(`channel:${this.channels.USER_NOTIFICATIONS}`, data);
        break;
      default:
        this.emit(type, data);
        if (channel) {
          this.emit(`channel:${channel}`, data);
        }
    }
  }

  authenticate(token) {
    if (this.isConnected) {
      this.send({
        action: 'authenticate',
        token
      });
    }
  }

  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      subscriptions: Array.from(this.subscriptions.keys())
    };
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Channel-specific subscription methods
  subscribeToMevOpportunities(filters = {}) {
    return this.subscribe(this.channels.MEV_OPPORTUNITIES, filters);
  }

  subscribeToValidatorPerformance(filters = {}) {
    return this.subscribe(this.channels.VALIDATOR_PERFORMANCE, filters);
  }

  subscribeToMarketData(filters = {}) {
    return this.subscribe(this.channels.MARKET_DATA, filters);
  }

  subscribeToUserNotifications() {
    return this.subscribe(this.channels.USER_NOTIFICATIONS);
  }

  subscribeToPriceUpdates(filters = {}) {
    return this.subscribe(this.channels.PRICE_UPDATES, filters);
  }

  subscribeToNetworkStats() {
    return this.subscribe(this.channels.NETWORK_STATS);
  }
}

export default new WebSocketService();