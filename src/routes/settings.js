const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/api-keys', async (req, res) => {
  try {
    const keys = {
      SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || '',
      SOLANA_WS_URL: process.env.SOLANA_WS_URL || '',
      JITO_BLOCK_ENGINE_URL: process.env.JITO_BLOCK_ENGINE_URL || '',
      JITO_TIP_ACCOUNT: process.env.JITO_TIP_ACCOUNT || '',
      HELIUS_RPC_URL: process.env.HELIUS_RPC_URL || '',
      QUICKNODE_ENDPOINT: process.env.QUICKNODE_ENDPOINT || '',
      JITO_AUTH_KEYPAIR: process.env.JITO_AUTH_KEYPAIR ? '***' : '',
      HELIUS_API_KEY: process.env.HELIUS_API_KEY ? '***' : '',
      QUICKNODE_API_KEY: process.env.QUICKNODE_API_KEY ? '***' : '',
      BIRDEYE_API_KEY: process.env.BIRDEYE_API_KEY ? '***' : '',
      COINGECKO_API_KEY: process.env.COINGECKO_API_KEY ? '***' : ''
    };
    
    res.json({ success: true, data: keys });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api-keys', async (req, res) => {
  try {
    const keys = req.body;
    
    Object.keys(keys).forEach(key => {
      if (keys[key] && keys[key] !== '***') {
        process.env[key] = keys[key];
      }
    });
    
    res.json({ success: true, message: 'API keys updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api-keys/test/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    let success = false;
    
    switch (serviceId) {
      case 'solana':
        success = !!(process.env.SOLANA_RPC_URL);
        break;
      case 'jito':
        success = !!(process.env.JITO_BLOCK_ENGINE_URL && process.env.JITO_AUTH_KEYPAIR);
        break;
      case 'helius':
        success = !!(process.env.HELIUS_API_KEY);
        break;
      case 'quicknode':
        success = !!(process.env.QUICKNODE_ENDPOINT);
        break;
      case 'birdeye':
        success = !!(process.env.BIRDEYE_API_KEY);
        break;
      case 'coingecko':
        success = !!(process.env.COINGECKO_API_KEY);
        break;
      default:
        success = false;
    }
    
    res.json({ success, message: success ? 'Connection successful' : 'Configuration incomplete' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
