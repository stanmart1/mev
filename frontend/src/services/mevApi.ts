import { apiClient } from './api';
import type { APIResponse, PaginatedResponse, QueryParams } from './api';

// MEV Opportunity Types
export interface MEVOpportunity {
  id: string;
  opportunity_type: 'arbitrage' | 'liquidation' | 'sandwich' | 'flashloan';
  token_pair: string;
  primary_dex: string;
  secondary_dex?: string;
  estimated_profit_sol: number;
  profit_percentage: number;
  execution_risk_score: number;
  confidence_level: number;
  gas_cost_sol: number;
  net_profit_sol: number;
  time_to_expiry: number;
  volume_usd: number;
  detection_timestamp: string;
  status: 'active' | 'executing' | 'completed' | 'expired';
  competition_level: 'low' | 'medium' | 'high';
  market_conditions: {
    volatility: number;
    liquidity: number;
    spread: number;
  };
}

export interface MEVStatistics {
  total_opportunities: number;
  active_opportunities: number;
  total_profit_24h: number;
  success_rate: number;
  avg_profit_per_opportunity: number;
  top_performers: Array<{
    searcher_pubkey: string;
    profit_sol: number;
    success_rate: number;
  }>;
}

export interface MEVFilters {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  type?: string[];
  minProfit?: number;
  maxRisk?: number;
  dex?: string[];
  competitionLevel?: string;
}

// MEV Bundle Types
export interface MEVBundle {
  id: string;
  bundle_id: string;
  transaction_count: number;
  bundle_strategy: string;
  estimated_profit_sol: number;
  estimated_gas_cost_sol: number;
  net_profit_sol: number;
  average_risk_score: number;
  confidence_level: number;
  bundle_status: 'constructed' | 'submitted' | 'executed' | 'failed';
  construction_timestamp: string;
  execution_plan: {
    transactions: Array<{
      type: string;
      order: number;
      estimated_gas: number;
    }>;
    total_compute_units: number;
    priority_fee: number;
  };
}

class MEVAPIService {
  // Live MEV Opportunities
  async getLiveOpportunities(filters?: MEVFilters): Promise<PaginatedResponse<MEVOpportunity>> {
    return apiClient.get<PaginatedResponse<MEVOpportunity>>('/mev/opportunities/live', filters);
  }

  async getOpportunityById(id: string): Promise<APIResponse<MEVOpportunity>> {
    return apiClient.get<APIResponse<MEVOpportunity>>(`/mev/opportunities/${id}`);
  }

  async getMEVStatistics(timeframe: string = '24h'): Promise<APIResponse<MEVStatistics>> {
    return apiClient.get<APIResponse<MEVStatistics>>('/mev/opportunities/stats', { timeframe });
  }

  // Arbitrage Opportunities
  async getArbitrageOpportunities(filters?: MEVFilters): Promise<PaginatedResponse<MEVOpportunity>> {
    return apiClient.get<PaginatedResponse<MEVOpportunity>>('/arbitrage/opportunities', {
      ...filters,
      type: 'arbitrage'
    });
  }

  async detectArbitrage(): Promise<APIResponse<MEVOpportunity[]>> {
    return apiClient.post<APIResponse<MEVOpportunity[]>>('/arbitrage/detect');
  }

  async getArbitrageAnalysis(): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>('/arbitrage/analysis');
  }

  // Liquidation Opportunities
  async getLiquidationOpportunities(filters?: MEVFilters): Promise<PaginatedResponse<MEVOpportunity>> {
    return apiClient.get<PaginatedResponse<MEVOpportunity>>('/liquidations', {
      ...filters,
      type: 'liquidation'
    });
  }

  async getLiquidationStatus(): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>('/liquidations/status');
  }

  async getLiquidationsByProtocol(protocol: string): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>(`/liquidations/protocol/${protocol}`);
  }

  // Sandwich Attack Opportunities
  async getSandwichOpportunities(filters?: MEVFilters): Promise<PaginatedResponse<MEVOpportunity>> {
    return apiClient.get<PaginatedResponse<MEVOpportunity>>('/sandwich-attacks', {
      ...filters,
      type: 'sandwich'
    });
  }

  async simulateSandwich(params: {
    targetValue: number;
    tokenA: string;
    tokenB: string;
    dex: string;
    slippage?: number;
  }): Promise<APIResponse<any>> {
    return apiClient.post<APIResponse<any>>('/sandwich-attacks/simulate', params);
  }

  // MEV Bundle Operations
  async getBundles(filters?: QueryParams): Promise<PaginatedResponse<MEVBundle>> {
    return apiClient.get<PaginatedResponse<MEVBundle>>('/bundles', filters);
  }

  async composeBundle(params: {
    opportunities: string[];
    strategy: string;
    constraints?: Record<string, any>;
  }): Promise<APIResponse<MEVBundle>> {
    return apiClient.post<APIResponse<MEVBundle>>('/bundles/compose', params);
  }

  async optimizeBundle(params: {
    transactions: any[];
    constraints?: Record<string, any>;
  }): Promise<APIResponse<any>> {
    return apiClient.post<APIResponse<any>>('/bundles/optimize', params);
  }

  async estimateGasCost(params: {
    transactions: any[];
    bundleType?: string;
  }): Promise<APIResponse<any>> {
    return apiClient.post<APIResponse<any>>('/bundles/gas-estimate', params);
  }

  async assessBundleRisk(params: {
    bundleId?: string;
    transactions?: any[];
  }): Promise<APIResponse<any>> {
    return apiClient.post<APIResponse<any>>('/bundles/risk-assessment', params);
  }

  // Real-time Price Analysis
  async getPriceAnalysis(params: {
    tokenA: string;
    tokenB: string;
    timeframe?: string;
  }): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>('/prices/analysis', params);
  }

  // Swap Data
  async getSwapData(filters?: {
    dex?: string;
    tokenA?: string;
    tokenB?: string;
    limit?: number;
  }): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>('/swaps', filters);
  }

  // WebSocket Test (for debugging)
  async testWebSocket(data: { channel: string; data?: any }): Promise<APIResponse<any>> {
    return apiClient.post<APIResponse<any>>('/websocket/test', data);
  }

  async getWebSocketStats(): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>('/websocket/stats');
  }
}

export const mevAPI = new MEVAPIService();