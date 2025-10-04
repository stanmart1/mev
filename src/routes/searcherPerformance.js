const express = require('express');
const router = express.Router();
const searcherPerformanceService = require('../services/searcherPerformanceService');
const { optionalAuth } = require('../middleware/auth');

router.get('/:userId', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeRange = '7d' } = req.query;
    
    const performance = await searcherPerformanceService.getSearcherPerformance(userId, timeRange);
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Searcher performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch searcher performance'
    });
  }
});

module.exports = router;
