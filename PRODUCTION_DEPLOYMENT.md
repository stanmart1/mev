# Production Deployment Guide

## Domains
- **Frontend**: https://mev.scaleitpro.com
- **Backend**: https://mev-api.scaleitpro.com

## Coolify Setup

### Backend (mev-api.scaleitpro.com)

1. **Create Service**
   - Type: Docker Compose
   - Repository: Your Git repo
   - Branch: main

2. **Environment Variables**
```env
NODE_ENV=production
PORT=3000
DB_HOST=149.102.159.118
DB_PORT=54327
DB_NAME=mev_solana
DB_USER=your_user
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
SOLANA_WS_URL=wss://api.devnet.solana.com
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
JITO_AUTH_KEYPAIR=your_keypair
JITO_TIP_ACCOUNT=your_tip_account
FRONTEND_URL=https://mev.scaleitpro.com
```

3. **Domain Settings**
   - Domain: mev-api.scaleitpro.com
   - Port: 3000
   - Enable SSL/TLS (Let's Encrypt)

4. **Deploy**

5. **Run Migrations**
```bash
docker exec -it mev-backend npm run migrate
```

### Frontend (mev.scaleitpro.com)

1. **Create Service**
   - Type: Docker
   - Dockerfile: frontend/Dockerfile
   - Build context: frontend/

2. **Environment Variables**
```env
VITE_API_BASE_URL=https://mev-api.scaleitpro.com/api
VITE_WS_URL=wss://mev-api.scaleitpro.com
```

3. **Domain Settings**
   - Domain: mev.scaleitpro.com
   - Port: 3000
   - Enable SSL/TLS (Let's Encrypt)

4. **Deploy**

## Verification

### Backend Health Check
```bash
curl https://mev-api.scaleitpro.com/health
# Should return: {"status":"healthy","database":"connected"}
```

### Frontend Check
```bash
curl https://mev.scaleitpro.com
# Should return: HTML with React app
```

### CORS Check
```bash
curl -H "Origin: https://mev.scaleitpro.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://mev-api.scaleitpro.com/api/opportunities
# Should return CORS headers
```

### WebSocket Check
Open browser console on https://mev.scaleitpro.com:
```javascript
const ws = new WebSocket('wss://mev-api.scaleitpro.com');
ws.onopen = () => console.log('Connected');
```

## Troubleshooting

### CORS Errors
- Verify FRONTEND_URL in backend env vars
- Check browser console for exact error
- Ensure both domains use HTTPS

### WebSocket Connection Failed
- Verify WSS (not WS) in frontend config
- Check Coolify WebSocket support enabled
- Test: `wscat -c wss://mev-api.scaleitpro.com`

### API Calls Fail
- Check network tab in browser
- Verify API URL: https://mev-api.scaleitpro.com/api
- Test endpoint: `curl https://mev-api.scaleitpro.com/api/opportunities`

## Post-Deployment Checklist

- [ ] Backend health check passes
- [ ] Frontend loads without errors
- [ ] API calls work from frontend
- [ ] WebSocket connects successfully
- [ ] Database migrations completed
- [ ] SSL certificates active on both domains
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Logs show no errors
