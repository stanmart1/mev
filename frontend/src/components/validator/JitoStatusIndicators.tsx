import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';

interface JitoMetrics {
  isEnabled: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'connecting';
  mevEarnings: number;
  totalEarnings: number;
  jitoContribution: number;
  auctionWins: number;
  auctionParticipation: number;
  averageBid: number;
  lastAuctionWin: string | null;
  bundles: {
    submitted: number;
    accepted: number;
    rejected: number;
    revenue: number;
  };
  performance: {
    latency: number;
    successRate: number;
    uptime: number;
    blockSuccess: number;
  };
  ranking: {
    position: number;
    totalValidators: number;
    percentile: number;
  };
  tips: {
    received: number;
    missed: number;
    averageTip: number;
  };
}

interface JitoStatusIndicatorsProps {
  validatorPubkey: string;
  className?: string;
}

export const JitoStatusIndicators: React.FC<JitoStatusIndicatorsProps> = ({
  validatorPubkey,
  className = ''
}) => {
  const [jitoMetrics, setJitoMetrics] = useState<JitoMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { isConnected, subscribe, send } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      const unsubscribe = subscribe('jito_status', (data: any) => {
        if (data.validatorPubkey === validatorPubkey) {
          setJitoMetrics(data.metrics);
          setLastUpdated(new Date());
          setLoading(false);
        }
      });
      return unsubscribe;
    }
  }, [isConnected, validatorPubkey, subscribe]);

  const fetchJitoMetrics = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/validators/${validatorPubkey}/jito-status`);
      if (!response.ok) throw new Error('Failed to fetch Jito metrics');
      
      const data = await response.json();
      setJitoMetrics(data.metrics);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJitoMetrics();
  }, [validatorPubkey]);

  useEffect(() => {
    if (isConnected) {
      send({
        action: 'subscribe',
        channel: 'jito_status',
        validatorPubkey
      });
    }
  }, [isConnected, validatorPubkey, send]);

  const formatEarnings = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M SOL`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K SOL`;
    return `${value.toFixed(4)} SOL`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const getConnectionStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConnectionStatusBadge = (status: string) => {
    const statusConfig = {
      connected: { label: 'Connected', color: 'bg-green-500' },
      connecting: { label: 'Connecting', color: 'bg-yellow-500' },
      error: { label: 'Error', color: 'bg-red-500' },
      disconnected: { label: 'Disconnected', color: 'bg-gray-500' }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceProgress = (value: number, max: number = 100) => {
    return Math.min((value / max) * 100, 100);
  };

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} border-red-200`}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Failed to load Jito status</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchJitoMetrics} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!jitoMetrics) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No Jito metrics available</p>
        </CardContent>
      </Card>
    );
  }

  const statusBadge = getConnectionStatusBadge(jitoMetrics.connectionStatus);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Jito MEV Status
            </CardTitle>
            <CardDescription>
              Real-time Jito MEV auction and bundle performance
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getConnectionStatusIcon(jitoMetrics.connectionStatus)}
            <Badge variant="outline" className={`${statusBadge.color} text-white border-0`}>
              {statusBadge.label}
            </Badge>
            <Button onClick={fetchJitoMetrics} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Jito Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              {jitoMetrics.isEnabled ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <p className="text-sm font-medium">
              {jitoMetrics.isEnabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-xs text-gray-600">Jito MEV</p>
          </div>
          
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <DollarSign className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-600">
              {formatEarnings(jitoMetrics.mevEarnings)}
            </p>
            <p className="text-xs text-gray-600">MEV Earnings</p>
          </div>

          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">
              {formatPercentage(jitoMetrics.jitoContribution)}
            </p>
            <p className="text-xs text-gray-600">MEV Share</p>
          </div>

          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <Activity className="h-5 w-5 text-orange-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-orange-600">
              #{jitoMetrics.ranking.position}
            </p>
            <p className="text-xs text-gray-600">MEV Rank</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-6">
          {/* Auction Performance */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Auction Performance
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Win Rate</span>
                  <span className={`text-sm font-medium ${getPerformanceColor(jitoMetrics.performance.successRate, { good: 80, warning: 60 })}`}>
                    {formatPercentage(jitoMetrics.performance.successRate)}
                  </span>
                </div>
                <Progress 
                  value={getPerformanceProgress(jitoMetrics.performance.successRate)} 
                  className="h-2"
                />
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Participation</span>
                  <span className="text-sm font-medium">
                    {jitoMetrics.auctionWins}/{jitoMetrics.auctionParticipation}
                  </span>
                </div>
                <Progress 
                  value={getPerformanceProgress(jitoMetrics.auctionWins, jitoMetrics.auctionParticipation)} 
                  className="h-2"
                />
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Avg Bid</span>
                  <span className="text-sm font-medium">
                    {formatEarnings(jitoMetrics.averageBid)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Last win: {jitoMetrics.lastAuctionWin ? 
                    new Date(jitoMetrics.lastAuctionWin).toLocaleTimeString() : 
                    'Never'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Bundle Statistics */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Bundle Statistics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {jitoMetrics.bundles.submitted.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600">Submitted</p>
              </div>
              
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">
                  {jitoMetrics.bundles.accepted.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600">Accepted</p>
              </div>
              
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">
                  {jitoMetrics.bundles.rejected.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600">Rejected</p>
              </div>
              
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {formatEarnings(jitoMetrics.bundles.revenue)}
                </p>
                <p className="text-xs text-gray-600">Revenue</p>
              </div>
            </div>
          </div>

          {/* Tips and Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Tips Performance
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm">Tips Received</span>
                  <span className="font-medium">{jitoMetrics.tips.received.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm">Tips Missed</span>
                  <span className="font-medium text-red-600">{jitoMetrics.tips.missed.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm">Average Tip</span>
                  <span className="font-medium">{formatEarnings(jitoMetrics.tips.averageTip)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                System Performance
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Latency</span>
                    <span className={`text-sm font-medium ${getPerformanceColor(100 - jitoMetrics.performance.latency, { good: 95, warning: 90 })}`}>
                      {jitoMetrics.performance.latency.toFixed(0)}ms
                    </span>
                  </div>
                  <Progress 
                    value={Math.max(0, 100 - jitoMetrics.performance.latency)} 
                    className="h-2"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Uptime</span>
                    <span className={`text-sm font-medium ${getPerformanceColor(jitoMetrics.performance.uptime, { good: 99, warning: 95 })}`}>
                      {formatPercentage(jitoMetrics.performance.uptime)}
                    </span>
                  </div>
                  <Progress 
                    value={getPerformanceProgress(jitoMetrics.performance.uptime)} 
                    className="h-2"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Block Success</span>
                    <span className={`text-sm font-medium ${getPerformanceColor(jitoMetrics.performance.blockSuccess, { good: 95, warning: 90 })}`}>
                      {formatPercentage(jitoMetrics.performance.blockSuccess)}
                    </span>
                  </div>
                  <Progress 
                    value={getPerformanceProgress(jitoMetrics.performance.blockSuccess)} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="mt-6 text-xs text-gray-500 text-center">
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};