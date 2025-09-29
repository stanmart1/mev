import React, { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/useWebSocket';
import { TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';

interface HistoricalDataPoint {
  epoch: number;
  timestamp: string;
  mevEarnings: number;
  jitoEarnings: number;
  networkAverage: number;
  validatorRank: number;
  totalValidators: number;
  efficiency: number;
  blocks: number;
  skippedSlots: number;
}

interface PerformanceMetrics {
  totalEarnings: number;
  averageEarnings: number;
  bestEpoch: number;
  worstEpoch: number;
  consistency: number;
  growth: number;
  jitoContribution: number;
}

interface HistoricalPerformanceChartProps {
  validatorPubkey: string;
  className?: string;
}

export const HistoricalPerformanceChart: React.FC<HistoricalPerformanceChartProps> = ({
  validatorPubkey,
  className = ''
}) => {
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, subscribe, send } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      const unsubscribe = subscribe('historical_performance', (data: any) => {
        if (data.validatorPubkey === validatorPubkey) {
          setHistoricalData(data.historical);
          calculateMetrics(data.historical);
          setLoading(false);
        }
      });
      return unsubscribe;
    }
  }, [isConnected, validatorPubkey, subscribe]);

  const calculateMetrics = (data: HistoricalDataPoint[]): void => {
    if (data.length === 0) return;

    const totalEarnings = data.reduce((sum, point) => sum + point.mevEarnings, 0);
    const averageEarnings = totalEarnings / data.length;
    const bestEpoch = Math.max(...data.map(point => point.mevEarnings));
    const worstEpoch = Math.min(...data.map(point => point.mevEarnings));
    const jitoContribution = data.reduce((sum, point) => sum + point.jitoEarnings, 0) / totalEarnings * 100;

    // Calculate consistency (inverse coefficient of variation)
    const variance = data.reduce((sum, point) => sum + Math.pow(point.mevEarnings - averageEarnings, 2), 0) / data.length;
    const standardDeviation = Math.sqrt(variance);
    const consistency = averageEarnings > 0 ? (1 - (standardDeviation / averageEarnings)) * 100 : 0;

    // Calculate growth rate
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, point) => sum + point.mevEarnings, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, point) => sum + point.mevEarnings, 0) / secondHalf.length;
    const growth = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    setMetrics({
      totalEarnings,
      averageEarnings,
      bestEpoch,
      worstEpoch,
      consistency: Math.max(0, Math.min(100, consistency)),
      growth,
      jitoContribution
    });
  };

  const fetchHistoricalData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/validators/${validatorPubkey}/historical?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch historical data');
      
      const data = await response.json();
      setHistoricalData(data.historical);
      calculateMetrics(data.historical);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoricalData();
  }, [validatorPubkey, timeRange]);

  useEffect(() => {
    if (isConnected) {
      send({
        action: 'subscribe',
        channel: 'historical_performance',
        validatorPubkey,
        range: timeRange
      });
    }
  }, [isConnected, validatorPubkey, timeRange, send]);

  const formatEarnings = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M SOL`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K SOL`;
    return `${value.toFixed(4)} SOL`;
  };

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border">
          <p className="text-sm font-medium mb-2">Epoch {data.epoch}</p>
          <p className="text-xs text-gray-500 mb-2">{formatDate(data.timestamp)}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-blue-500">MEV Earnings: </span>
              {formatEarnings(data.mevEarnings)}
            </p>
            <p className="text-sm">
              <span className="text-purple-500">Jito Earnings: </span>
              {formatEarnings(data.jitoEarnings)}
            </p>
            <p className="text-sm">
              <span className="text-gray-500">Network Avg: </span>
              {formatEarnings(data.networkAverage)}
            </p>
            <p className="text-sm">
              <span className="text-orange-500">Rank: </span>
              #{data.validatorRank} of {data.totalValidators}
            </p>
            <p className="text-sm">
              <span className="text-green-500">Efficiency: </span>
              {data.efficiency.toFixed(1)}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} border-red-200`}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Failed to load historical data</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchHistoricalData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Historical Performance
            </CardTitle>
            <CardDescription>
              MEV earnings and performance trends over time
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7D</SelectItem>
                <SelectItem value="30d">30D</SelectItem>
                <SelectItem value="90d">90D</SelectItem>
                <SelectItem value="1y">1Y</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {formatEarnings(metrics.totalEarnings)}
              </p>
              <p className="text-sm text-gray-500">Total Earnings</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatEarnings(metrics.averageEarnings)}
              </p>
              <p className="text-sm text-gray-500">Average/Epoch</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                {metrics.growth >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <p className={`text-2xl font-bold ${metrics.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.growth > 0 ? '+' : ''}{metrics.growth.toFixed(1)}%
                </p>
              </div>
              <p className="text-sm text-gray-500">Growth</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {metrics.jitoContribution.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">Jito Share</p>
            </div>
          </div>
        )}

        <Tabs value={chartType} onValueChange={(value: any) => setChartType(value)} className="mb-4">
          <TabsList>
            <TabsTrigger value="area">Area Chart</TabsTrigger>
            <TabsTrigger value="line">Line Chart</TabsTrigger>
          </TabsList>
          <TabsContent value={chartType} className="mt-4">
            <ResponsiveContainer width="100%" height={400}>
              {chartType === 'area' ? (
                <AreaChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="epoch" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `E${value}`}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatEarnings}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="mevEarnings"
                    name="MEV Earnings"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="jitoEarnings"
                    name="Jito Earnings"
                    stackId="1"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                  />
                  <Line
                    type="monotone"
                    dataKey="networkAverage"
                    name="Network Average"
                    stroke="#6b7280"
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </AreaChart>
              ) : (
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="epoch" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `E${value}`}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatEarnings}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="mevEarnings"
                    name="MEV Earnings"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="jitoEarnings"
                    name="Jito Earnings"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="networkAverage"
                    name="Network Average"
                    stroke="#6b7280"
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>

        {metrics && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {historicalData.length} epochs
            </Badge>
            <Badge variant="outline">
              Consistency: {metrics.consistency.toFixed(1)}%
            </Badge>
            <Badge variant="outline">
              Best: {formatEarnings(metrics.bestEpoch)}
            </Badge>
            <Badge variant="outline">
              Worst: {formatEarnings(metrics.worstEpoch)}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};