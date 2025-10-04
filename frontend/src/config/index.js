const config = {
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
    timeout: 30000,
  },
  websocket: {
    url: import.meta.env.VITE_WS_URL || 'ws://localhost:3001',
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  },
  solana: {
    rpcUrl: import.meta.env.VITE_SOLANA_RPC || 'https://api.devnet.solana.com',
    network: 'devnet',
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'MEV Analytics Platform',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
  },
  features: {
    walletAuth: true,
    realTimeUpdates: true,
    bundleSimulation: true,
    profitCalculation: true,
  },
};

export default config;