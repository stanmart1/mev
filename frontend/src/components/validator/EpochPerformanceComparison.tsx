import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Users, 
  Activity,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface EpochData {
  epoch: number;
  validatorEarnings: number;
  networkAverage: number;
  networkMedian: number;
  validatorRank: number;
  totalValidators: number;
  percentile: number;
  blocksProposed: number;
  slotsAssigned: number;
  efficiency: number;
  jitoEarnings: number;
  jitoEnabled: boolean;
  timestamp: string;
}

interface NetworkStats {
  totalValidators: number;
  activeValidators: number;
  topPerformer: number;
  avgEarnings: number;
  medianEarnings: number;
  totalMevEarnings: number;
}

interface EpochPerformanceComparisonProps {
  validatorPubkey: string;
  className?: string;
}

export const EpochPerformanceComparison: React.FC<EpochPerformanceComparisonProps> = ({
  validatorPubkey,
  className = ''
}) => {
  const [epochData, setEpochData] = useState<EpochData[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);

  const { isConnected, subscribe, send } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      const unsubscribe = subscribe('epoch_performance', (data: any) => {
        if (data.validatorPubkey === validatorPubkey) {
          setEpochData(data.epochs);
          setNetworkStats(data.networkStats);
          setLoading(false);
        }
      });
      return unsubscribe;
    }
  }, [isConnected, validatorPubkey, subscribe]);

  const fetchEpochData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/validators/${validatorPubkey}/epoch-performance?limit=20`);
      if (!response.ok) throw new Error('Failed to fetch epoch performance data');
      
      const data = await response.json();
      setEpochData(data.epochs);
      setNetworkStats(data.networkStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpochData();
  }, [validatorPubkey]);

  useEffect(() => {
    if (isConnected) {
      send({
        action: 'subscribe',
        channel: 'epoch_performance',
        validatorPubkey
      });
    }
  }, [isConnected, validatorPubkey, send]);

  const formatEarnings = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value.toFixed(4);
  };

  const getPerformanceColor = (earnings: number, networkAverage: number): string => {
    if (earnings > networkAverage * 1.5) return '#10b981'; // green-500
    if (earnings > networkAverage * 1.2) return '#3b82f6'; // blue-500
    if (earnings > networkAverage) return '#f59e0b'; // amber-500
    if (earnings > networkAverage * 0.8) return '#ef4444'; // red-500
    return '#6b7280'; // gray-500
  };

  const getPerformanceBadge = (earnings: number, networkAverage: number) => {
    if (earnings > networkAverage * 1.5) return { label: 'Excellent', color: 'bg-green-500' };
    if (earnings > networkAverage * 1.2) return { label: 'Above Avg', color: 'bg-blue-500' };
    if (earnings > networkAverage) return { label: 'Good', color: 'bg-yellow-500' };
    if (earnings > networkAverage * 0.8) return { label: 'Below Avg', color: 'bg-orange-500' };
    return { label: 'Poor', color: 'bg-red-500' };
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const badge = getPerformanceBadge(data.validatorEarnings, data.networkAverage);
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border max-w-xs">
          <p className="text-sm font-medium mb-2">Epoch {data.epoch}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600">Validator:</span>
              <span className="text-sm font-medium">{formatEarnings(data.validatorEarnings)} SOL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Network Avg:</span>
              <span className="text-sm">{formatEarnings(data.networkAverage)} SOL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Network Median:</span>
              <span className="text-sm">{formatEarnings(data.networkMedian)} SOL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-600">Rank:</span>
              <span className="text-sm">#{data.validatorRank} of {data.totalValidators}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-purple-600">Percentile:</span>
              <span className="text-sm">{data.percentile.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600">Efficiency:</span>
              <span className="text-sm">{data.efficiency.toFixed(1)}%</span>
            </div>
            {data.jitoEnabled && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-600">Jito MEV:</span>
                <span className="text-sm">{formatEarnings(data.jitoEarnings)} SOL</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${badge.color}`}></div>
              <span className="text-xs font-medium">{badge.label}</span>
            </div>
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
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Failed to load epoch data</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchEpochData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = epochData.slice(0, 10).reverse(); // Show last 10 epochs
  const latestEpoch = epochData[0];
  const avgPerformance = epochData.reduce((sum, epoch) => sum + (epoch.validatorEarnings / epoch.networkAverage), 0) / epochData.length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Epoch Performance Comparison
            </CardTitle>
            <CardDescription>
              Performance vs network averages over recent epochs
            </CardDescription>
          </div>
          <Button onClick={fetchEpochData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Performance Summary */}
        {networkStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Award className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-blue-600">
                #{latestEpoch?.validatorRank || 'N/A'}
              </p>
              <p className="text-xs text-gray-600">Current Rank</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-600">
                {avgPerformance.toFixed(2)}x
              </p>
              <p className="text-xs text-gray-600">Avg Performance</p>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Users className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-purple-600">
                {latestEpoch?.percentile.toFixed(1) || 'N/A'}%
              </p>
              <p className="text-xs text-gray-600">Percentile</p>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Activity className="h-5 w-5 text-orange-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-orange-600">
                {latestEpoch?.efficiency.toFixed(1) || 'N/A'}%
              </p>
              <p className="text-xs text-gray-600">Efficiency</p>
            </div>
          </div>
        )}

        {/* Performance Chart */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3">Recent Epoch Performance</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
              <Bar
                dataKey="validatorEarnings"
                name="Validator Earnings"
                radius={[2, 2, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getPerformanceColor(entry.validatorEarnings, entry.networkAverage)} 
                  />
                ))}
              </Bar>
              <Bar
                dataKey="networkAverage"
                name="Network Average"
                fill="#6b7280"
                opacity={0.6}
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="networkMedian"
                name="Network Median"
                fill="#9ca3af"
                opacity={0.4}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Badges */}
        <div className="flex flex-wrap gap-2">
          {epochData.slice(0, 5).map((epoch) => {
            const badge = getPerformanceBadge(epoch.validatorEarnings, epoch.networkAverage);
            return (
              <Badge key={epoch.epoch} variant="outline" className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${badge.color}`}></div>
                E{epoch.epoch}: {badge.label}
              </Badge>
            );
          })}
        </div>

        {/* Network Statistics */}
        {networkStats && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h5 className="text-sm font-medium mb-3">Network Statistics</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Validators:</span>
                <span className="font-medium ml-2">{networkStats.totalValidators.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">Active Validators:</span>
                <span className="font-medium ml-2">{networkStats.activeValidators.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">Top Performer:</span>
                <span className="font-medium ml-2">{formatEarnings(networkStats.topPerformer)} SOL</span>
              </div>
              <div>
                <span className="text-gray-600">Network Avg:</span>
                <span className="font-medium ml-2">{formatEarnings(networkStats.avgEarnings)} SOL</span>
              </div>
              <div>
                <span className="text-gray-600">Network Median:</span>
                <span className="font-medium ml-2">{formatEarnings(networkStats.medianEarnings)} SOL</span>
              </div>
              <div>
                <span className="text-gray-600">Total MEV:</span>
                <span className="font-medium ml-2">{formatEarnings(networkStats.totalMevEarnings)} SOL</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};