import { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Users, Wifi, Clock } from 'lucide-react';
import { useAnalytics, useNetworkStats } from '../../hooks/useAnalytics';
import Card from '../common/Card';
import Button from '../common/Button';

const timeRanges = [
  { label: '1H', value: '1h' },
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' }
];

const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444'];

export default function StatsDashboard({ demoMode = true }) {
  const [timeRange, setTimeRange] = useState('24h');
  const { analytics, isLoading } = useAnalytics(timeRange, demoMode);
  const { networkStats } = useNetworkStats(demoMode);

  const chartData = analytics?.timeSeriesData || [];

  const opportunityTypes = analytics?.opportunityTypes || [];
  const profitDistribution = analytics?.profitDistribution || [];

  const keyMetrics = [
    {
      title: 'Total Opportunities',
      value: analytics?.keyMetrics?.totalOpportunities?.toLocaleString() || '0',
      change: '+12.5%',
      icon: Activity,
      color: 'text-blue-600'
    },
    {
      title: 'Estimated Profit',
      value: `${analytics?.keyMetrics?.totalProfit?.toFixed(1) || '0.0'} SOL`,
      change: '+8.2%',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Active Validators',
      value: analytics?.keyMetrics?.activeValidators?.toLocaleString() || '0',
      change: '+2.1%',
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'Network Status',
      value: analytics?.keyMetrics?.networkHealth || 'Unknown',
      change: '99.9% uptime',
      icon: Wifi,
      color: 'text-green-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Analytics Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {timeRanges.map((range) => (
              <Button
                key={range.value}
                variant={timeRange === range.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range.value)}
                className="px-3 py-1 text-sm"
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{metric.title}</p>
                  <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                  <p className="text-xs text-green-600">{metric.change}</p>
                </div>
                <Icon className={`w-8 h-8 ${metric.color}`} />
              </div>
            </Card>
          );
        })}
      </div>



      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Top Performing DEXs</h3>
          <div className="space-y-3">
            {[
              { name: 'Raydium', profit: '89.2 SOL', share: '45%' },
              { name: 'Orca', profit: '67.8 SOL', share: '32%' },
              { name: 'Serum', profit: '34.1 SOL', share: '18%' },
              { name: 'Jupiter', profit: '12.4 SOL', share: '5%' }
            ].map((dex, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{dex.name}</p>
                  <p className="text-sm text-gray-500">{dex.profit}</p>
                </div>
                <span className="text-sm font-medium text-blue-600">{dex.share}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Risk Analysis</h3>
          <div className="space-y-3">
            {[
              { level: 'Low Risk', count: 892, color: 'bg-green-500' },
              { level: 'Medium Risk', count: 267, color: 'bg-yellow-500' },
              { level: 'High Risk', count: 88, color: 'bg-red-500' }
            ].map((risk, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${risk.color}`}></div>
                  <span>{risk.level}</span>
                </div>
                <span className="font-medium">{risk.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Network Health</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>TPS</span>
              <span className="font-medium text-green-600">{networkStats?.tps?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Block Time</span>
              <span className="font-medium">{networkStats?.blockTime || '0.0'}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Validators</span>
              <span className="font-medium">{networkStats?.validators?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Stake</span>
              <span className="font-medium">{networkStats?.totalStake || '0'}M SOL</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}