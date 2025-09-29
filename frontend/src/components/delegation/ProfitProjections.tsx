import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  TrendingUp,
  DollarSign,
  Calculator,
  Target,
  Calendar,
  PieChart as PieChartIcon,
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface ProfitProjection {
  timeframe: string;
  principal: number;
  stakingRewards: number;
  mevRewards: number;
  totalRewards: number;
  totalValue: number;
  apy: number;
  cumulativeReturns: number;
}

interface ValidatorMetrics {
  apy: number;
  mevApy: number;
  commission: number;
  averageMevEarnings: number;
  consistencyScore: number;
  riskScore: number;
}

interface ProfitProjectionsProps {
  validatorPubkey: string;
  validatorName?: string;
  className?: string;
}

export const ProfitProjections: React.FC<ProfitProjectionsProps> = ({
  validatorPubkey,
  validatorName,
  className = ''
}) => {
  const [delegationAmount, setDelegationAmount] = useState(1000);
  const [timeHorizon, setTimeHorizon] = useState(12); // months
  const [confidenceLevel, setConfidenceLevel] = useState(70);
  const [projections, setProjections] = useState<ProfitProjection[]>([]);
  const [validatorMetrics, setValidatorMetrics] = useState<ValidatorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, subscribe, send } = useWebSocket();

  const calculateProjections = useMemo(() => {
    if (!validatorMetrics) return [];

    const projections: ProfitProjection[] = [];
    const monthlyStakingRate = validatorMetrics.apy / 12 / 100;
    const monthlyMevRate = validatorMetrics.mevApy / 12 / 100;
    
    // Apply confidence level adjustment
    const confidenceAdjustment = confidenceLevel / 100;
    const adjustedStakingRate = monthlyStakingRate * confidenceAdjustment;
    const adjustedMevRate = monthlyMevRate * confidenceAdjustment;

    let currentPrincipal = delegationAmount;
    let cumulativeStaking = 0;
    let cumulativeMev = 0;

    for (let month = 1; month <= timeHorizon; month++) {
      const stakingRewards = currentPrincipal * adjustedStakingRate;
      const mevRewards = currentPrincipal * adjustedMevRate;
      const totalRewards = stakingRewards + mevRewards;
      
      cumulativeStaking += stakingRewards;
      cumulativeMev += mevRewards;
      currentPrincipal += totalRewards; // Compound

      const totalValue = delegationAmount + cumulativeStaking + cumulativeMev;
      const cumulativeReturns = ((totalValue - delegationAmount) / delegationAmount) * 100;
      const annualizedApy = ((totalValue / delegationAmount) ** (12 / month) - 1) * 100;

      projections.push({
        timeframe: `Month ${month}`,
        principal: delegationAmount,
        stakingRewards: cumulativeStaking,
        mevRewards: cumulativeMev,
        totalRewards: cumulativeStaking + cumulativeMev,
        totalValue,
        apy: annualizedApy,
        cumulativeReturns
      });
    }

    return projections;
  }, [validatorMetrics, delegationAmount, timeHorizon, confidenceLevel]);

  const fetchValidatorMetrics = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/validators/${validatorPubkey}/metrics`);
      if (!response.ok) throw new Error('Failed to fetch validator metrics');
      
      const data = await response.json();
      setValidatorMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (validatorPubkey) {
      fetchValidatorMetrics();
    }
  }, [validatorPubkey]);

  useEffect(() => {
    if (isConnected && validatorPubkey) {
      const unsubscribe = subscribe('validator_metrics', (data: any) => {
        if (data.validatorPubkey === validatorPubkey) {
          setValidatorMetrics(data.metrics);
          setLoading(false);
        }
      });
      return unsubscribe;
    }
  }, [isConnected, validatorPubkey, subscribe]);

  useEffect(() => {
    setProjections(calculateProjections);
  }, [calculateProjections]);

  const formatSOL = (amount: number): string => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M SOL`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K SOL`;
    return `${amount.toFixed(2)} SOL`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const getProjectionColors = () => {
    return ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-blue-600">Staking Rewards:</span>
              <span className="font-medium">{formatSOL(data.stakingRewards)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">MEV Rewards:</span>
              <span className="font-medium">{formatSOL(data.mevRewards)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-600">Total Value:</span>
              <span className="font-bold">{formatSOL(data.totalValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-600">Returns:</span>
              <span className="font-medium">{formatPercentage(data.cumulativeReturns)}</span>
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
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} border-red-200`}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Failed to load profit projections</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchValidatorMetrics} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validatorMetrics) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No validator metrics available</p>
        </CardContent>
      </Card>
    );
  }

  const finalProjection = projections[projections.length - 1];
  const rewardsBreakdown = [
    { name: 'Staking Rewards', value: finalProjection?.stakingRewards || 0, color: '#3b82f6' },
    { name: 'MEV Rewards', value: finalProjection?.mevRewards || 0, color: '#10b981' }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Profit Projections
            </CardTitle>
            <CardDescription>
              Calculate expected returns for {validatorName || 'validator'}
            </CardDescription>
          </div>
          <Button onClick={fetchValidatorMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="space-y-2">
            <label className="text-sm font-medium">Delegation Amount (SOL)</label>
            <Input
              type="number"
              value={delegationAmount}
              onChange={(e) => setDelegationAmount(Number(e.target.value))}
              min="1"
              step="100"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Time Horizon: {timeHorizon} months</label>
            <Slider
              value={[timeHorizon]}
              onValueChange={([value]) => setTimeHorizon(value)}
              min={1}
              max={36}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Confidence Level: {confidenceLevel}%</label>
            <Slider
              value={[confidenceLevel]}
              onValueChange={([value]) => setConfidenceLevel(value)}
              min={50}
              max={95}
              step={5}
              className="w-full"
            />
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <DollarSign className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-600">
              {formatSOL(finalProjection?.totalValue || 0)}
            </p>
            <p className="text-xs text-gray-600">Final Value</p>
          </div>
          
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">
              {formatSOL(finalProjection?.totalRewards || 0)}
            </p>
            <p className="text-xs text-gray-600">Total Rewards</p>
          </div>
          
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Target className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-purple-600">
              {formatPercentage(finalProjection?.cumulativeReturns || 0)}
            </p>
            <p className="text-xs text-gray-600">Total Returns</p>
          </div>
          
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <Activity className="h-5 w-5 text-orange-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-orange-600">
              {formatPercentage(validatorMetrics.apy + validatorMetrics.mevApy)}
            </p>
            <p className="text-xs text-gray-600">Combined APY</p>
          </div>
        </div>

        {/* Projection Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Growth Timeline */}
          <div>
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Growth Timeline
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={projections}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timeframe" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatSOL}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="stakingRewards"
                  name="Staking Rewards"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="mevRewards"
                  name="MEV Rewards"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalValue"
                  name="Total Value"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Rewards Breakdown */}
          <div>
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Rewards Breakdown
            </h4>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={rewardsBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {rewardsBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatSOL(value as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Scenario Analysis */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Scenario Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Conservative', confidence: 60, multiplier: 0.8 },
              { name: 'Moderate', confidence: 75, multiplier: 1.0 },
              { name: 'Optimistic', confidence: 90, multiplier: 1.2 }
            ].map((scenario, index) => {
              const scenarioReturns = (finalProjection?.cumulativeReturns || 0) * scenario.multiplier;
              const scenarioValue = delegationAmount * (1 + scenarioReturns / 100);
              
              return (
                <Card key={index} className="p-4">
                  <div className="text-center">
                    <h5 className="font-medium mb-2">{scenario.name}</h5>
                    <div className="text-xl font-bold text-blue-600 mb-1">
                      {formatSOL(scenarioValue)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {formatPercentage(scenarioReturns)} returns
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {scenario.confidence}% confidence
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Risk Considerations */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Important Considerations
              </h5>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>• Projections are estimates based on historical data and current performance</li>
                <li>• Actual returns may vary due to network conditions, validator performance, and market factors</li>
                <li>• MEV rewards are particularly volatile and dependent on network activity</li>
                <li>• Consider diversifying across multiple validators to reduce risk</li>
                <li>• Validator commission rates and performance can change over time</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};