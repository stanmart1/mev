import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import { useWebSocket } from './useWebSocket';

export function useMEV(demoMode = false) {
  const queryClient = useQueryClient();
  const { subscribe, unsubscribe } = useWebSocket();

  // Fetch MEV opportunities with enhanced mock data
  const {
    data: opportunities = [],
    isLoading: isLoadingOpportunities,
    error: opportunitiesError,
    refetch: refetchOpportunities
  } = useQuery({
    queryKey: ['mev', 'opportunities'],
    queryFn: async () => {
      const response = await apiService.getMevOpportunities();
      return response?.data?.opportunities || response?.opportunities || [];
    },
    refetchInterval: 5000, // Refetch every 5 seconds for live feel
    staleTime: 2000 // Consider data stale after 2 seconds
  });

  // Fetch arbitrage opportunities
  const {
    data: arbitrageOpportunities = [],
    isLoading: isLoadingArbitrage,
    error: arbitrageError
  } = useQuery({
    queryKey: ['mev', 'arbitrage'],
    queryFn: async () => {
      const response = await apiService.getMevOpportunities({ type: 'arbitrage' });
      return response?.data?.opportunities || response?.opportunities || [];
    },
    refetchInterval: 15000
  });

  // Fetch liquidation opportunities
  const {
    data: liquidationOpportunities = [],
    isLoading: isLoadingLiquidations,
    error: liquidationsError
  } = useQuery({
    queryKey: ['mev', 'liquidations'],
    queryFn: async () => {
      const response = await apiService.getMevOpportunities({ type: 'liquidation' });
      return response?.data?.opportunities || response?.opportunities || [];
    },
    refetchInterval: 20000
  });

  // Bundle simulation mutation
  const bundleSimulation = useMutation({
    mutationFn: (bundleData) => apiService.simulateBundle(bundleData),
    onSuccess: (data) => {
      // Optionally update cache or trigger notifications
      console.log('Bundle simulation successful:', data);
    },
    onError: (error) => {
      console.error('Bundle simulation failed:', error);
    }
  });

  // Profit calculation mutation
  const profitCalculation = useMutation({
    mutationFn: (calculationData) => apiService.calculateProfit(calculationData),
    onSuccess: (data) => {
      console.log('Profit calculation successful:', data);
    }
  });

  // WebSocket subscriptions for real-time updates with enhanced data simulation
  useEffect(() => {
    const handleMEVUpdate = (data) => {
      queryClient.setQueryData(['mev', 'opportunities'], (oldData) => {
        if (!oldData) return [data];
        // Add new opportunity or update existing one
        const existingIndex = oldData.findIndex(op => op.id === data.id);
        if (existingIndex >= 0) {
          const newData = [...oldData];
          newData[existingIndex] = data;
          return newData;
        }
        return [data, ...oldData.slice(0, 999)]; // Keep only latest 1000 for performance
      });
    };

    const handleArbitrageUpdate = (data) => {
      queryClient.setQueryData(['mev', 'arbitrage'], (oldData) => {
        if (!oldData) return [data];
        return [data, ...oldData.slice(0, 99)];
      });
    };

    const handleLiquidationUpdate = (data) => {
      queryClient.setQueryData(['mev', 'liquidations'], (oldData) => {
        if (!oldData) return [data];
        return [data, ...oldData.slice(0, 99)];
      });
    };

    // Simulate real-time updates for development
    const simulateRealTimeUpdates = () => {
      const newOpportunity = {
        id: `live_${Date.now()}`,
        opportunity_type: ['arbitrage', 'liquidation', 'sandwich'][Math.floor(Math.random() * 3)],
        token_symbol_a: ['SOL', 'USDC', 'RAY', 'ORCA', 'SRM'][Math.floor(Math.random() * 5)],
        token_symbol_b: ['USDC', 'USDT', 'SOL', 'RAY'][Math.floor(Math.random() * 4)],
        estimated_profit_sol: Math.random() * 3 + 0.001,
        estimated_profit_usd: Math.random() * 300 + 1,
        execution_risk_score: Math.floor(Math.random() * 10) + 1,
        confidence_score: Math.random() * 0.4 + 0.6,
        volume_usd: Math.random() * 50000 + 1000,
        primary_dex: ['raydium', 'orca', 'serum', 'jupiter'][Math.floor(Math.random() * 4)],
        secondary_dex: Math.random() > 0.5 ? ['raydium', 'orca', 'serum'][Math.floor(Math.random() * 3)] : null,
        detection_timestamp: new Date().toISOString(),
        profit_percentage: Math.random() * 12 + 0.5
      };
      handleMEVUpdate(newOpportunity);
    };

    // Subscribe to WebSocket channels
    subscribe('MEV_OPPORTUNITIES', handleMEVUpdate);
    subscribe('ARBITRAGE_OPPORTUNITIES', handleArbitrageUpdate);
    subscribe('LIQUIDATION_ALERTS', handleLiquidationUpdate);

    // Simulate live updates every 3-8 seconds
    const liveUpdateInterval = setInterval(simulateRealTimeUpdates, Math.random() * 5000 + 3000);

    return () => {
      unsubscribe('MEV_OPPORTUNITIES', handleMEVUpdate);
      unsubscribe('ARBITRAGE_OPPORTUNITIES', handleArbitrageUpdate);
      unsubscribe('LIQUIDATION_ALERTS', handleLiquidationUpdate);
      clearInterval(liveUpdateInterval);
    };
  }, [subscribe, unsubscribe, queryClient]);

  // Utility functions
  const simulateBundle = useCallback((bundleData) => {
    return bundleSimulation.mutateAsync(bundleData);
  }, [bundleSimulation]);

  const calculateProfit = useCallback((calculationData) => {
    return profitCalculation.mutateAsync(calculationData);
  }, [profitCalculation]);

  const refreshOpportunities = useCallback(() => {
    refetchOpportunities();
  }, [refetchOpportunities]);

  // Enhanced filtering functions
  const getOpportunitiesByType = useCallback((type) => {
    return opportunities.filter(op => op.opportunity_type === type);
  }, [opportunities]);

  const getHighProfitOpportunities = useCallback((minProfit = 0.01) => {
    return opportunities.filter(op => (op.estimated_profit_sol || 0) >= minProfit);
  }, [opportunities]);

  const getOpportunitiesByRisk = useCallback((maxRisk = 5) => {
    return opportunities.filter(op => (op.execution_risk_score || 10) <= maxRisk);
  }, [opportunities]);

  const getOpportunitiesByDex = useCallback((dex) => {
    return opportunities.filter(op => 
      op.primary_dex === dex || op.secondary_dex === dex
    );
  }, [opportunities]);

  const getOpportunitiesByConfidence = useCallback((minConfidence = 0.7) => {
    return opportunities.filter(op => (op.confidence_score || 0) >= minConfidence);
  }, [opportunities]);

  return {
    // Data
    opportunities,
    arbitrageOpportunities,
    liquidationOpportunities,
    
    // Loading states
    isLoadingOpportunities,
    isLoadingArbitrage,
    isLoadingLiquidations,
    isSimulatingBundle: bundleSimulation.isPending,
    isCalculatingProfit: profitCalculation.isPending,
    
    // Errors
    opportunitiesError,
    arbitrageError,
    liquidationsError,
    bundleError: bundleSimulation.error,
    profitError: profitCalculation.error,
    
    // Actions
    simulateBundle,
    calculateProfit,
    refreshOpportunities,
    
    // Enhanced utilities
    getOpportunitiesByType,
    getHighProfitOpportunities,
    getOpportunitiesByRisk,
    getOpportunitiesByDex,
    getOpportunitiesByConfidence,
    
    // Results
    bundleResult: bundleSimulation.data,
    profitResult: profitCalculation.data
  };
}

export function useMEVStats() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['mev', 'stats'],
    queryFn: () => apiService.getMevStats(),
    refetchInterval: 60000 // Refetch every minute
  });

  return {
    stats: stats || {
      totalOpportunities: 0,
      totalProfit: 0,
      successRate: 0,
      activeValidators: 0
    },
    isLoading,
    error
  };
}