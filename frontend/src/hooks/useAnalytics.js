import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';

export function useAnalytics(timeRange = '24h', demoMode = false) {
  const [refreshCount, setRefreshCount] = useState(0);

  // Generate mock analytics data
  const generateMockAnalytics = (range) => {
    const hours = range === '1h' ? 1 : range === '24h' ? 24 : range === '7d' ? 168 : 720;
    const points = range === '1h' ? 12 : range === '24h' ? 24 : range === '7d' ? 7 : 30;
    
    const timeSeriesData = Array.from({ length: points }, (_, i) => ({
      time: range === '7d' ? `Day ${i + 1}` : range === '30d' ? `Week ${i + 1}` : `${i}:00`,
      opportunities: Math.floor(Math.random() * 50) + 20,
      profit: Math.random() * 10 + 2,
      successRate: Math.random() * 30 + 60,
      volume: Math.random() * 100000 + 10000
    }));

    const profitDistribution = [
      { range: '0-0.1 SOL', count: Math.floor(Math.random() * 30) + 20 },
      { range: '0.1-0.5 SOL', count: Math.floor(Math.random() * 25) + 15 },
      { range: '0.5-1 SOL', count: Math.floor(Math.random() * 20) + 10 },
      { range: '1-5 SOL', count: Math.floor(Math.random() * 15) + 5 },
      { range: '5+ SOL', count: Math.floor(Math.random() * 5) + 1 }
    ];

    const opportunityTypes = [
      { name: 'Arbitrage', value: Math.floor(Math.random() * 20) + 50, color: '#3B82F6' },
      { name: 'Liquidation', value: Math.floor(Math.random() * 15) + 20, color: '#8B5CF6' },
      { name: 'Sandwich', value: Math.floor(Math.random() * 10) + 5, color: '#F59E0B' }
    ];

    return {
      timeSeriesData,
      profitDistribution,
      opportunityTypes,
      keyMetrics: {
        totalOpportunities: Math.floor(Math.random() * 500) + 1000,
        totalProfit: Math.random() * 100 + 200,
        activeValidators: Math.floor(Math.random() * 200) + 1600,
        networkHealth: 'Healthy',
        avgSuccessRate: Math.random() * 20 + 70
      }
    };
  };

  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics', timeRange, refreshCount],
    queryFn: () => apiService.getAnalytics({ timeRange }),
    refetchInterval: 60000,
    staleTime: 30000
  });



  const processedData = useMemo(() => {
    if (!analytics) return null;

    return {
      ...analytics,
      // Add computed metrics
      totalVolume: analytics.timeSeriesData?.reduce((sum, item) => sum + (item.volume || 0), 0) || 0,
      avgProfit: analytics.timeSeriesData?.reduce((sum, item) => sum + (item.profit || 0), 0) / (analytics.timeSeriesData?.length || 1) || 0,
      peakOpportunities: Math.max(...(analytics.timeSeriesData?.map(item => item.opportunities) || [0])),
      trendDirection: analytics.timeSeriesData?.length > 1 ? 
        (analytics.timeSeriesData[analytics.timeSeriesData.length - 1].opportunities > analytics.timeSeriesData[0].opportunities ? 'up' : 'down') : 'stable'
    };
  }, [analytics]);

  return {
    analytics: processedData,
    isLoading,
    error,
    refetch,
    refreshCount
  };
}

export function useNetworkStats(demoMode = false) {
  const { data: networkStats, isLoading } = useQuery({
    queryKey: ['network-stats'],
    queryFn: () => apiService.getNetworkStats(),
    refetchInterval: 30000
  });

  return {
    networkStats,
    isLoading
  };
}