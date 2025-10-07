# Solana MEV Analytics Platform

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**A comprehensive MEV (Maximum Extractable Value) analytics platform for Solana**

Real-time opportunity detection • Validator performance tracking • Bundle construction • Advanced MEV attribution

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [API Reference](#api-reference)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [WebSocket API](#websocket-api)
- [Frontend Application](#frontend-application)
- [Database Schema](#database-schema)
- [Services](#services)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The Solana MEV Analytics Platform is a full-stack application designed to detect, analyze, and capitalize on Maximum Extractable Value opportunities on the Solana blockchain. It provides real-time monitoring of DEX activities, validator performance tracking, bundle construction tools, and comprehensive analytics.

### Key Capabilities

- **Real-time MEV Detection**: Monitor 5 major DEXs (Raydium, Orca, Jupiter, Serum, Saber) for arbitrage, liquidation, and sandwich opportunities
- **Validator Analytics**: Track validator performance, MEV rewards, and Jito integration metrics
- **Bundle Construction**: Build and simulate transaction bundles with profit estimation
- **Educational Platform**: Interactive learning modules, tutorials, and MEV glossary
- **Multi-Cluster Support**: Switch between Mainnet, Devnet, and Testnet
- **Dark Mode**: Comprehensive dark mode design system

---

## Features

### 🔍 MEV Detection & Analysis

- **Arbitrage Detection**: Cross-DEX price monitoring with real-time alerts
- **Liquidation Scanning**: Monitor lending protocols for liquidation opportunities
- **Sandwich Attack Detection**: Identify front-running opportunities
- **Bundle Construction**: Optimal transaction ordering and gas estimation
- **Profit Calculation**: Monte Carlo simulations with risk assessment

### 📊 Validator Analytics

- **Performance Tracking**: Comprehensive validator metrics and rankings
- **MEV Attribution**: Track MEV rewards per validator with confidence scoring
- **Jito Integration**: Compare Jito-enabled vs regular validators
- **Historical Analysis**: Long-term performance trends and patterns
- **Validator Comparison**: Side-by-side validator performance comparison

### 🎓 Educational System

- **Interactive Modules**: Step-by-step learning paths for MEV concepts
- **Code Playground**: Practice MEV strategies with live code execution
- **Quizzes & Assessments**: Test knowledge with interactive quizzes
- **Badges & Achievements**: Gamified learning with XP and levels
- **Glossary**: Comprehensive MEV terminology dictionary
- **Leaderboard**: Compete with other learners

### 🛠️ Advanced Tools

- **Bundle Builder**: Drag-and-drop interface for bundle construction
- **Profit Calculator**: Comprehensive profit simulation tool
- **Market Intelligence**: Broader Solana MEV ecosystem trends
- **API Explorer**: Interactive API documentation and testing
- **Settings Management**: Configure API keys for third-party services

### 🎨 User Experience

- **Dark Mode**: Full dark mode support with system preference detection
- **Responsive Design**: Mobile-first design approach
- **Real-time Updates**: WebSocket-based live data streaming
- **Cluster Switching**: Toggle between Mainnet, Devnet, and Testnet
- **User Authentication**: Secure JWT-based authentication

---

## Architecture

### Technology Stack

#### Backend
- **Runtime**: Node.js 22+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Blockchain**: Solana Web3.js
- **Real-time**: WebSocket (ws)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Logging**: Winston
- **Caching**: Redis (optional)

#### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: TanStack Query, Zustand
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React icons
- **Charts**: Recharts
- **Code Editor**: Monaco Editor
- **Drag & Drop**: dnd-kit
- **Wallet Integration**: Solana Wallet Adapter

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Analytics │  │Education │  │Settings  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │   REST API    │
                    │   WebSocket   │
                    └───────┬───────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Service Layer                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │ MEV        │  │ Validator  │  │ Jito       │     │  │
│  │  │ Detection  │  │ Analytics  │  │ Integration│     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │ Bundle     │  │ Profit     │  │ Education  │     │  │
│  │  │ Builder    │  │ Calculator │  │ Service    │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐  ┌────────▼────────┐  ┌──────▼──────┐
│  PostgreSQL   │  │ Solana Network  │  │   Redis     │
│   Database    │  │  (RPC/WS)       │  │   Cache     │
└───────────────┘  └─────────────────┘  └─────────────┘
```

---

## Prerequisites

### Required
- **Node.js**: v22.0.0 or higher (tested on v24.8.0)
- **PostgreSQL**: v14 or higher
- **npm**: v9.0.0 or higher

### Optional
- **Redis**: For caching (recommended for production)
- **PM2**: For process management in production

### System Requirements
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 10GB free space
- **Network**: Stable internet connection for blockchain RPC calls

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/solana-mev-analytics.git
cd solana-mev-analytics
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Set Up Database

```bash
# Create PostgreSQL database
createdb mev_analytics

# Run migrations
npm run migrate
```

### 5. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mev_analytics
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com

# Jito Configuration
JITO_ENABLED=true
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
JITO_AUTH_KEYPAIR=[]
JITO_TIP_ACCOUNT=96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5

# Third-Party API Keys (Optional)
HELIUS_API_KEY=
QUICKNODE_ENDPOINT=
BIRDEYE_API_KEY=
COINGECKO_API_KEY=

# Redis Configuration (Optional)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Configuration

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_SOLANA_NETWORK=devnet
```

---

## Quick Start

### Development Mode

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Access the application at `http://localhost:5173`

### Production Mode

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Start backend
npm start
```

---

## Project Structure

```
mev-solana-app/
├── src/
│   ├── app.js                      # Main application entry
│   ├── config/
│   │   ├── database.js             # Database connection
│   │   └── solana.js               # Solana configuration
│   ├── middleware/
│   │   ├── auth.js                 # JWT authentication
│   │   ├── errorHandler.js         # Error handling
│   │   └── rateLimiter.js          # Rate limiting
│   ├── routes/
│   │   ├── auth.js                 # Authentication routes
│   │   ├── opportunities.js        # MEV opportunities
│   │   ├── validators.js           # Validator analytics
│   │   ├── bundles.js              # Bundle construction
│   │   ├── jito.js                 # Jito integration
│   │   ├── education.js            # Education system
│   │   ├── settings.js             # User settings
│   │   └── cluster.js              # Cluster switching
│   ├── services/
│   │   ├── hybridTransactionMonitor.js  # Transaction monitoring
│   │   ├── validatorPerformanceService.js
│   │   ├── jitoIntegrationService.js
│   │   ├── bundleConstructionService.js
│   │   ├── profitCalculationService.js
│   │   ├── educationService.js
│   │   └── clusterService.js
│   └── utils/
│       ├── logger.js               # Winston logger
│       └── validators.js           # Input validation
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/             # Reusable components
│   │   │   ├── mev/                # MEV-specific components
│   │   │   ├── Layout.jsx          # Main layout
│   │   │   └── ClusterSelector.jsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx     # Authentication state
│   │   │   ├── ThemeContext.jsx    # Dark mode
│   │   │   └── WalletContext.jsx   # Solana wallet
│   │   ├── hooks/
│   │   │   ├── useMEV.js           # MEV data hooks
│   │   │   └── useWebSocket.js     # WebSocket hooks
│   │   ├── pages/
│   │   │   ├── dashboard/          # Dashboard pages
│   │   │   ├── opportunities/      # Opportunities pages
│   │   │   ├── validators/         # Validator pages
│   │   │   ├── education/          # Education pages
│   │   │   ├── settings/           # Settings pages
│   │   │   └── auth/               # Auth pages
│   │   ├── services/
│   │   │   └── api.js              # API client
│   │   ├── App.jsx                 # Root component
│   │   └── main.jsx                # Entry point
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── scripts/
│   ├── migrate.js                  # Database migrations
│   ├── seed.js                     # Seed data
│   └── migrations/                 # Migration files
├── logs/                           # Application logs
├── .env                            # Environment variables
├── .env.example                    # Example environment
├── package.json
├── README.md
├── DARK_MODE_DESIGN_SYSTEM.md     # Design system docs
└── CLUSTER_SWITCHING.md           # Cluster switching docs
```

---

## API Reference

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "username"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### MEV Opportunities

#### Get All Opportunities
```http
GET /api/opportunities?type=arbitrage&minProfit=0.01&limit=50
Authorization: Bearer {token}
```

#### Get Arbitrage Opportunities
```http
GET /api/arbitrage/opportunities
Authorization: Bearer {token}
```

#### Get Liquidation Opportunities
```http
GET /api/liquidations
Authorization: Bearer {token}
```

### Bundle Operations

#### Simulate Bundle
```http
POST /api/bundles/simulate
Authorization: Bearer {token}
Content-Type: application/json

{
  "opportunities": [
    {
      "id": "opp_123",
      "opportunity_type": "arbitrage",
      "estimated_profit_sol": 0.5
    }
  ]
}
```

#### Execute Bundle
```http
POST /api/bundles/execute
Authorization: Bearer {token}
Content-Type: application/json

{
  "bundleId": "bundle_123",
  "tipAmount": 0.001
}
```

#### Get Bundle Status
```http
GET /api/bundles/status/:bundleId
Authorization: Bearer {token}
```

### Validator Analytics

#### Get All Validators
```http
GET /api/validators?limit=100&sortBy=mev_rewards
Authorization: Bearer {token}
```

#### Get Validator Details
```http
GET /api/validators/:address
Authorization: Bearer {token}
```

#### Get Validator Rankings
```http
GET /api/validators/rankings/:category
Authorization: Bearer {token}
```

### Jito Integration

#### Submit Jito Bundle
```http
POST /api/jito/bundles/submit
Authorization: Bearer {token}
Content-Type: application/json

{
  "transactions": ["base64_tx_1", "base64_tx_2"],
  "tipAmount": 0.001
}
```

#### Get Jito Performance
```http
GET /api/jito/performance
Authorization: Bearer {token}
```

### Education System

#### Get Learning Modules
```http
GET /api/education/modules
```

#### Get Module Details
```http
GET /api/education/modules/:slug
```

#### Save Progress
```http
POST /api/education/progress
Authorization: Bearer {token}
Content-Type: application/json

{
  "moduleId": 1,
  "progressPercentage": 50,
  "status": "in_progress"
}
```

### Settings

#### Update API Keys
```http
POST /api/settings/api-keys
Authorization: Bearer {token}
Content-Type: application/json

{
  "HELIUS_API_KEY": "your_key",
  "BIRDEYE_API_KEY": "your_key"
}
```

### Cluster Management

#### Switch Cluster
```http
POST /api/cluster/switch
Authorization: Bearer {token}
Content-Type: application/json

{
  "cluster": "devnet"
}
```

#### Get Current Cluster
```http
GET /api/cluster/current
Authorization: Bearer {token}
```

---

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  // Subscribe to channels
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'MEV_OPPORTUNITIES'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Available Channels

- `MEV_OPPORTUNITIES` - Real-time MEV opportunity updates
- `VALIDATOR_PERFORMANCE` - Live validator metrics
- `LIQUIDATION_ALERTS` - Liquidation opportunity notifications
- `BUNDLE_UPDATES` - Bundle execution status updates
- `ARBITRAGE_OPPORTUNITIES` - Arbitrage-specific updates

---

## Frontend Application

### Key Features

#### Dashboard
- Real-time MEV statistics
- Opportunity feed with live updates
- Validator performance charts
- Quick actions for bundle simulation

#### Opportunities Page
- Filterable opportunity list
- Compact and detailed card views
- Bundle simulation modal
- Execute bundle functionality

#### Validators Page
- Validator rankings table
- Performance metrics
- MEV attribution data
- Validator comparison tool

#### Education System
- Interactive learning modules
- Code playground with Monaco editor
- Quiz system with instant feedback
- Progress tracking and XP system
- Badges and achievements
- Leaderboard

#### Settings
- Profile management
- API keys configuration
- Jito settings
- Theme toggle (dark/light mode)
- Cluster selector

### Routing

```javascript
/                          # Dashboard
/live                      # Live opportunities feed
/opportunities             # Opportunities page
/validators                # Validators analytics
/analytics                 # Historical analytics
/simulations               # Simulations page
/bundle-builder            # Bundle builder tool
/profit-calculator         # Profit calculator
/activity                  # User activity
/education                 # Learning journey
/education/module/:slug    # Module view
/education/tutorial/:slug  # Tutorial view
/education/badges          # Badges page
/education/leaderboard     # Leaderboard
/glossary                  # MEV glossary
/settings                  # Settings page
/profile                   # User profile
/login                     # Login page
/signup                    # Signup page
```

---

## Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  preferred_cluster VARCHAR(20) DEFAULT 'mainnet-beta',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### mev_opportunities
```sql
CREATE TABLE mev_opportunities (
  id SERIAL PRIMARY KEY,
  opportunity_type VARCHAR(50) NOT NULL,
  token_symbol_a VARCHAR(20),
  token_symbol_b VARCHAR(20),
  estimated_profit_sol DECIMAL(18, 9),
  estimated_profit_usd DECIMAL(18, 2),
  execution_risk_score INTEGER,
  confidence_score DECIMAL(5, 4),
  primary_dex VARCHAR(50),
  secondary_dex VARCHAR(50),
  detection_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### enhanced_validator_performance
```sql
CREATE TABLE enhanced_validator_performance (
  id SERIAL PRIMARY KEY,
  validator_address VARCHAR(44) UNIQUE NOT NULL,
  vote_account VARCHAR(44),
  commission DECIMAL(5, 2),
  total_stake BIGINT,
  mev_rewards DECIMAL(18, 9),
  jito_enabled BOOLEAN DEFAULT false,
  performance_score DECIMAL(5, 2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### learning_modules
```sql
CREATE TABLE learning_modules (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50),
  difficulty VARCHAR(20),
  estimated_time INTEGER,
  xp_reward INTEGER DEFAULT 0,
  content JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Services

### HybridTransactionMonitor
Monitors Solana blockchain for MEV opportunities across 5 DEXs.

**Features:**
- WebSocket and polling-based monitoring
- Swap detection and analysis
- Price comparison across DEXs
- Real-time opportunity alerts

### ValidatorPerformanceService
Tracks validator metrics and MEV attribution.

**Features:**
- Performance scoring
- MEV reward tracking
- Jito integration detection
- Historical trend analysis

### JitoIntegrationService
Manages Jito Block Engine integration.

**Features:**
- Bundle submission
- Success rate estimation
- Tip calculation
- Status tracking

### BundleConstructionService
Constructs and optimizes transaction bundles.

**Features:**
- Transaction ordering
- Gas estimation
- Profit calculation
- Risk assessment

### ProfitCalculationService
Calculates expected profits with risk analysis.

**Features:**
- Monte Carlo simulations
- Competition modeling
- Risk scoring
- Historical statistics

### EducationService
Manages learning content and user progress.

**Features:**
- Module management
- Progress tracking
- Quiz evaluation
- Achievement system

---

## Development

### Code Style

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Database Migrations

```bash
# Create new migration
node scripts/create-migration.js migration_name

# Run migrations
npm run migrate

# Rollback migration
npm run migrate:rollback
```

### Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# View logs
tail -f logs/app.log
```

---

## Testing

### Backend Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

---

## Deployment

### Production Build

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Set environment
export NODE_ENV=production

# Start with PM2
pm2 start src/app.js --name mev-analytics
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t mev-analytics .
docker run -p 3001:3001 --env-file .env mev-analytics
```

### Environment-Specific Configuration

**Production:**
- Enable Redis caching
- Set `NODE_ENV=production`
- Use production RPC endpoints
- Enable rate limiting
- Configure SSL/TLS

**Staging:**
- Use testnet cluster
- Enable detailed logging
- Reduced rate limits

---

## Security

### Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secrets**: Use strong, random secrets (32+ characters)
3. **Rate Limiting**: Configured per endpoint
4. **Input Validation**: All inputs validated with Joi
5. **SQL Injection**: Parameterized queries only
6. **XSS Protection**: Helmet.js middleware
7. **CORS**: Configured for specific origins

### Authentication Flow

1. User registers/logs in
2. Server issues JWT access token (1h) and refresh token (7d)
3. Client stores tokens securely
4. Access token sent in Authorization header
5. Refresh token used to obtain new access token

---

## Contributing

### Guidelines

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards

- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Email**: support@mev-analytics.com

---

## Acknowledgments

- Solana Foundation
- Jito Labs
- Open source community

---

**Built with ❤️ for the Solana MEV ecosystem**
