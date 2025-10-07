# Why No Nginx?

## The Problem with Nginx + Coolify

Coolify already provides:
- **Reverse Proxy** (Traefik/Nginx)
- **SSL/TLS termination**
- **Domain routing**
- **Load balancing**

Adding nginx inside your container creates:
- **Double proxying** (Coolify proxy → Your nginx → App)
- **Port conflicts**
- **SSL/TLS complications**
- **Unnecessary complexity**

## Our Simple Solution

### Frontend
- Uses `serve` package (lightweight static file server)
- Runs on port 3001
- Coolify proxy handles everything else

### Backend
- Node.js Express server
- Runs on port 3000
- Direct connection, no proxy needed

## Coolify Configuration

In Coolify dashboard:
1. **Frontend**: Expose port 3001, assign domain (e.g., app.yourdomain.com)
2. **Backend**: Expose port 3000, assign domain (e.g., api.yourdomain.com)
3. Enable SSL for both
4. Done!

## Benefits

✅ No proxy conflicts
✅ Simpler debugging
✅ Smaller container images
✅ Faster builds
✅ Coolify handles all routing/SSL

## Architecture

```
Internet
   ↓
Coolify Reverse Proxy (Traefik)
   ├→ app.domain.com → Frontend:3001
   └→ api.domain.com → Backend:3000
```

Clean and simple!
