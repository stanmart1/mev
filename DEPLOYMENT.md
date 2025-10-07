# Coolify Deployment Guide

## Prerequisites
- Coolify instance running
- PostgreSQL database accessible
- Domain name (optional)

## Deployment Steps

### 1. Create New Project in Coolify
1. Login to Coolify dashboard
2. Click "New Project"
3. Select "Docker Compose" as deployment type
4. Connect your Git repository

### 2. Configure Environment Variables
Add these environment variables in Coolify:

```env
# Database
DB_HOST=149.102.159.118
DB_PORT=54327
DB_NAME=mev_solana
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Server
NODE_ENV=production
PORT=3000

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
SOLANA_WS_URL=wss://api.devnet.solana.com

# Jito
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
JITO_AUTH_KEYPAIR=your_keypair
JITO_TIP_ACCOUNT=your_tip_account
```

### 3. Deploy
1. Click "Deploy" in Coolify
2. Wait for build to complete
3. Access application at assigned URL

## Port Configuration
- **Frontend**: Port 3001 (Static files via serve)
- **Backend**: Port 3000 (API + WebSocket)

**Note**: Coolify's reverse proxy handles SSL and routing. Configure domains in Coolify dashboard.

## Health Checks
- Backend: `http://backend:3000/health`
- Frontend: `http://frontend:80`

## Database Migration
Run migrations after first deployment:
```bash
docker exec -it mev-backend npm run migrate
```

## Logs
View logs in Coolify dashboard or:
```bash
docker logs mev-backend
docker logs mev-frontend
```

## Scaling
Adjust replicas in Coolify dashboard:
- Backend: 1-3 instances recommended
- Frontend: 1-2 instances recommended

## SSL/HTTPS
Enable SSL in Coolify:
1. Go to project settings
2. Enable "SSL/TLS"
3. Select "Let's Encrypt"
4. Add your domain

## Troubleshooting

### Backend won't start
- Check database connection
- Verify environment variables
- Check logs: `docker logs mev-backend`

### Frontend shows blank page
- Check logs: `docker logs mev-frontend`
- Verify backend is running
- Check API URL in frontend config

### WebSocket connection fails
- Ensure `/ws` route is proxied correctly
- Check nginx configuration
- Verify backend WebSocket server is running

## Manual Deployment (Alternative)

### Build Images
```bash
# Backend
docker build -t mev-backend .

# Frontend
cd frontend
docker build -t mev-frontend .
```

### Run Containers
```bash
docker-compose up -d
```

### Stop Containers
```bash
docker-compose down
```

## Production Checklist
- [ ] Database credentials configured
- [ ] JWT secrets set (use strong random strings)
- [ ] Solana RPC URL configured
- [ ] Environment set to production
- [ ] SSL/HTTPS enabled
- [ ] Database migrations run
- [ ] Health checks passing
- [ ] Logs accessible
- [ ] Backup strategy in place
