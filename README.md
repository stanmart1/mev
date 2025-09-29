# Solana MEV Application

A comprehensive fullstack Solana MEV (Maximum Extractable Value) application providing real-time opportunity detection, bundle construction, validator analytics, and educational tools.

## Prerequisites

- Node.js 22+ (currently using v24.8.0)
- PostgreSQL
- Redis

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

## Project Structure

```
mev-solana-app/
├── backend/           # Node.js API service
├── frontend/          # React dashboard
├── shared/            # Shared types/utilities
└── contracts/         # Anchor/Rust smart contracts
```

## Available Scripts

- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build all packages for production
- `npm test` - Run tests across all packages

## Features

- **Real-Time MEV Detection** - Monitor Solana for arbitrage and liquidation opportunities
- **Bundle Construction** - Build and simulate MEV bundles
- **Validator Analytics** - Track MEV earnings and performance metrics
- **Bot Generation** - Generate customizable MEV bot code
- **Educational Tools** - Interactive MEV simulations and guides

## Development

Each package has its own README with specific setup instructions:
- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)
- [Smart Contracts](./contracts/README.md)

## Security Notice

⚠️ This application contains critical security vulnerabilities that must be addressed before deployment. Check the Code Issues Panel for details.