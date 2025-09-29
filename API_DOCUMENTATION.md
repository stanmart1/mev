# 📚 MEV Analytics Platform API Documentation

## 🚀 Overview

The MEV Analytics Platform provides comprehensive REST API endpoints for accessing Maximum Extractable Value (MEV) data, validator performance metrics, profit simulations, and searcher analytics on the Solana blockchain.

**Base URL**: `https://api.mev-analytics.com`  
**Version**: `v1`  
**Authentication**: API Key or JWT Token

---

## 🔐 Authentication

### API Key Authentication
```bash
curl -H "X-API-Key: mev_your_api_key_here" \
     https://api.mev-analytics.com/api/opportunities
```

### JWT Token Authentication
```bash
curl -H "Authorization: Bearer your_jwt_token_here" \
     https://api.mev-analytics.com/api/profile
```

---

## 📊 API Endpoints

### **Authentication & User Management**

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "role": "searcher"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Wallet Login
```http
POST /api/auth/wallet-login
Content-Type: application/json

{
  "walletAddress": "8UjQrCmSCKXWJCXKpzrQ...",
  "signature": "base58_signature_here",
  "message": "login_message_json"
}
```

---

### **MEV Opportunities**

#### Get Live MEV Opportunities
```http
GET /api/mev/opportunities/live?type=arbitrage&limit=50
X-API-Key: your_api_key

Response:
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "id": "uuid",
        "opportunity_type": "arbitrage",
        "estimated_profit_sol": 0.5,
        "execution_risk_score": 3,
        "primary_dex": "raydium",
        "secondary_dex": "orca"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasNext": true
    }
  }
}
```

#### Get Opportunity Details
```http
GET /api/mev/opportunities/{id}
X-API-Key: your_api_key
```

#### Get MEV Statistics
```http
GET /api/mev/opportunities/stats?timeframe=24h
X-API-Key: your_api_key
```

---

### **Validator Rankings**

#### Get Validator Rankings
```http
GET /api/validators/rankings?category=overall&limit=100
X-API-Key: your_api_key

Response:
{
  "success": true,
  "data": {
    "rankings": [
      {
        "validator_address": "validator_pubkey",
        "rank": 1,
        "score": 95.5,
        "stake_amount": 1000000,
        "commission_rate": 0.05,
        "uptime_percentage": 99.8
      }
    ]
  }
}
```

#### Get Validator Details
```http
GET /api/validators/{address}
X-API-Key: your_api_key
```

#### Compare Validators
```http
GET /api/validators/compare?addresses=addr1,addr2,addr3
X-API-Key: your_api_key
```

#### Network Statistics
```http
GET /api/validators/network/stats
X-API-Key: your_api_key
```

---

### **Historical Performance**

#### Get MEV Performance History
```http
GET /api/history/mev-performance?interval=daily&startDate=2024-01-01
X-API-Key: your_api_key

Response:
{
  "success": true,
  "data": {
    "performance_data": [
      {
        "time_period": "2024-01-15T00:00:00Z",
        "total_mev_revenue": 1500.5,
        "active_validators": 2000,
        "avg_mev_block_percentage": 15.2
      }
    ]
  }
}
```

#### Get Validator History
```http
GET /api/history/validator/{address}?startDate=2024-01-01&endDate=2024-02-01
X-API-Key: your_api_key
```

#### Get Network Trends
```http
GET /api/history/network-trends?interval=weekly
X-API-Key: your_api_key
```

---

### **Profit Simulations**

#### Calculate Profit Potential
```http
POST /api/simulations/profit-calculator
X-API-Key: your_api_key
Content-Type: application/json

{
  "strategy": "arbitrage",
  "amount": 100,
  "riskTolerance": "medium"
}

Response:
{
  "success": true,
  "data": {
    "simulation_results": [
      {
        "expected_profit": 2.5,
        "risk_adjusted_profit": 2.1,
        "success_probability": 0.85,
        "confidence_lower": 1.8,
        "confidence_upper": 3.2
      }
    ]
  }
}
```

#### Risk Analysis
```http
GET /api/simulations/risk-analysis?strategy=arbitrage
X-API-Key: your_api_key
```

---

### **Searcher Analytics**

#### Get Searcher Analytics
```http
GET /api/searchers/analytics?period=daily&limit=50
X-API-Key: your_api_key

Response:
{
  "success": true,
  "data": {
    "searcher_analytics": [
      {
        "searcher_pubkey": "searcher_address",
        "total_profit_sol": 150.5,
        "success_rate": 0.78,
        "opportunities_detected": 500,
        "arbitrage_count": 300
      }
    ]
  }
}
```

#### Get Searcher Details
```http
GET /api/searchers/{pubkey}
X-API-Key: your_api_key
```

#### Searcher Leaderboard
```http
GET /api/searchers/leaderboard?timeframe=7d
X-API-Key: your_api_key
```

---

## 🛡️ Rate Limiting

| Endpoint Category | Requests/Minute | Plan Requirement |
|-------------------|----------------|------------------|
| Authentication | 5 | All |
| MEV Opportunities | 100 | Basic+ |
| Validator Data | 200 | Basic+ |
| Historical Data | 50 | Premium+ |
| Simulations | 20 | Premium+ |
| Searcher Analytics | 100 | Premium+ |

---

## 📝 Request/Response Format

### Standard Response Format
```json
{
  "success": boolean,
  "data": object,
  "metadata": {
    "timestamp": "ISO_8601_datetime",
    "request_id": "unique_request_id"
  }
}
```

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "ISO_8601_datetime",
  "details": {} // Optional, development only
}
```

---

## 🔑 API Key Tiers

| Tier | Monthly Requests | Rate Limit | Features |
|------|-----------------|------------|----------|
| **Free** | 10,000 | 10/min | Basic analytics |
| **Developer** | 50,000 | 50/min | + Validator analytics |
| **Professional** | 500,000 | 200/min | + MEV detection, simulations |
| **Enterprise** | Unlimited | 1,000/min | All features + premium support |

---

## ⚠️ Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTH_REQUIRED` | 401 | Authentication required |
| `INVALID_TOKEN` | 401 | Invalid or expired token |
| `INSUFFICIENT_PERMISSIONS` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 📦 SDKs & Libraries

### JavaScript/Node.js
```bash
npm install @mev-analytics/sdk
```

```javascript
import { MEVAnalyticsClient } from '@mev-analytics/sdk';

const client = new MEVAnalyticsClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.mev-analytics.com'
});

const opportunities = await client.opportunities.getLive({
  type: 'arbitrage',
  limit: 10
});
```

### Python
```bash
pip install mev-analytics-python
```

```python
from mev_analytics import MEVAnalyticsClient

client = MEVAnalyticsClient(api_key='your_api_key')
opportunities = client.opportunities.get_live(type='arbitrage', limit=10)
```

---

## 🔗 WebSocket API

### Real-time MEV Opportunities
```javascript
const ws = new WebSocket('wss://api.mev-analytics.com/ws');

ws.on('open', () => {
  ws.send(JSON.stringify({
    action: 'subscribe',
    channel: 'mev_opportunities',
    filters: { type: 'arbitrage', minProfit: 0.1 }
  }));
});

ws.on('message', (data) => {
  const opportunity = JSON.parse(data);
  console.log('New opportunity:', opportunity);
});
```

---

## 📞 Support

- **Documentation**: https://docs.mev-analytics.com
- **API Status**: https://status.mev-analytics.com
- **Support Email**: support@mev-analytics.com
- **Discord**: https://discord.gg/mev-analytics

---

*API Documentation - Version 1.0*  
*Last Updated: December 2024*