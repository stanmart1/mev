# Coolify Deployment - Quick Reference

## Files Created

### Docker Configuration
- **`Dockerfile`** - Backend container (Node 22 Alpine)
- **`frontend/Dockerfile`** - Frontend container (Multi-stage: Node build + Nginx)
- **`frontend/nginx.conf`** - Nginx config with API proxy and WebSocket support
- **`docker-compose.yml`** - Orchestration for both services
- **`.dockerignore`** - Backend exclusions
- **`frontend/.dockerignore`** - Frontend exclusions
- **`.env.example`** - Environment variables template

## Quick Deploy to Coolify

### 1. Push to Git Repository
```bash
git add .
git commit -m "Add Docker configuration for Coolify"
git push origin main
```

### 2. In Coolify Dashboard
1. **New Project** → **Docker Compose**
2. **Connect Git Repository**
3. **Add Environment Variables** (see below)
4. **Deploy**

### 3. Required Environment Variables
```env
DB_HOST=149.102.159.118
DB_PORT=54327
DB_NAME=mev_solana
DB_USER=your_user
DB_PASSWORD=your_password
JWT_SECRET=generate_random_string
JWT_REFRESH_SECRET=generate_random_string
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
NODE_ENV=production
```

### 4. Post-Deployment
```bash
# Run migrations
docker exec -it mev-backend npm run migrate

# Check logs
docker logs mev-backend
docker logs mev-frontend
```

## Service Ports
- **Frontend**: Port 3001 (serves static build)
- **Backend**: Port 3000 (API + WebSocket)

## Health Checks
- Backend: `GET /health`
- Frontend: `GET /` (returns React app)

## Architecture
```
┌──────────────────┐
│ Coolify Proxy    │
└────────┬─────────┘
         │
         ├─→ Frontend :3001 (React SPA)
         └─→ Backend :3000 (API + WS)
```

**Note**: Coolify's reverse proxy handles routing. No nginx needed.

## Troubleshooting

### Backend won't start
```bash
docker logs mev-backend
# Check: DB connection, env vars

### Frontend shows blank
```bash
docker logs mev-frontend
# Check: nginx config, backend connectivity
```

### Database connection fails
- Verify DB_HOST is accessible from container
- Check firewall rules
- Test: `docker exec -it mev-backend npm run migrate`

## Production Checklist
- [ ] Environment variables set
- [ ] Database accessible
- [ ] SSL/HTTPS enabled in Coolify
- [ ] Domain configured
- [ ] Migrations run
- [ ] Health checks passing
