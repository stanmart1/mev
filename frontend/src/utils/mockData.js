// Mock data for development when backend is not available
export const mockMevOpportunities = [
  {
    id: '1',
    opportunity_type: 'arbitrage',
    detection_timestamp: new Date(Date.now() - 30000).toISOString(),
    primary_dex: 'raydium',
    secondary_dex: 'orca',
    token_symbol_a: 'SOL',
    token_symbol_b: 'USDC',
    estimated_profit_sol: 0.0234,
    estimated_profit_usd: 2.81,
    volume_usd: 1250.00,
    execution_risk_score: 3,
    profit_percentage: 1.25,
    status: 'detected'
  },
  {
    id: '2',
    opportunity_type: 'liquidation',
    detection_timestamp: new Date(Date.now() - 120000).toISOString(),
    primary_dex: 'solend',
    token_symbol_a: 'BTC',
    token_symbol_b: 'USDC',
    estimated_profit_sol: 0.156,
    estimated_profit_usd: 18.72,
    volume_usd: 5600.00,
    execution_risk_score: 6,
    profit_percentage: 2.8,
    status: 'detected'
  },
  {
    id: '3',
    opportunity_type: 'sandwich',
    detection_timestamp: new Date(Date.now() - 45000).toISOString(),
    primary_dex: 'jupiter',
    token_symbol_a: 'RAY',
    token_symbol_b: 'SOL',
    estimated_profit_sol: 0.089,
    estimated_profit_usd: 10.68,
    volume_usd: 3200.00,
    execution_risk_score: 7,
    profit_percentage: 0.95,
    status: 'detected'
  }
];

export const mockMevStats = {
  success: true,
  data: {
    summary: {
      total_opportunities: 1247,
      executed_count: 892,
      arbitrage_count: 567,
      liquidation_count: 234,
      sandwich_count: 446,
      avg_profit_sol: 0.0456,
      total_profit_sol: 56.78,
      max_profit_sol: 2.34,
      avg_risk_score: 4.2
    },
    dex_breakdown: [
      {
        primary_dex: 'raydium',
        opportunity_count: 456,
        avg_profit: 0.0523,
        total_profit: 23.85
      },
      {
        primary_dex: 'orca',
        opportunity_count: 334,
        avg_profit: 0.0389,
        total_profit: 12.99
      },
      {
        primary_dex: 'jupiter',
        opportunity_count: 289,
        avg_profit: 0.0445,
        total_profit: 12.86
      },
      {
        primary_dex: 'serum',
        opportunity_count: 168,
        avg_profit: 0.0412,
        total_profit: 6.92
      }
    ]
  }
};