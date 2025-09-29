# Solana MEV Analytics Platform

A comprehensive MEV (Maximum Extractable Value) analytics platform for Solana providing real-time opportunity detection, validator performance tracking, bundle construction, and advanced MEV attribution.

## Prerequisites

- Node.js 22+ (currently using v24.8.0)
- PostgreSQL database
- Environment variables configured in `.env`

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
npm run migrate

# Start development server
npm run dev
```

## Project Structure

```
mev-solana-app/
├── src/
│   ├── config/        # Configuration and database setup
│   ├── services/      # Core MEV detection and analysis services
│   ├── routes/        # REST API endpoints
│   ├── middleware/    # Authentication and error handling
│   └── app.js         # Main application server
├── frontend/          # React dashboard (separate)
├── scripts/           # Database migration and validation scripts
├── reports/           # Business analysis and documentation
└── logs/              # Application logs
```

## Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm test` - Run test suite

## Core Features

### MEV Detection & Analysis
- **Real-Time Arbitrage Detection** - Cross-DEX price monitoring (Raydium, Orca, Serum)
- **Liquidation Scanning** - Monitor lending protocols for liquidation opportunities
- **Sandwich Attack Detection** - Identify front-running opportunities
- **Bundle Construction** - Optimal transaction ordering and gas estimation

### Validator Analytics
- **Performance Tracking** - Comprehensive validator metrics and rankings
- **MEV Attribution** - Track MEV rewards per validator with confidence scoring
- **Jito Integration** - Compare Jito-enabled vs regular validators
- **Historical Analysis** - Long-term performance trends and patterns

### Advanced Tools
- **Profit Calculation Engine** - Monte Carlo simulations with risk assessment
- **Competition Analysis** - Market competition probability modeling
- **WebSocket API** - Real-time data streaming
- **User Management** - Authentication and API key management

## API Endpoints

### MEV Opportunities
- `GET /api/opportunities` - List MEV opportunities with filtering
- `GET /api/arbitrage/opportunities` - Arbitrage-specific opportunities
- `GET /api/liquidations` - Liquidation opportunities
- `POST /api/bundles/simulate` - Simulate bundle construction

### Validator Analytics
- `GET /api/validators` - Validator performance data
- `GET /api/validators/:address` - Specific validator metrics
- `GET /api/validators/rankings/:category` - Validator rankings
- `GET /api/mev/attribution/:address` - MEV attribution data

### Jito Integration
- `POST /api/jito/bundles/submit` - Submit optimized bundles
- `GET /api/jito/performance` - Jito system performance
- `POST /api/jito/estimate-success-rate` - Bundle success estimation

### Profit Analysis
- `POST /api/profit/calculate` - Comprehensive profit calculation
- `POST /api/profit/risk-assessment` - Risk analysis
- `GET /api/profit/statistics` - Historical profit statistics

## WebSocket Channels

- `MEV_OPPORTUNITIES` - Real-time opportunity updates
- `VALIDATOR_PERFORMANCE` - Live validator metrics
- `LIQUIDATION_ALERTS` - Liquidation opportunity notifications
- `BUNDLE_UPDATES` - Bundle execution status

## Database Schema

Key tables include:
- `mev_opportunities` - Detected MEV opportunities
- `enhanced_validator_performance` - Validator metrics
- `mev_reward_attributions` - MEV reward tracking
- `validator_mev_profiles` - Long-term validator analysis
- `profit_calculations` - Historical profit analysis

## Development

The application uses:
- **Express.js** - REST API framework
- **PostgreSQL** - Primary database
- **WebSocket** - Real-time communication
- **Solana Web3.js** - Blockchain interaction
- **Winston** - Logging
- **Joi** - Input validation