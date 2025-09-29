import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { 
  Calculator,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  PieChart as PieChartIcon,
  Target,
  Activity,
  Users,
  Shield,
  Zap
} from 'lucide-react';

interface ValidatorOption {
  pubkey: string;
  name: string;
  apy: number;
  mevApy: number;
  commission: number;
  riskScore: number;
  minDelegation?: number;
  maxDelegation?: number;
}

interface DelegationScenario {
  validatorPubkey: string;
  validatorName: string;
  amount: number;
  percentage: number;
  expectedAnnualReturns: number;
  riskWeightedReturns: number;
  mevContribution: number;
}

interface PortfolioMetrics {
  totalDelegation: number;
  weightedApy: number;
  weightedRisk: number;
  diversificationScore: number;
  expectedAnnualReturns: number;
  mevPercentage: number;
}

interface DelegationCalculatorProps {
  availableValidators: ValidatorOption[];
  totalBalance: number;
  className?: string;
}

export const DelegationAmountCalculator: React.FC<DelegationCalculatorProps> = ({
  availableValidators,
  totalBalance,
  className = ''
}) => {
  const [totalDelegationAmount, setTotalDelegationAmount] = useState(1000);
  const [delegationScenarios, setDelegationScenarios] = useState<DelegationScenario[]>([]);
  const [riskTolerance, setRiskTolerance] = useState(50); // 0-100
  const [diversificationLevel, setDiversificationLevel] = useState(3); // 1-5 validators
  const [optimizeFor, setOptimizeFor] = useState<'returns' | 'risk' | 'balanced'>('balanced');

  const portfolioMetrics: PortfolioMetrics = useMemo(() => {
    if (delegationScenarios.length === 0) {
      return {
        totalDelegation: 0,
        weightedApy: 0,
        weightedRisk: 0,
        diversificationScore: 0,
        expectedAnnualReturns: 0,
        mevPercentage: 0
      };
    }

    const totalDelegation = delegationScenarios.reduce((sum, scenario) => sum + scenario.amount, 0);
    const weightedApy = delegationScenarios.reduce((sum, scenario) => {
      const validator = availableValidators.find(v => v.pubkey === scenario.validatorPubkey);
      return sum + (validator ? (validator.apy + validator.mevApy) * (scenario.amount / totalDelegation) : 0);
    }, 0);

    const weightedRisk = delegationScenarios.reduce((sum, scenario) => {
      const validator = availableValidators.find(v => v.pubkey === scenario.validatorPubkey);
      return sum + (validator ? validator.riskScore * (scenario.amount / totalDelegation) : 0);
    }, 0);

    const diversificationScore = Math.min((delegationScenarios.length / 5) * 100, 100);
    const expectedAnnualReturns = totalDelegation * (weightedApy / 100);
    
    const mevContribution = delegationScenarios.reduce((sum, scenario) => {
      const validator = availableValidators.find(v => v.pubkey === scenario.validatorPubkey);
      return sum + (validator ? validator.mevApy * (scenario.amount / totalDelegation) : 0);
    }, 0);

    return {
      totalDelegation,
      weightedApy,
      weightedRisk,
      diversificationScore,
      expectedAnnualReturns,
      mevPercentage: (mevContribution / weightedApy) * 100
    };
  }, [delegationScenarios, availableValidators]);

  const generateOptimalDistribution = () => {
    if (availableValidators.length === 0) return;

    // Sort validators based on optimization criteria
    let sortedValidators = [...availableValidators];
    
    switch (optimizeFor) {
      case 'returns':
        sortedValidators.sort((a, b) => (b.apy + b.mevApy) - (a.apy + a.mevApy));
        break;
      case 'risk':
        sortedValidators.sort((a, b) => a.riskScore - b.riskScore);
        break;
      case 'balanced':
        sortedValidators.sort((a, b) => {
          const scoreA = (a.apy + a.mevApy) * (1 - a.riskScore / 100);
          const scoreB = (b.apy + b.mevApy) * (1 - b.riskScore / 100);
          return scoreB - scoreA;
        });
        break;
    }

    // Filter validators based on risk tolerance
    const riskThreshold = riskTolerance;
    const suitableValidators = sortedValidators.filter(v => 
      optimizeFor === 'risk' ? true : v.riskScore <= riskThreshold
    );

    // Select top validators up to diversification level
    const selectedValidators = suitableValidators.slice(0, diversificationLevel);
    
    // Distribute amounts based on strategy
    const scenarios: DelegationScenario[] = [];
    let remainingAmount = totalDelegationAmount;

    selectedValidators.forEach((validator, index) => {
      let allocation: number;
      
      if (optimizeFor === 'returns') {
        // Concentrate more on highest returning validators
        allocation = remainingAmount * (0.5 - index * 0.1);
      } else if (optimizeFor === 'risk') {
        // Equal distribution for risk minimization
        allocation = remainingAmount / selectedValidators.length;
      } else {
        // Balanced approach with weight based on risk-adjusted returns
        const totalScore = selectedValidators.reduce((sum, v) => 
          sum + ((v.apy + v.mevApy) * (1 - v.riskScore / 100)), 0);
        const validatorScore = (validator.apy + validator.mevApy) * (1 - validator.riskScore / 100);
        allocation = (validatorScore / totalScore) * totalDelegationAmount;
      }

      allocation = Math.max(allocation, 50); // Minimum delegation
      allocation = Math.min(allocation, remainingAmount);

      if (allocation > 0) {
        scenarios.push({
          validatorPubkey: validator.pubkey,
          validatorName: validator.name,
          amount: allocation,
          percentage: (allocation / totalDelegationAmount) * 100,
          expectedAnnualReturns: allocation * ((validator.apy + validator.mevApy) / 100),
          riskWeightedReturns: allocation * ((validator.apy + validator.mevApy) / 100) * (1 - validator.riskScore / 100),
          mevContribution: allocation * (validator.mevApy / 100)
        });

        remainingAmount -= allocation;
      }
    });

    // Redistribute any remaining amount
    if (remainingAmount > 0 && scenarios.length > 0) {
      const additionalPerValidator = remainingAmount / scenarios.length;
      scenarios.forEach(scenario => {
        scenario.amount += additionalPerValidator;
        scenario.percentage = (scenario.amount / totalDelegationAmount) * 100;
      });
    }

    setDelegationScenarios(scenarios);
  };

  const updateScenarioAmount = (pubkey: string, newAmount: number) => {
    setDelegationScenarios(prev => 
      prev.map(scenario => {
        if (scenario.validatorPubkey === pubkey) {
          const validator = availableValidators.find(v => v.pubkey === pubkey);
          return {
            ...scenario,
            amount: newAmount,
            percentage: (newAmount / totalDelegationAmount) * 100,
            expectedAnnualReturns: validator ? newAmount * ((validator.apy + validator.mevApy) / 100) : 0,
            riskWeightedReturns: validator ? newAmount * ((validator.apy + validator.mevApy) / 100) * (1 - validator.riskScore / 100) : 0,
            mevContribution: validator ? newAmount * (validator.mevApy / 100) : 0
          };
        }
        return scenario;
      })
    );
  };

  const removeScenario = (pubkey: string) => {
    setDelegationScenarios(prev => prev.filter(s => s.validatorPubkey !== pubkey));
  };

  const formatSOL = (amount: number): string => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M SOL`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K SOL`;
    return `${amount.toFixed(2)} SOL`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore <= 30) return 'text-green-600';
    if (riskScore <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const chartData = delegationScenarios.map(scenario => ({
    name: scenario.validatorName.slice(0, 10) + '...',
    amount: scenario.amount,
    percentage: scenario.percentage,
    returns: scenario.expectedAnnualReturns
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    if (availableValidators.length > 0 && delegationScenarios.length === 0) {
      generateOptimalDistribution();
    }
  }, [availableValidators, totalDelegationAmount, riskTolerance, diversificationLevel, optimizeFor]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Delegation Amount Calculator
        </CardTitle>
        <CardDescription>
          Optimize your stake distribution across validators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="space-y-2">
            <label className="text-sm font-medium">Total Delegation (SOL)</label>
            <Input
              type="number"
              value={totalDelegationAmount}
              onChange={(e) => setTotalDelegationAmount(Number(e.target.value))}
              min="1"
              max={totalBalance}
            />
            <p className="text-xs text-gray-500">
              Balance: {formatSOL(totalBalance)}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Risk Tolerance: {riskTolerance}%</label>
            <Slider
              value={[riskTolerance]}
              onValueChange={([value]) => setRiskTolerance(value)}
              min={0}
              max={100}
              step={5}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Validators: {diversificationLevel}</label>
            <Slider
              value={[diversificationLevel]}
              onValueChange={([value]) => setDiversificationLevel(value)}
              min={1}
              max={Math.min(availableValidators.length, 5)}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Optimize For</label>
            <select 
              value={optimizeFor}
              onChange={(e) => setOptimizeFor(e.target.value as 'returns' | 'risk' | 'balanced')}
              className="w-full p-2 border rounded-md"
            >
              <option value="balanced">Balanced</option>
              <option value="returns">Max Returns</option>
              <option value="risk">Min Risk</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="text-center">
          <Button onClick={generateOptimalDistribution} className="w-full md:w-auto">
            <Target className="h-4 w-4 mr-2" />
            Generate Optimal Distribution
          </Button>
        </div>

        {/* Portfolio Overview */}
        {delegationScenarios.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-blue-600">
                {formatSOL(portfolioMetrics.totalDelegation)}
              </p>
              <p className="text-xs text-gray-600">Total Delegation</p>
            </div>
            
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-600">
                {formatPercentage(portfolioMetrics.weightedApy)}
              </p>
              <p className="text-xs text-gray-600">Weighted APY</p>
            </div>
            
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Shield className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className={`text-lg font-bold ${getRiskColor(portfolioMetrics.weightedRisk)}`}>
                {portfolioMetrics.weightedRisk.toFixed(1)}
              </p>
              <p className="text-xs text-gray-600">Risk Score</p>
            </div>
            
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Users className="h-5 w-5 text-orange-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-orange-600">
                {portfolioMetrics.diversificationScore.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-600">Diversification</p>
            </div>
          </div>
        )}

        {/* Distribution Charts */}
        {delegationScenarios.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Allocation Pie Chart */}
            <div>
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Allocation Distribution
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }: any) => `${name} (${percentage.toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatSOL(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Expected Returns Bar Chart */}
            <div>
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Expected Returns
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatSOL(value)} />
                  <Tooltip formatter={(value) => formatSOL(value as number)} />
                  <Bar dataKey="returns" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Delegation Scenarios Table */}
        {delegationScenarios.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold mb-4">Delegation Breakdown</h4>
            <div className="space-y-4">
              {delegationScenarios.map((scenario, index) => {
                const validator = availableValidators.find(v => v.pubkey === scenario.validatorPubkey);
                return (
                  <Card key={scenario.validatorPubkey} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      <div className="md:col-span-2">
                        <div className="font-medium">{scenario.validatorName}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {scenario.validatorPubkey.slice(0, 8)}...{scenario.validatorPubkey.slice(-8)}
                        </div>
                        {validator && (
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              APY: {formatPercentage(validator.apy + validator.mevApy)}
                            </Badge>
                            {validator.mevApy > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                MEV
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <Input
                          type="number"
                          value={scenario.amount}
                          onChange={(e) => updateScenarioAmount(scenario.validatorPubkey, Number(e.target.value))}
                          min="1"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {formatPercentage(scenario.percentage)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-medium text-green-600">
                          {formatSOL(scenario.expectedAnnualReturns)}
                        </div>
                        <div className="text-xs text-gray-500">Annual Returns</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-medium text-purple-600">
                          {formatSOL(scenario.mevContribution)}
                        </div>
                        <div className="text-xs text-gray-500">MEV Returns</div>
                      </div>
                      
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeScenario(scenario.validatorPubkey)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Risk Warning */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Important Delegation Considerations
              </h5>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>• Delegated SOL is subject to slashing risk if validators misbehave</li>
                <li>• Unstaking requires a cooling-off period (typically 2-3 epochs)</li>
                <li>• Validator commission rates and performance can change over time</li>
                <li>• Diversification across multiple validators reduces concentration risk</li>
                <li>• Monitor validator performance and adjust delegation as needed</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};