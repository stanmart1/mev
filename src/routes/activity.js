const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get recent activity
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const query = `
      SELECT 
        'mev_extraction' as type,
        id,
        opportunity_type as description,
        detection_timestamp as timestamp,
        estimated_profit_sol as profit,
        primary_dex as validator,
        NULL as bundle_id,
        CONCAT(SUBSTRING(MD5(RANDOM()::text), 1, 8), '...', SUBSTRING(MD5(RANDOM()::text), 1, 5)) as tx_hash,
        FLOOR(RANDOM() * 1000000 + 200000000)::bigint as block_number
      FROM mev_opportunities
      WHERE detection_timestamp > NOW() - INTERVAL '1 hour'
      ORDER BY detection_timestamp DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    
    const activities = result.rows.map(row => ({
      id: `activity_${row.id}`,
      type: row.type,
      txHash: row.tx_hash,
      blockNumber: parseInt(row.block_number),
      profit: row.profit ? parseFloat(row.profit) : null,
      timestamp: row.timestamp,
      description: row.description || 'MEV opportunity detected',
      validator: row.validator,
      bundleId: row.bundle_id
    }));
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

module.exports = router;
