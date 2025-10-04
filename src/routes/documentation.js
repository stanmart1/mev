const express = require('express');
const router = express.Router();

const API_DOCS = {
  endpoints: [
    {
      category: 'MEV Opportunities',
      endpoints: [
        {
          method: 'GET',
          path: '/api/opportunities',
          description: 'List MEV opportunities with filtering',
          auth: true,
          params: [
            { name: 'type', type: 'string', required: false, description: 'Filter by type: arbitrage, liquidation, sandwich' },
            { name: 'minProfit', type: 'number', required: false, description: 'Minimum profit in SOL' },
            { name: 'limit', type: 'number', required: false, description: 'Results per page (default: 50)' },
            { name: 'offset', type: 'number', required: false, description: 'Pagination offset' }
          ],
          response: {
            success: true,
            data: {
              opportunities: [{ id: 'uuid', type: 'arbitrage', estimated_profit_sol: 0.05 }],
              pagination: { total: 100, limit: 50, offset: 0 }
            }
          }
        },
        {
          method: 'POST',
          path: '/api/profit/calculate',
          description: 'Calculate profit for an opportunity',
          auth: true,
          body: {
            opportunity: { type: 'arbitrage', token_in: 'SOL', token_out: 'USDC', amount: 1 }
          },
          response: {
            success: true,
            data: { expectedProfit: 0.05, riskScore: 5, confidence: 0.85 }
          }
        }
      ]
    },
    {
      category: 'Validators',
      endpoints: [
        {
          method: 'GET',
          path: '/api/validators',
          description: 'List validators with performance metrics',
          auth: true,
          params: [
            { name: 'jitoEnabled', type: 'boolean', required: false, description: 'Filter Jito-enabled validators' },
            { name: 'minMevScore', type: 'number', required: false, description: 'Minimum MEV score' }
          ],
          response: {
            success: true,
            data: { validators: [{ address: 'abc123', mev_score: 85, jito_enabled: true }] }
          }
        },
        {
          method: 'GET',
          path: '/api/validators/:address',
          description: 'Get detailed validator metrics',
          auth: true,
          params: [{ name: 'address', type: 'string', required: true, description: 'Validator address' }],
          response: {
            success: true,
            data: { address: 'abc123', performance: {}, mev_stats: {} }
          }
        }
      ]
    },
    {
      category: 'Bundles',
      endpoints: [
        {
          method: 'POST',
          path: '/api/bundles/simulate',
          description: 'Simulate bundle execution',
          auth: true,
          body: {
            opportunities: ['uuid1', 'uuid2']
          },
          response: {
            success: true,
            data: { bundleId: 'bundle-123', estimatedProfit: 0.125, gasEstimate: 0.005 }
          }
        },
        {
          method: 'POST',
          path: '/api/jito/bundles/submit',
          description: 'Submit bundle to Jito',
          auth: true,
          body: {
            transactions: ['base64tx1', 'base64tx2'],
            tip: 0.001
          },
          response: {
            success: true,
            data: { bundleId: 'jito-123', status: 'submitted' }
          }
        }
      ]
    },
    {
      category: 'Analytics',
      endpoints: [
        {
          method: 'GET',
          path: '/api/analytics',
          description: 'Get analytics data',
          auth: true,
          params: [
            { name: 'timeframe', type: 'string', required: false, description: '24h, 7d, 30d' }
          ],
          response: {
            success: true,
            data: { profitOverTime: [], opportunityTypes: [] }
          }
        },
        {
          method: 'GET',
          path: '/api/searcher-performance/:userId',
          description: 'Get searcher performance metrics',
          auth: true,
          response: {
            success: true,
            data: { bundlesSubmitted: 156, successRate: 79.5, totalProfit: 12.45 }
          }
        }
      ]
    }
  ]
};

router.get('/api-docs', (req, res) => {
  res.json({ success: true, data: API_DOCS });
});

router.get('/glossary/categories', async (req, res) => {
  try {
    const result = await req.app.locals.db.query(
      'SELECT * FROM glossary_categories ORDER BY order_index'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
