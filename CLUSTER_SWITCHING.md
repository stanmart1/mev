# Cluster Switching Feature

## Overview
Users can now switch between Solana clusters (Mainnet Beta, Devnet, Testnet) directly from the UI. The selected cluster is persisted per user and automatically applied on login.

## Components

### Backend

**Migration**: `scripts/migrations/023_add_cluster_preference.sql`
- Adds `preferred_cluster` column to `users` table
- Default: `mainnet-beta`
- Allowed values: `mainnet-beta`, `devnet`, `testnet`

**ClusterService**: `src/services/clusterService.js`
- Manages multiple Solana RPC connections
- Caches connections per cluster
- Provides cluster info and switching

**UserProfileService**: Updated to support cluster preference updates

**API Endpoint**: `PUT /profile/preferences`
- Body: `{ "preferred_cluster": "devnet" }`
- Validates cluster value
- Updates user preference

### Frontend

**ClusterSelector**: `frontend/src/components/ClusterSelector.jsx`
- Dropdown component in header
- Shows current cluster with icon
- Updates preference via API
- Reloads page after switch

**AuthContext**: Updated to include cluster preference
- Loads from user object
- Persists in localStorage
- Provides `setCluster()` method

**Layout**: Updated to include ClusterSelector in header

## Usage

### User Flow
1. Click cluster selector in header (shows current cluster)
2. Select desired cluster from dropdown
3. Preference saved to database
4. Page reloads with new cluster

### API Usage
```javascript
// Update cluster preference
await apiService.updateUserPreferences({ 
  preferred_cluster: 'devnet' 
});
```

### Service Usage
```javascript
const clusterService = require('./services/clusterService');

// Get connection for specific cluster
const connection = clusterService.getConnection('devnet');

// Switch default cluster
clusterService.setCluster('testnet');

// Get cluster info
const info = clusterService.getClusterInfo('mainnet-beta');
// Returns: { name: 'Mainnet Beta', rpcUrl: '...', wsUrl: '...' }

// Get all clusters
const clusters = clusterService.getAllClusters();
```

## Cluster Icons
- 🟢 Mainnet Beta (production)
- 🟡 Devnet (development)
- 🔵 Testnet (testing)

## Technical Details

### RPC Endpoints
- **Mainnet**: `https://api.mainnet-beta.solana.com`
- **Devnet**: `https://api.devnet.solana.com`
- **Testnet**: `https://api.testnet.solana.com`

### WebSocket Endpoints
- **Mainnet**: `wss://api.mainnet-beta.solana.com`
- **Devnet**: `wss://api.devnet.solana.com`
- **Testnet**: `wss://api.testnet.solana.com`

### Connection Caching
Connections are cached per cluster to avoid recreating them on every request. The cache is managed by ClusterService.

## Migration

Run the migration:
```bash
node scripts/run-cluster-migration.js
```

Or manually:
```sql
ALTER TABLE users 
ADD COLUMN preferred_cluster VARCHAR(20) DEFAULT 'mainnet-beta' 
CHECK (preferred_cluster IN ('mainnet-beta', 'devnet', 'testnet'));

CREATE INDEX idx_users_cluster ON users(preferred_cluster);
UPDATE users SET preferred_cluster = 'mainnet-beta' WHERE preferred_cluster IS NULL;
```

## Future Enhancements
- Custom RPC endpoints
- Cluster health indicators
- Network statistics per cluster
- Automatic cluster switching based on availability
- Cluster-specific data filtering
