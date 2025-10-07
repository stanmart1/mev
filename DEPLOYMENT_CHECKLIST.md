# Deployment Checklist

## Pre-Deployment

- [ ] Git repository pushed with all changes
- [ ] Database accessible from Coolify server
- [ ] Domain DNS configured:
  - `mev.scaleitpro.com` → Coolify server IP
  - `mev-api.scaleitpro.com` → Coolify server IP

## Backend Deployment (mev-api.scaleitpro.com)

- [ ] Create new service in Coolify
- [ ] Set service type: Docker Compose
- [ ] Connect Git repository
- [ ] Add environment variables (see PRODUCTION_DEPLOYMENT.md)
- [ ] Set domain: mev-api.scaleitpro.com
- [ ] Set port: 3000
- [ ] Enable SSL/TLS
- [ ] Deploy
- [ ] Run migrations: `docker exec -it mev-backend npm run migrate`
- [ ] Test health: `curl https://mev-api.scaleitpro.com/health`

## Frontend Deployment (mev.scaleitpro.com)

- [ ] Create new service in Coolify
- [ ] Set service type: Docker
- [ ] Set Dockerfile path: frontend/Dockerfile
- [ ] Set build context: frontend/
- [ ] Add environment variables:
  - `VITE_API_BASE_URL=https://mev-api.scaleitpro.com/api`
  - `VITE_WS_URL=wss://mev-api.scaleitpro.com`
- [ ] Set domain: mev.scaleitpro.com
- [ ] Set port: 3000
- [ ] Enable SSL/TLS
- [ ] Deploy
- [ ] Test: Open https://mev.scaleitpro.com in browser

## Verification

- [ ] Frontend loads without console errors
- [ ] API calls work (check Network tab)
- [ ] WebSocket connects (check Console for WS connection)
- [ ] Login/signup works
- [ ] Dashboard displays data
- [ ] No CORS errors

## If Issues Occur

### CORS Error
```bash
# Check backend logs
docker logs mev-backend

# Verify CORS config includes: https://mev.scaleitpro.com
```

### Frontend Can't Connect to API
```bash
# Check frontend build includes correct API URL
docker exec -it mev-frontend cat /app/dist/assets/*.js | grep "mev-api"
```

### WebSocket Won't Connect
```bash
# Test WebSocket directly
wscat -c wss://mev-api.scaleitpro.com

# Check Coolify WebSocket support enabled
```

## Success Criteria

✅ https://mev.scaleitpro.com loads
✅ https://mev-api.scaleitpro.com/health returns healthy
✅ No console errors
✅ API calls succeed
✅ WebSocket connected
✅ SSL certificates valid
