import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, TrendingUp, Users, Activity, BarChart3, AlertCircle, Clock } from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import OpportunityCard from '../../components/mev/OpportunityCard';
import LiveActivityFeed from '../../components/activity/LiveActivityFeed';
import { LineChartComponent, BarChartComponent, PieChartComponent } from '../../components/dashboard/Chart';
import StatsDashboard from '../../components/analytics/StatsDashboard';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useMevOpportunities } from '../../hooks/useWebSocket';
import { useMEV, useMEVStats } from '../../hooks/useMEV';
import apiService from '../../services/api';
import { formatTimeAgo, formatSOL } from '../../utils/formatters';

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState('24h');
  const [selectedChart, setSelectedChart] = useState('opportunities');
  const [simulationResult, setSimulationResult] = useState(null);
  const liveOpportunities = useMevOpportunities();
  const { opportunities, isLoadingOpportunities } = useMEV();
  const { stats: mevStats } = useMEVStats();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['mev-stats', timeframe],
    queryFn: () => apiService.getMevStats(timeframe),
    refetchInterval: 30000,
  });

  const { data: recentOpportunities, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['mev-opportunities', timeframe],
    queryFn: () => apiService.getMevOpportunities({ 
      limit: 10, 
      timeframe 
    }),
    refetchInterval: 10000,
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics', timeframe],
    queryFn: () => apiService.getAnalytics({ timeframe }),
    refetchInterval: 60000,
  });

  // Mock activity data for demo
  const [activities] = useState([
    {
      type: 'mev_extraction',
      description: 'Arbitrage executed on SOL/USDC',
      timestamp: formatTimeAgo(Date.now() - 300000),
      profit: '0.125'
    },
    {
      type: 'bundle_submission',
      description: 'Bundle submitted to Jito',
      timestamp: formatTimeAgo(Date.now() - 600000)
    },
    {
      type: 'validator_update',
      description: 'Validator performance updated',
      timestamp: formatTimeAgo(Date.now() - 900000)
    }
  ]);

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState(null);

  const handleSimulateBundle = async (opportunity) => {
    try {
      const result = await apiService.simulateBundle([opportunity]);
      console.log('Bundle simulation result:', result);
      setSimulationResult(result.data || result);
      setExecutionStatus(null);
    } catch (error) {
      console.error('Bundle simulation failed:', error);
    }
  };

  const handleExecuteBundle = async () => {
    if (!simulationResult) return;
    
    setIsExecuting(true);
    try {
      const result = await apiService.executeBundle({
        opportunities: simulationResult.breakdown?.map(tx => ({
          opportunity_type: tx.type,
          estimated_profit_sol: tx.estimatedProfit,
          estimatedGas: tx.gasUsed
        })) || []
      });
      
      setExecutionStatus({
        status: 'submitted',
        bundleId: result.data.bundleId,
        message: 'Bundle submitted successfully'
      });
      
      // Poll for status
      pollBundleStatus(result.data.bundleId);
    } catch (error) {
      console.error('Bundle execution failed:', error);
      setExecutionStatus({
        status: 'failed',
        message: error.response?.data?.error || 'Execution failed'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const pollBundleStatus = async (bundleId) => {
    const maxAttempts = 10;
    let attempts = 0;
    
    const poll = setInterval(async () => {
      attempts++;
      try {
        const status = await apiService.getBundleStatus(bundleId);
        setExecutionStatus({
          status: status.data.status,
          bundleId,
          txHash: status.data.txHash,
          message: `Bundle ${status.data.status}`
        });
        
        if (status.data.status === 'confirmed' || status.data.status === 'failed' || attempts >= maxAttempts) {
          clearInterval(poll);
        }
      } catch (error) {
        console.error('Status poll error:', error);
        if (attempts >= maxAttempts) clearInterval(poll);
      }
    }, 3000);
  };

  const statsData = stats?.data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            MEV Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time MEV opportunities and validator performance
          </p>
        </div>
        <div className="flex space-x-2">
          {['1h', '6h', '24h', '7d'].map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`
                px-3 py-1 text-sm font-medium rounded-md transition-colors
                ${timeframe === period
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }
              `}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Comprehensive Statistics Dashboard */}
      <StatsDashboard />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Opportunities"
          value={statsData.totalCalculations || mevStats?.totalOpportunities || '0'}
          change="+12.5%"
          changeType="positive"
          icon={Zap}
          loading={statsLoading}
        />
        <StatCard
          title="Estimated Profit"
          value={formatSOL(statsData.averageExpectedProfit || mevStats?.totalProfit || 0)}
          change="+8.2%"
          changeType="positive"
          icon={TrendingUp}
          loading={statsLoading}
        />
        <StatCard
          title="Success Rate"
          value={`${(statsData.profitablePercentage || (mevStats?.successRate ? mevStats.successRate * 100 : 0) || 0).toFixed(1)}%`}
          change="-2.1%"
          changeType="negative"
          icon={Activity}
          loading={statsLoading}
        />
        <StatCard
          title="Active Validators"
          value={mevStats?.activeValidators || '1,247'}
          change="+5.3%"
          changeType="positive"
          icon={Users}
          loading={statsLoading}
        />
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Performance Analytics</CardTitle>
                <div className="flex space-x-2">
                  {['opportunities', 'profit', 'types'].map((chart) => (
                    <button
                      key={chart}
                      onClick={() => setSelectedChart(chart)}
                      className={`px-3 py-1 text-sm rounded-md ${
                        selectedChart === chart
                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                      }`}
                    >
                      {chart.charAt(0).toUpperCase() + chart.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedChart === 'opportunities' && (
                <LineChartComponent
                  data={analytics?.data?.profitOverTime || []}
                  dataKey="opportunities"
                  title="Opportunities Over Time"
                  color="#3B82F6"
                />
              )}
              {selectedChart === 'profit' && (
                <BarChartComponent
                  data={analytics?.data?.profitDistribution || []}
                  dataKey="profit"
                  title="Profit Distribution"
                  color="#10B981"
                />
              )}
              {selectedChart === 'types' && (
                <PieChartComponent
                  data={analytics?.data?.opportunityTypes || [
                    { name: 'Arbitrage', value: 45 },
                    { name: 'Liquidation', value: 30 },
                    { name: 'Sandwich', value: 25 }
                  ]}
                  dataKey="value"
                  title="Opportunity Types Breakdown"
                />
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <LiveActivityFeed />
        </div>
      </div>

      {/* Live Opportunities Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live MEV Opportunities
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Real-time feed ({liveOpportunities.length} active)
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                Auto-refresh: 5s
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {liveOpportunities.length > 0 ? (
                liveOpportunities.slice(0, 5).map((opportunity, index) => (
                  <div key={`live-${index}`} className="animate-fadeIn">
                    <OpportunityCard
                      opportunity={opportunity}
                      onSimulate={handleSimulateBundle}
                      compact
                    />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Scanning for opportunities...</p>
                  <div className="flex items-center justify-center mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm">Monitoring DEXs</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Opportunities</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Historical data from the last {timeframe}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {opportunitiesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : recentOpportunities?.data?.opportunities?.length > 0 ? (
                recentOpportunities.data.opportunities.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    onSimulate={handleSimulateBundle}
                    compact
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent opportunities</p>
                  <p className="text-sm">Data will appear as opportunities are detected</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Status & DEX Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Network Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Solana Network</span>
                </div>
                <span className="text-sm text-green-600 dark:text-green-400">Healthy</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">MEV Detection</span>
                </div>
                <span className="text-sm text-blue-600 dark:text-blue-400">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium">Jito Integration</span>
                </div>
                <span className="text-sm text-yellow-600 dark:text-yellow-400">Connected</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {stats?.data?.dex_breakdown ? (
          <Card>
            <CardHeader>
              <CardTitle>DEX Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.data.dex_breakdown.map((dex) => (
                  <div key={dex.primary_dex} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {dex.primary_dex}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {dex.opportunity_count} opportunities
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">
                        {formatSOL(dex.total_profit || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button className="w-full p-3 text-left bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">View All Opportunities</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Browse complete MEV feed</p>
                    </div>
                  </div>
                </button>
                <button className="w-full p-3 text-left bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Validator Rankings</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Compare validator performance</p>
                    </div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bundle Simulation Modal */}
      {simulationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSimulationResult(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bundle Simulation Results</h3>
              <button onClick={() => setSimulationResult(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Expected Profit</p>
                  <p className="text-2xl font-bold text-green-600">{simulationResult.expectedProfit?.toFixed(4)} SOL</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Success Probability</p>
                  <p className="text-2xl font-bold text-blue-600">{simulationResult.successProbability?.toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gas Estimate</p>
                  <p className="text-lg font-semibold">{simulationResult.totalGas?.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Execution Time</p>
                  <p className="text-lg font-semibold">{(simulationResult.estimatedExecutionTime / 1000).toFixed(1)}s</p>
                </div>
              </div>
              
              {simulationResult.riskAssessment && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm font-semibold mb-2">Risk Assessment</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Slippage: </span>
                      <span className="font-medium">{simulationResult.riskAssessment.slippageRisk}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Competition: </span>
                      <span className="font-medium">{simulationResult.riskAssessment.competitionRisk}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Gas: </span>
                      <span className="font-medium">{simulationResult.riskAssessment.gasRisk}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {executionStatus && (
                <div className={`p-4 rounded-lg mb-4 ${
                  executionStatus.status === 'confirmed' ? 'bg-green-50 dark:bg-green-900/20' :
                  executionStatus.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20' :
                  'bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  <p className="text-sm font-semibold mb-1">
                    {executionStatus.status === 'confirmed' ? '✓ ' : executionStatus.status === 'failed' ? '✗ ' : '⏳ '}
                    {executionStatus.message}
                  </p>
                  {executionStatus.bundleId && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">Bundle ID: {executionStatus.bundleId}</p>
                  )}
                  {executionStatus.txHash && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">TX: {executionStatus.txHash}</p>
                  )}
                </div>
              )}
              
              <div className="flex space-x-3">
                <Button 
                  variant="primary" 
                  className="flex-1" 
                  onClick={handleExecuteBundle}
                  disabled={isExecuting || executionStatus?.status === 'confirmed'}
                >
                  {isExecuting ? 'Executing...' : executionStatus?.status === 'confirmed' ? 'Executed' : 'Execute Bundle'}
                </Button>
                <Button variant="ghost" onClick={() => setSimulationResult(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}