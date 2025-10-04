import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

// Query keys
export const queryKeys = {
  mevOpportunities: (params) => ['mev-opportunities', params],
  mevStats: (timeframe) => ['mev-stats', timeframe],
  validators: (params) => ['validators', params],
  validator: (address) => ['validator', address],
  validatorRankings: (category, params) => ['validator-rankings', category, params],
  bundles: (params) => ['bundles', params],
  profitHistory: (params) => ['profit-history', params],
  analytics: (params) => ['analytics', params],
  jitoPerformance: (timeframe) => ['jito-performance', timeframe],
};

// MEV Opportunities
export function useMevOpportunities(params = {}) {
  return useQuery({
    queryKey: queryKeys.mevOpportunities(params),
    queryFn: () => apiService.getMevOpportunities(params),
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });
}

export function useMevStats(timeframe = '24h') {
  return useQuery({
    queryKey: queryKeys.mevStats(timeframe),
    queryFn: () => apiService.getMevStats(timeframe),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000,
  });
}

// Validators
export function useValidators(params = {}) {
  return useQuery({
    queryKey: queryKeys.validators(params),
    queryFn: () => apiService.getValidators(params),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });
}

export function useValidator(address) {
  return useQuery({
    queryKey: queryKeys.validator(address),
    queryFn: () => apiService.getValidator(address),
    enabled: !!address,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useValidatorRankings(category, params = {}) {
  return useQuery({
    queryKey: queryKeys.validatorRankings(category, params),
    queryFn: () => apiService.getValidatorRankings(category, params),
    enabled: !!category,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 120000,
  });
}

// Bundles
export function useBundles(params = {}) {
  return useQuery({
    queryKey: queryKeys.bundles(params),
    queryFn: () => apiService.getBundles(params),
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useSimulateBundle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (opportunities) => apiService.simulateBundle(opportunities),
    onSuccess: () => {
      // Invalidate bundles queries
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
    },
  });
}

// Profit Calculations
export function useProfitHistory(params = {}) {
  return useQuery({
    queryKey: queryKeys.profitHistory(params),
    queryFn: () => apiService.getProfitHistory(params),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useCalculateProfit() {
  return useMutation({
    mutationFn: (opportunity) => apiService.calculateProfit(opportunity),
  });
}

// Analytics
export function useAnalytics(params = {}) {
  return useQuery({
    queryKey: queryKeys.analytics(params),
    queryFn: () => apiService.getAnalytics(params),
    refetchInterval: 120000, // Refetch every 2 minutes
    staleTime: 60000,
  });
}

// Jito Integration
export function useJitoPerformance(timeframe = '24h') {
  return useQuery({
    queryKey: queryKeys.jitoPerformance(timeframe),
    queryFn: () => apiService.getJitoPerformance(timeframe),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useSubmitJitoBundle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (bundle) => apiService.submitJitoBundle(bundle),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      queryClient.invalidateQueries({ queryKey: ['jito-performance'] });
    },
  });
}

// Authentication
export function useLogin() {
  return useMutation({
    mutationFn: (credentials) => apiService.login(credentials),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (userData) => apiService.register(userData),
  });
}