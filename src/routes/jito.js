const express = require('express');
const router = express.Router();
const jitoConnection = require('../services/jitoConnectionService');

router.get('/status', (req, res) => {
  try {
    const info = jitoConnection.getConnectionInfo();
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/configure', (req, res) => {
  try {
    const { enabled, blockEngineUrl, tipAccount, minTip, maxTip } = req.body;
    
    if (enabled !== undefined) {
      process.env.JITO_ENABLED = enabled.toString();
    }
    if (blockEngineUrl) {
      process.env.JITO_BLOCK_ENGINE_URL = blockEngineUrl;
    }
    if (tipAccount) {
      process.env.JITO_TIP_ACCOUNT = tipAccount;
    }
    if (minTip) {
      process.env.JITO_MIN_TIP_LAMPORTS = minTip.toString();
    }
    if (maxTip) {
      process.env.JITO_MAX_TIP_LAMPORTS = maxTip.toString();
    }

    res.json({
      success: true,
      message: 'Jito configuration updated',
      data: jitoConnection.getConnectionInfo()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
