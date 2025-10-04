const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');

router.get('/', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    const analytics = await analyticsService.getAnalytics(timeRange);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

module.exports = router;
