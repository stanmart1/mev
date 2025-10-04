const pool = require('../config/database');

class AnalyticsService {
  getTimeFilter(timeRange) {
    const intervals = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days'
    };
    return intervals[timeRange] || '24 hours';
  }

  async getAnalytics(timeRange = '24h') {
    const interval = this.getTimeFilter(timeRange);
    
    const [profitOverTime, profitDistribution, opportunityTypes, heatmapData, validatorPerformance, successRates] = await Promise.all([
      this.getProfitOverTime(interval),
      this.getProfitDistribution(interval),
      this.getOpportunityTypes(interval),
      this.getHeatmapData(interval),
      this.getValidatorPerformance(interval),
      this.getSuccessRates(interval)
    ]);

    return {
      profitOverTime,
      profitDistribution,
      opportunityTypes,
      heatmapData,
      validatorPerformance,
      successRates
    };
  }

  async getProfitOverTime(interval) {
    try {
      const query = `
        SELECT 
          DATE_TRUNC('hour', detection_timestamp) as time,
          COUNT(*) as opportunities,
          COALESCE(SUM(estimated_profit_sol), 0) as profit
        FROM mev_opportunities
        WHERE detection_timestamp >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('hour', detection_timestamp)
        ORDER BY time ASC
        LIMIT 24
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => ({
        time: new Date(row.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        opportunities: parseInt(row.opportunities),
        profit: parseFloat(row.profit)
      }));
    } catch (error) {
      console.error('Error fetching profit over time:', error.message);
      return [];
    }
  }

  async getProfitDistribution(interval) {
    try {
      const query = `
        SELECT 
          CASE 
            WHEN estimated_profit_sol < 0.01 THEN '0-0.01'
            WHEN estimated_profit_sol < 0.05 THEN '0.01-0.05'
            WHEN estimated_profit_sol < 0.1 THEN '0.05-0.1'
            ELSE '0.1+'
          END as range,
          COUNT(*) as count,
          COALESCE(SUM(estimated_profit_sol), 0) as profit
        FROM mev_opportunities
        WHERE detection_timestamp >= NOW() - INTERVAL '${interval}'
        GROUP BY range
        ORDER BY range
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => ({
        range: row.range,
        count: parseInt(row.count),
        profit: parseFloat(row.profit)
      }));
    } catch (error) {
      console.error('Error fetching profit distribution:', error.message);
      return [];
    }
  }

  async getOpportunityTypes(interval) {
    try {
      const query = `
        SELECT 
          opportunity_type as name,
          COUNT(*) as count,
          COALESCE(SUM(estimated_profit_sol), 0) as value
        FROM mev_opportunities
        WHERE detection_timestamp >= NOW() - INTERVAL '${interval}'
        GROUP BY opportunity_type
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => ({
        name: row.name,
        count: parseInt(row.count),
        value: parseFloat(row.value)
      }));
    } catch (error) {
      console.error('Error fetching opportunity types:', error.message);
      return [];
    }
  }

  async getHeatmapData(interval) {
    try {
      const query = `
        SELECT 
          EXTRACT(DOW FROM detection_timestamp) as day_of_week,
          EXTRACT(HOUR FROM detection_timestamp) as hour,
          COUNT(*) as value
        FROM mev_opportunities
        WHERE detection_timestamp >= NOW() - INTERVAL '${interval}'
        GROUP BY day_of_week, hour
        ORDER BY day_of_week, hour
      `;
      
      const result = await pool.query(query);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      return result.rows.map(row => ({
        day: days[parseInt(row.day_of_week)],
        hour: `${String(row.hour).padStart(2, '0')}:00`,
        value: parseInt(row.value)
      }));
    } catch (error) {
      console.error('Error fetching heatmap data:', error.message);
      return [];
    }
  }

  async getValidatorPerformance(interval) {
    try {
      const query = `
        SELECT 
          DATE_TRUNC('day', timestamp) as time,
          validator_address,
          AVG(epoch_rewards) as rewards
        FROM enhanced_validator_performance
        WHERE timestamp >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', timestamp), validator_address
        ORDER BY time ASC, rewards DESC
        LIMIT 100
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => ({
        time: new Date(row.time).toLocaleDateString(),
        validator: row.validator_address.substring(0, 8) + '...',
        rewards: parseFloat(row.rewards)
      }));
    } catch (error) {
      console.error('Error fetching validator performance:', error.message);
      return [];
    }
  }

  async getSuccessRates(interval) {
    try {
      const query = `
        SELECT 
          DATE_TRUNC('hour', detection_timestamp) as time,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'executed' THEN 1 END) as successful
        FROM mev_opportunities
        WHERE detection_timestamp >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('hour', detection_timestamp)
        ORDER BY time ASC
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => ({
        time: new Date(row.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        rate: row.total > 0 ? (parseInt(row.successful) / parseInt(row.total)) * 100 : 0
      }));
    } catch (error) {
      console.error('Error fetching success rates:', error.message);
      return [];
    }
  }
}

module.exports = new AnalyticsService();
