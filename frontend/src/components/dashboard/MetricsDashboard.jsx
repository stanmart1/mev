import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Clock, Filter } from 'lucide-react';
import { LineChartComponent, BarChartComponent, PieChartComponent } from './Chart';
import StatCard from './StatCard';
import Card, { CardHeader, CardTitle, CardContent } from '../common/Card';
import Button from '../common/Button';
import apiService from '../../services/api';
import { formatSOL, formatPercentage } from '../../utils/formatters';

const timeRanges = [
  { value: '1h', label: '1H' },
  { value: '6h', label: '6H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' }
];

const chartTypes = [
  { value: 'opportunities', label: 'Opportunities', icon: BarChart3 },
  { value: 'profit', label: 'Profit', icon: TrendingUp },
  { value: 'success', label: 'Success Rate', icon: Clock }
];

export default function MetricsDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedChart, setSelectedChart] = useState('opportunities');

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', selectedTimeRange],
    queryFn: () => apiService.getAnalytics({ timeframe: selectedTimeRange }),
    refetchInterval: 60000
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['mev-stats', selectedTimeRange],
    queryFn: () => apiService.getMevStats(selectedTimeRange),
    refetchInterval: 30000
  });

  const analyticsData = analytics?.data || {};
  const statsData = stats?.data?.summary || {};

  const renderChart = () => {
    switch (selectedChart) {
      case 'opportunities':
        return (
          <LineChartComponent
            data={analyticsData.profitOverTime || []}
            dataKey="opportunities"
            xAxisKey="time"
            title="Opportunities Over Time"
            color="#3B82F6"
          />
        );
      case 'profit':
        return (
          <BarChartComponent
            data={analyticsData.profitDistribution || []}
            dataKey="profit"
            xAxisKey="range"
            title="Profit Distribution"
            color="#10B981"
          />
        );
      case 'success':
        return (
          <LineChartComponent
            data={analyticsData.profitOverTime || []}
            dataKey="profit"
            xAxisKey="time"
            title="Success Rate Trends"
            color="#F59E0B"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Performance Metrics
        </h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Time Range:</span>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedTimeRange(range.value)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  selectedTimeRange === range.value
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Opportunities"
          value={statsData.totalCalculations || '0'}
          change="+12.5%"
          changeType="positive"
          icon={BarChart3}
          loading={statsLoading}
        />
        <StatCard
          title="Estimated Profit"
          value={formatSOL(statsData.averageExpectedProfit || 0)}
          change="+8.2%"
          changeType="positive"
          icon={TrendingUp}
          loading={statsLoading}
        />
        <StatCard
          title="Success Rate"
          value={formatPercentage(statsData.profitablePercentage || 0)}
          change="-2.1%"
          changeType="negative"
          icon={Clock}
          loading={statsLoading}
        />
        <StatCard
          title="Max Profit"
          value={formatSOL(statsData.maxProfit || 0)}
          change="+15.3%"
          changeType="positive"
          icon={TrendingUp}
          loading={statsLoading}
        />
      </div>

      {/* Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Performance Analytics</CardTitle>
                <div className="flex space-x-1">
                  {chartTypes.map((chart) => {
                    const Icon = chart.icon;
                    return (
                      <button
                        key={chart.value}
                        onClick={() => setSelectedChart(chart.value)}
                        className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-md transition-colors ${
                          selectedChart === chart.value
                            ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{chart.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                renderChart()
              )}
            </CardContent>
          </Card>
        </div>

        {/* Opportunity Types Breakdown */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Opportunity Types</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <PieChartComponent
                  data={analyticsData.opportunityTypes || []}
                  dataKey="value"
                  nameKey="name"
                  title=""
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Profit Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium">Average Profit</span>
                <span className="text-green-600 font-semibold">
                  {formatSOL(statsData.averageExpectedProfit || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm font-medium">Total Volume</span>
                <span className="text-blue-600 font-semibold">
                  {formatSOL((statsData.totalCalculations || 0) * (statsData.averageExpectedProfit || 0))}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span className="text-sm font-medium">Profitable Rate</span>
                <span className="text-yellow-600 font-semibold">
                  {formatPercentage(statsData.profitablePercentage || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium">Low Risk</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{width: '65%'}}></div>
                  </div>
                  <span className="text-sm font-semibold">65%</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span className="text-sm font-medium">Medium Risk</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{width: '25%'}}></div>
                  </div>
                  <span className="text-sm font-semibold">25%</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm font-medium">High Risk</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full" style={{width: '10%'}}></div>
                  </div>
                  <span className="text-sm font-semibold">10%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}