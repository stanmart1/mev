import { apiClient } from './api';
import type { APIResponse, PaginatedResponse, QueryParams } from './api';

// Validator Types
export interface Validator {
  validator_address: string;
  rank: number;
  score: number;
  stake_amount: number;
  commission_rate: number;
  uptime_percentage: number;
  epoch_rewards: number;
  mev_rewards: number;
  jito_enabled: boolean;
  performance_score: number;
  reliability_score: number;
  mev_efficiency_score: number;
  decentralization_score: number;
  overall_rating: 'excellent' | 'good' | 'average' | 'poor';
  last_updated: string;
}

export interface ValidatorPerformance {
  validator_address: string;
  epoch: number;
  epoch_rewards: number;
  mev_rewards: number;
  vote_credits: number;
  skip_rate: number;
  uptime: number;
  commission_rate: number;
  stake_amount: number;
  performance_timestamp: string;
}

export interface ValidatorMEVMetrics {
  validator_address: string;
  mev_capture_rate: number;
  bundle_success_rate: number;
  avg_mev_per_block: number;
  efficiency_score: number;
  risk_adjusted_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  volatility: number;
  correlation_with_market: number;
}

export interface ValidatorComparison {
  jito_validators: {
    count: number;
    avg_performance: number;
    avg_mev_rewards: number;
    total_stake: number;
  };
  regular_validators: {
    count: number;
    avg_performance: number;
    avg_rewards: number;
    total_stake: number;
  };
  performance_difference: {
    percentage: number;
    statistical_significance: number;
    confidence_interval: {
      lower: number;
      upper: number;
    };
  };
}

export interface ValidatorFilters {
  limit?: number;
  offset?: number;
  category?: 'overall' | 'performance' | 'efficiency' | 'mev' | 'reliability';
  jitoEnabled?: boolean;
  minStake?: number;
  maxCommission?: number;
  minUptime?: number;
  search?: string;
}

export interface NetworkStatistics {
  total_validators: number;
  active_validators: number;
  jito_enabled_validators: number;
  total_stake: number;
  avg_commission: number;
  network_uptime: number;
  total_mev_rewards_24h: number;
  validator_distribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
}

class ValidatorAPIService {
  // Validator Rankings
  async getValidatorRankings(filters?: ValidatorFilters): Promise<PaginatedResponse<Validator>> {
    return apiClient.get<PaginatedResponse<Validator>>('/validators/rankings/overall', filters);
  }

  async getValidatorRankingsByCategory(
    category: string,
    filters?: ValidatorFilters
  ): Promise<PaginatedResponse<Validator>> {
    return apiClient.get<PaginatedResponse<Validator>>(`/validators/rankings/${category}`, filters);
  }

  async searchValidators(query: string, filters?: ValidatorFilters): Promise<PaginatedResponse<Validator>> {
    return apiClient.get<PaginatedResponse<Validator>>('/validators/search', {
      ...filters,
      search: query
    });
  }

  // Individual Validator Data
  async getValidatorDetails(address: string): Promise<APIResponse<Validator>> {
    return apiClient.get<APIResponse<Validator>>(`/validators/${address}`);
  }

  async getValidatorPerformance(
    address: string,
    params?: { startDate?: string; endDate?: string; limit?: number }
  ): Promise<APIResponse<ValidatorPerformance[]>> {
    return apiClient.get<APIResponse<ValidatorPerformance[]>>(`/validators/${address}/performance`, params);
  }

  async getValidatorMEVEfficiency(address: string): Promise<APIResponse<ValidatorMEVMetrics>> {
    return apiClient.get<APIResponse<ValidatorMEVMetrics>>(`/validators/${address}/mev-efficiency`);
  }

  // MEV-specific Validator Data
  async getTopMEVValidators(limit: number = 50): Promise<APIResponse<Validator[]>> {
    return apiClient.get<APIResponse<Validator[]>>('/validators/top-mev', { limit });
  }

  async getJitoValidators(filters?: ValidatorFilters): Promise<PaginatedResponse<Validator>> {
    return apiClient.get<PaginatedResponse<Validator>>('/validators/rankings/jito', filters);
  }

  // Validator Comparisons
  async getValidatorComparisons(): Promise<APIResponse<ValidatorComparison>> {
    return apiClient.get<APIResponse<ValidatorComparison>>('/validators/comparisons');
  }

  async compareValidators(addresses: string[]): Promise<APIResponse<Validator[]>> {
    return apiClient.get<APIResponse<Validator[]>>('/validators/compare', {
      addresses: addresses.join(',')
    });
  }

  // Network Statistics
  async getNetworkStatistics(): Promise<APIResponse<NetworkStatistics>> {
    return apiClient.get<APIResponse<NetworkStatistics>>('/validators/statistics');
  }

  async getValidatorDistribution(): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>('/validators/network/stats');
  }

  // Delegation Analytics Integration
  async getDelegationRecommendations(params?: {
    strategy?: string;
    riskTolerance?: string;
    amount?: number;
    preferences?: Record<string, any>;
  }): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>('/delegation-analytics/recommendations', params);
  }

  async getDelegationStrategies(): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>('/delegation-analytics/strategies');
  }

  async getPortfolioAnalysis(): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>('/delegation-analytics/portfolio');
  }

  async getUserDelegationPreferences(): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>('/delegation-analytics/preferences');
  }

  async updateDelegationPreferences(preferences: Record<string, any>): Promise<APIResponse<any>> {
    return apiClient.put<APIResponse<any>>('/delegation-analytics/preferences', preferences);
  }

  // Historical Performance
  async getHistoricalMEVPerformance(params?: {
    interval?: 'daily' | 'weekly' | 'monthly';
    startDate?: string;
    endDate?: string;
  }): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>('/history/mev-performance', params);
  }

  async getValidatorHistory(
    address: string,
    params?: { startDate?: string; endDate?: string; interval?: string }
  ): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>(`/history/validator/${address}`, params);
  }

  async getNetworkTrends(params?: {
    interval?: 'daily' | 'weekly' | 'monthly';
  }): Promise<APIResponse<any>> {
    return apiClient.get<APIResponse<any>>('/history/network-trends', params);
  }
}

export const validatorAPI = new ValidatorAPIService();