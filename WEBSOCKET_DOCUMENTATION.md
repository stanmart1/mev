# WebSocket Real-Time Updates Documentation

## Overview

The MEV Analytics Platform includes a comprehensive WebSocket server that provides real-time updates for MEV opportunities, validator performance changes, and live market data. The WebSocket implementation handles client subscriptions, authentication, and push notifications efficiently.

## WebSocket Server URL

```
ws://localhost:3001/ws
```

## Features

- **Real-time Data Streaming**: Live MEV opportunities, validator updates, and market data
- **Authentication Support**: JWT tokens and API key authentication
- **Channel-based Subscriptions**: Subscribe to specific data streams
- **Client Filtering**: Apply filters to receive only relevant data
- **Connection Management**: Automatic heartbeat, reconnection, and timeout handling
- **Scalable Architecture**: Support for thousands of concurrent connections

---

## Available Channels

### Public Channels (No Authentication Required)

| Channel | Description | Data Type |
|---------|-------------|-----------|
| `price_updates` | Real-time DEX price updates and swap data | Price changes, volume updates |
| `network_stats` | Network statistics and server status | Connected clients, uptime, service status |

### Premium Channels (Authentication Required)

| Channel | Description | Data Type |
|---------|-------------|-----------|
| `mev_opportunities` | Live MEV opportunities detection | Arbitrage, liquidation, sandwich attacks |
| `validator_updates` | Validator performance updates | MEV earnings, commission changes, stake updates |
| `market_data` | Comprehensive market analytics | MEV statistics, DEX volumes, price analysis |
| `searcher_analytics` | Searcher performance data | Bundle success rates, competition metrics |

---

## Connection and Authentication

### Basic Connection

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', () => {
    console.log('Connected to MEV Analytics WebSocket');
});
```

### Authentication

#### Option 1: API Key Authentication
```javascript
ws.send(JSON.stringify({
    action: 'authenticate',
    apiKey: 'your-api-key-here'
}));
```

#### Option 2: JWT Token Authentication
```javascript
ws.send(JSON.stringify({
    action: 'authenticate',
    token: 'your-jwt-token-here'
}));
```

### Authentication Response
```javascript
// Success
{
    "type": "authenticated",
    "user": {
        "userId": "user123",
        "role": "premium"
    },
    "timestamp": "2025-09-28T10:30:00.000Z"
}

// Failure
{
    "type": "authentication_failed",
    "message": "Invalid credentials",
    "code": "AUTH_FAILED"
}
```

---

## Channel Subscription

### Subscribe to Channel

```javascript
ws.send(JSON.stringify({
    action: 'subscribe',
    channel: 'mev_opportunities',
    filters: {
        type: 'arbitrage',
        minProfit: 0.001,
        dex: 'raydium'
    }
}));
```

### Subscription Response
```javascript
{
    "type": "subscribed",
    "channel": "mev_opportunities",
    "filters": {
        "type": "arbitrage",
        "minProfit": 0.001
    },
    "timestamp": "2025-09-28T10:30:00.000Z"
}
```

### Unsubscribe from Channel

```javascript
ws.send(JSON.stringify({
    action: 'unsubscribe',
    channel: 'mev_opportunities'
}));
```

---

## Real-Time Data Messages

### MEV Opportunity Detection

```javascript
{
    "type": "mev_opportunity",
    "data": {
        "id": "12345",
        "type": "arbitrage",
        "estimated_profit_sol": 0.15,
        "primary_dex": "raydium",
        "secondary_dex": "orca",
        "token_pair": "SOL/USDC",
        "execution_risk_score": 3,
        "detection_timestamp": "2025-09-28T10:30:00.000Z"
    },
    "timestamp": "2025-09-28T10:30:00.000Z"
}
```

### Arbitrage Opportunity

```javascript
{
    "type": "arbitrage_opportunity",
    "data": {
        "pair": "SOL/USDC",
        "buyDex": "raydium",
        "sellDex": "orca",
        "calculation": {
            "netProfitSOL": 0.127,
            "profitPercent": 2.45,
            "investmentSOL": 5.2
        },
        "priceDiscrepancy": 0.025,
        "urgency": "high"
    },
    "timestamp": "2025-09-28T10:30:00.000Z"
}
```

### Liquidation Opportunity

```javascript
{
    "type": "liquidation_opportunity",
    "data": {
        "protocol": "mango",
        "healthFactor": 0.95,
        "profitSOL": 0.85,
        "collateralValue": 1250.0,
        "liquidationThreshold": 0.8,
        "position": {
            "asset": "SOL",
            "size": 100,
            "debt": 95
        }
    },
    "timestamp": "2025-09-28T10:30:00.000Z"
}
```

### Validator Performance Update

```javascript
{
    "type": "validator_performance",
    "data": {
        "validator_pubkey": "ABC123...",
        "epoch": 512,
        "mev_earnings_sol": 12.45,
        "total_rewards_sol": 15.20,
        "commission_rate": 0.05,
        "total_stake_sol": 25000,
        "uptime_percentage": 99.8,
        "mev_efficiency_score": 85
    },
    "timestamp": "2025-09-28T10:30:00.000Z"
}
```

### Market Data Update

```javascript
{
    "type": "market_update",
    "data": {
        "prices": {
            "SOL/USDC": {
                "price": 142.50,
                "dex": "raydium",
                "volume24h": 1250000
            }
        },
        "volume24h": 15000000,
        "mevStatistics": {
            "totalOpportunities": 1247,
            "totalMevSol": 125.7,
            "avgMevPerOpportunity": 0.101,
            "activeDexs": 5
        }
    },
    "timestamp": "2025-09-28T10:30:00.000Z"
}
```

### Network Statistics

```javascript
{
    "type": "network_stats",
    "data": {
        "connectedClients": 127,
        "activeSubscriptions": 245,
        "totalMessages": 15847,
        "uptime": 3600,
        "servicesOnline": ["transactionMonitor", "liquidationScanner", "webSocketServer"],
        "network": "devnet"
    },
    "timestamp": "2025-09-28T10:30:00.000Z"
}
```

---

## Client Actions

### Available Actions

| Action | Description | Authentication Required |
|--------|-------------|------------------------|
| `authenticate` | Authenticate with server | No |
| `subscribe` | Subscribe to channel | Depends on channel |
| `unsubscribe` | Unsubscribe from channel | No |
| `ping` | Send heartbeat ping | No |
| `get_stats` | Get server statistics | No |

### Ping/Pong Heartbeat

```javascript
// Send ping
ws.send(JSON.stringify({ action: 'ping' }));

// Receive pong
{
    "type": "pong",
    "timestamp": 1632834600000
}
```

### Get Server Statistics

```javascript
// Request
ws.send(JSON.stringify({ action: 'get_stats' }));

// Response
{
    "type": "stats",
    "data": {
        "connectedClients": 127,
        "totalConnections": 1547,
        "messagesSent": 25847,
        "messagesReceived": 12456,
        "subscriptionCount": 245,
        "channels": {
            "mev_opportunities": 45,
            "validator_updates": 23,
            "market_data": 67,
            "price_updates": 78,
            "network_stats": 32
        },
        "uptime": 7200
    },
    "timestamp": "2025-09-28T10:30:00.000Z"
}
```

---

## Filtering and Customization

### MEV Opportunities Filters

```javascript
{
    "action": "subscribe",
    "channel": "mev_opportunities",
    "filters": {
        "type": "arbitrage",           // Filter by opportunity type
        "minProfit": 0.001,           // Minimum profit in SOL
        "maxRisk": 5,                 // Maximum risk score (1-10)
        "dex": "raydium"              // Specific DEX
    }
}
```

### Validator Updates Filters

```javascript
{
    "action": "subscribe",
    "channel": "validator_updates",
    "filters": {
        "validator": "ABC123...",     // Specific validator pubkey
        "minMevEarnings": 1.0         // Minimum MEV earnings threshold
    }
}
```

---

## Error Handling

### Error Message Format

```javascript
{
    "type": "error",
    "message": "Error description",
    "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `UNKNOWN_ACTION` | Invalid action requested |
| `INVALID_CHANNEL` | Channel does not exist |
| `INSUFFICIENT_PERMISSIONS` | Not authorized for channel |
| `AUTH_FAILED` | Authentication failed |
| `INVALID_MESSAGE` | Malformed message |

---

## Best Practices

### Connection Management

1. **Implement Reconnection Logic**: Handle connection drops gracefully
2. **Use Heartbeat**: Send ping messages every 30 seconds
3. **Handle Timeouts**: Detect and recover from network issues

### Performance Optimization

1. **Selective Subscriptions**: Only subscribe to needed channels
2. **Use Filters**: Reduce irrelevant data transmission
3. **Batch Processing**: Handle multiple messages efficiently

### Security

1. **Secure Authentication**: Use strong API keys or JWT tokens
2. **Validate Messages**: Always validate incoming data
3. **Rate Limiting**: Respect connection limits

---

## WebSocket Management API

### Get WebSocket Statistics

```bash
GET /api/websocket/stats
```

Response:
```javascript
{
    "success": true,
    "webSocketStats": {
        "connectedClients": 127,
        "totalConnections": 1547,
        "messagesSent": 25847,
        "messagesReceived": 12456,
        "subscriptionCount": 245,
        "channels": {
            "mev_opportunities": 45,
            "validator_updates": 23
        },
        "uptime": 7200,
        "timestamp": "2025-09-28T10:30:00.000Z"
    }
}
```

### Send Test Message

```bash
POST /api/websocket/test
Content-Type: application/json

{
    "channel": "mev_opportunities",
    "data": {
        "test": true,
        "message": "Test MEV opportunity"
    }
}
```

### Get Connected Clients

```bash
GET /api/websocket/clients
```

Response:
```javascript
{
    "success": true,
    "totalClients": 127,
    "clients": [
        {
            "id": "client-uuid",
            "authenticated": true,
            "connectedAt": "2025-09-28T10:00:00.000Z",
            "messageCount": 145,
            "subscriptions": ["mev_opportunities", "validator_updates"],
            "ip": "192.168.1.100"
        }
    ]
}
```

---

## Example Implementation

See `websocket-client-example.js` for a complete working example that demonstrates:

- Connection establishment
- Authentication
- Channel subscription
- Real-time data handling
- Error management
- Reconnection logic

Run the example:
```bash
node websocket-client-example.js
```

---

## Integration Notes

The WebSocket server is fully integrated with the MEV Analytics Platform and automatically broadcasts:

- MEV opportunities detected by the transaction monitor
- Arbitrage opportunities from the arbitrage detection engine
- Liquidation opportunities from the liquidation scanner
- Validator performance updates (when available)
- Market data updates (when available)

All real-time events are automatically pushed to subscribed clients without requiring polling or manual refresh.