# ---------- BUILD STAGE ----------
FROM node:22-bullseye AS build

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Clean install (no cache leftovers) and rebuild native deps
RUN npm ci

# Copy the rest of your code
COPY . .

# Reinstall rollup (forces correct native binary)
RUN npm rebuild rollup && npm install @rollup/rollup-linux-x64-gnu --no-save || true

# Build your Vite project
RUN npm run build

# ---------- PRODUCTION STAGE ----------
FROM node:22-alpine AS production

WORKDIR /app

# Copy only the built files from build stage
COPY --from=build /app/dist ./dist

# Install serve (or your chosen static server)
RUN npm install -g serve

# Expose port 3000 (or whatever port you use)
EXPOSE 3000

# Serve the built app
CMD ["serve", "-s", "dist", "-l", "3000"]
