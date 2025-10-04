const express = require('express');
const router = express.Router();
const marketIntelligenceService = require('../services/marketIntelligenceService');
const { optionalAuth } = require('../middleware/auth');
const authenticationService = require('../services/authenticationService');

router.get('/', optionalAuth(authenticationService), async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    const data = await marketIntelligenceService.getMarketIntelligence(timeRange);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Market intelligence error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch market intelligence' });
  }
});

module.exports = router;
