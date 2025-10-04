const pool = require('../config/database');

class SearcherPerformanceService {
  async getSearcherPerformance(userId, timeRange = '7d') {
    const interval = this.getTimeInterval(timeRange);
    
    const [personal, network, transactions, profitTrend] = await Promise.all([
      this.getPersonalMetrics(userId, interval),
      this.getNetworkAverages(interval),
      this.getTransactionHistory(userId, interval),
      this.getProfitTrend(userId, interval)
    ]);

    const comparison = this.buildComparison(personal, network);
    const goals = this.calculateGoals(personal);

    return {
      ...personal,
      networkAverage: network,
      comparison,
      transactions,
      profitTrend,
      goals
    };
  }

  getTimeInterval(timeRange) {
    const intervals = {
      '24h': '1 day',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days'
    };
    return intervals[timeRange] || '7 days';
  }

  async getPersonalMetrics(userId, interval) {
    try {
      const query = `
        SELECT 
          COUNT(*) as bundles_submitted,
          COUNT(CASE WHEN status = 'executed' THEN 1 END) as bundles_executed,
          COALESCE(SUM(CASE WHEN status = 'executed' THEN estimated_profit_sol ELSE 0 END), 0) as total_profit,
          COALESCE(SUM(CASE WHEN status = 'executed' THEN estimated_profit_usd ELSE 0 END), 0) as total_profit_usd,
          MAX(estimated_profit_sol) as best_profit
        FROM mev_opportunities
        WHERE user_id = $1 AND detection_timestamp >= NOW() - INTERVAL '${interval}'
      `;
      
      const result = await pool.query(query, [userId]);
      const row = result.rows[0];
      
      const successRate = row.bundles_submitted > 0 
        ? (parseInt(row.bundles_executed) / parseInt(row.bundles_submitted)) * 100 
        : 0;

      const typeQuery = `
        SELECT 
          opportunity_type as name,
          COUNT(*) as value
        FROM mev_opportunities
        WHERE user_id = $1 AND detection_timestamp >= NOW() - INTERVAL '${interval}'
        GROUP BY opportunity_type
      `;
      const typeResult = await pool.query(typeQuery, [userId]);

      return {
        bundlesSubmitted: parseInt(row.bundles_submitted),
        bundlesExecuted: parseInt(row.bundles_executed),
        successRate,
        totalProfit: parseFloat(row.total_profit),
        totalProfitUSD: parseFloat(row.total_profit_usd),
        bestOpportunity: {
          profit: parseFloat(row.best_profit || 0),
          type: 'arbitrage'
        },
        opportunityTypes: typeResult.rows
      };
    } catch (error) {
      console.error('Error fetching personal metrics:', error.message);
      return {
        bundlesSubmitted: 0,
        bundlesExecuted: 0,
        successRate: 0,
        totalProfit: 0,
        totalProfitUSD: 0,
        bestOpportunity: { profit: 0, type: 'N/A' },
        opportunityTypes: []
      };
    }
  }

  async getNetworkAverages(interval) {
    try {
      const query = `
        SELECT 
          AVG(CASE WHEN total > 0 THEN (executed::float / total) * 100 ELSE 0 END) as avg_success_rate,
          AVG(avg_profit) as avg_profit
        FROM (
          SELECT 
            user_id,
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'executed' THEN 1 END) as executed,
            AVG(estimated_profit_sol) as avg_profit
          FROM mev_opportunities
          WHERE detection_timestamp >= NOW() - INTERVAL '${interval}'
          GROUP BY user_id
        ) user_stats
      `;
      
      const result = await pool.query(query);
      const row = result.rows[0];
      
      return {
        successRate: parseFloat(row.avg_success_rate || 0),
        avgProfit: parseFloat(row.avg_profit || 0)
      };
    } catch (error) {
      console.error('Error fetching network averages:', error.message);
      return { successRate: 0, avgProfit: 0 };
    }
  }

  async getTransactionHistory(userId, interval) {
    try {
      const query = `
        SELECT 
          id as tx_hash,
          opportunity_type as type,
          detection_timestamp as timestamp,
          estimated_profit_sol as profit,
          0.001 as gas_cost,
          estimated_profit_sol - 0.001 as net_pl,
          status
        FROM mev_opportunities
        WHERE user_id = $1 AND detection_timestamp >= NOW() - INTERVAL '${interval}'
        ORDER BY detection_timestamp DESC
        LIMIT 50
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows.map(row => ({
        txHash: row.tx_hash,
        type: row.type,
        timestamp: row.timestamp,
        profit: parseFloat(row.profit),
        gasCost: parseFloat(row.gas_cost),
        netPL: parseFloat(row.net_pl),
        status: row.status === 'executed' ? 'success' : 'failed'
      }));
    } catch (error) {
      console.error('Error fetching transaction history:', error.message);
      return [];
    }
  }

  async getProfitTrend(userId, interval) {
    try {
      const query = `
        SELECT 
          DATE_TRUNC('day', detection_timestamp) as date,
          COALESCE(SUM(CASE WHEN status = 'executed' THEN estimated_profit_sol ELSE 0 END), 0) as profit
        FROM mev_opportunities
        WHERE user_id = $1 AND detection_timestamp >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', detection_timestamp)
        ORDER BY date ASC
      `;
      
      const result = await pool.query(query, [userId]);
      let cumulative = 0;
      
      return result.rows.map(row => {
        cumulative += parseFloat(row.profit);
        return {
          date: new Date(row.date).toLocaleDateString(),
          profit: parseFloat(row.profit),
          cumulative
        };
      });
    } catch (error) {
      console.error('Error fetching profit trend:', error.message);
      return [];
    }
  }

  buildComparison(personal, network) {
    return [
      { metric: 'Success Rate', you: personal.successRate, network: network.successRate },
      { metric: 'Avg Profit', you: personal.totalProfit / (personal.bundlesSubmitted || 1), network: network.avgProfit }
    ];
  }

  calculateGoals(personal) {
    return [
      { name: 'Monthly Profit Target', current: personal.totalProfit, target: 10 },
      { name: 'Success Rate Goal', current: personal.successRate, target: 80 },
      { name: 'Bundles Executed', current: personal.bundlesExecuted, target: 100 }
    ];
  }
}

module.exports = new SearcherPerformanceService();
