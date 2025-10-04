const express = require('express');
const router = express.Router();
const config = require('../config/config');

router.post('/switch', async (req, res) => {
  try {
    const { cluster } = req.body;
    
    if (!['mainnet-beta', 'devnet', 'testnet'].includes(cluster)) {
      return res.status(400).json({ error: 'Invalid cluster' });
    }

    process.env.SOLANA_NETWORK = cluster;
    config.solana.network = cluster;
    
    const rpcUrls = {
      'mainnet-beta': 'https://api.mainnet-beta.solana.com',
      'devnet': 'https://api.devnet.solana.com',
      'testnet': 'https://api.testnet.solana.com'
    };
    
    process.env.SOLANA_RPC_URL = rpcUrls[cluster];
    config.solana.rpcUrl = rpcUrls[cluster];

    res.json({ 
      success: true, 
      cluster,
      rpcUrl: rpcUrls[cluster]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/current', (req, res) => {
  res.json({
    success: true,
    cluster: config.solana.network,
    rpcUrl: config.solana.rpcUrl
  });
});

module.exports = router;
