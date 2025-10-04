import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiService from '../../services/api';

const ProfitCalculator = () => {
  const [inputs, setInputs] = useState({
    opportunityType: 'arbitrage',
    tokenA: 'SOL',
    tokenB: 'USDC',
    amount: 1000,
    buyPrice: 100,
    sellPrice: 102,
    primaryDex: 'raydium',
    secondaryDex: 'orca',
    gasPrice: 0.00001,
    slippageTolerance: 0.5,
    competitionFactor: 0.3
  });

  const [results, setResults] = useState(null);
  const [historicalData, setHistoricalData] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    fetchHistoricalData();
  }, [inputs.opportunityType]);

  const fetchHistoricalData = async () => {
    try {
      const response = await apiService.get('/profit/statistics?timeframe=7d');
      setHistoricalData(response.data?.statistics || {});
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
    }
  };

  const calculateProfit = async () => {
    setIsCalculating(true);
    try {
      const response = await apiService.post('/profit/calculate', {
        opportunity: {
          type: inputs.opportunityType,
          tokenA: inputs.tokenA,
          tokenB: inputs.tokenB,
          amount: parseFloat(inputs.amount),
          buyPrice: parseFloat(inputs.buyPrice),
          sellPrice: parseFloat(inputs.sellPrice),
          primaryDex: inputs.primaryDex,
          secondaryDex: inputs.secondaryDex,
          gasPrice: parseFloat(inputs.gasPrice),
          slippageTolerance: parseFloat(inputs.slippageTolerance),
          competitionFactor: parseFloat(inputs.competitionFactor)
        },
        options: { samples: 10000, confidenceLevel: 0.95 }
      });
      setResults(response.data?.analysis || null);
    } catch (error) {
      console.error('Calculation failed:', error);
      alert('Failed to calculate profit: ' + error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleInputChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const generateScenarioData = () => {
    if (!results) return [];
    return [
      { scenario: 'Worst Case', profit: results.netProfit?.worstCase || 0 },
      { scenario: 'Expected', profit: results.netProfit?.expected || 0 },
      { scenario: 'Best Case', profit: results.netProfit?.bestCase || 0 }
    ];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Profit Calculator & Simulator</h1>
          <p className="text-gray-600">Calculate expected profits with Monte Carlo simulation and risk analysis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Opportunity Parameters</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Opportunity Type</label>
                  <select
                    value={inputs.opportunityType}
                    onChange={(e) => handleInputChange('opportunityType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="arbitrage">Arbitrage</option>
                    <option value="liquidation">Liquidation</option>
                    <option value="sandwich">Sandwich</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token A</label>
                    <input
                      type="text"
                      value={inputs.tokenA}
                      onChange={(e) => handleInputChange('tokenA', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token B</label>
                    <input
                      type="text"
                      value={inputs.tokenB}
                      onChange={(e) => handleInputChange('tokenB', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (USD)</label>
                  <input
                    type="number"
                    value={inputs.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Buy Price</label>
                    <input
                      type="number"
                      value={inputs.buyPrice}
                      onChange={(e) => handleInputChange('buyPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sell Price</label>
                    <input
                      type="number"
                      value={inputs.sellPrice}
                      onChange={(e) => handleInputChange('sellPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary DEX</label>
                    <select
                      value={inputs.primaryDex}
                      onChange={(e) => handleInputChange('primaryDex', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="raydium">Raydium</option>
                      <option value="orca">Orca</option>
                      <option value="serum">Serum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Secondary DEX</label>
                    <select
                      value={inputs.secondaryDex}
                      onChange={(e) => handleInputChange('secondaryDex', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="orca">Orca</option>
                      <option value="raydium">Raydium</option>
                      <option value="serum">Serum</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gas Price (SOL): {inputs.gasPrice}
                  </label>
                  <input
                    type="range"
                    value={inputs.gasPrice}
                    onChange={(e) => handleInputChange('gasPrice', e.target.value)}
                    className="w-full"
                    min="0.000001"
                    max="0.0001"
                    step="0.000001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slippage Tolerance (%): {inputs.slippageTolerance}
                  </label>
                  <input
                    type="range"
                    value={inputs.slippageTolerance}
                    onChange={(e) => handleInputChange('slippageTolerance', e.target.value)}
                    className="w-full"
                    min="0.1"
                    max="5"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Competition Factor: {inputs.competitionFactor}
                  </label>
                  <input
                    type="range"
                    value={inputs.competitionFactor}
                    onChange={(e) => handleInputChange('competitionFactor', e.target.value)}
                    className="w-full"
                    min="0"
                    max="1"
                    step="0.1"
                  />
                </div>

                <button
                  onClick={calculateProfit}
                  disabled={isCalculating}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Calculator className="w-5 h-5 mr-2" />
                  {isCalculating ? 'Calculating...' : 'Calculate Profit'}
                </button>
              </div>
            </div>

            {/* Historical Success Rate */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Historical Performance</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="font-semibold">{historicalData.profitablePercentage?.toFixed(1) || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Profit:</span>
                  <span className="font-semibold text-green-600">
                    ${historicalData.averageExpectedProfit?.toFixed(2) || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Calculations:</span>
                  <span className="font-semibold">{historicalData.totalCalculations || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {!results ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Calculator className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Enter parameters and click Calculate to see results</p>
              </div>
            ) : (
              <>
                {/* Scenario Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Worst Case</span>
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      ${results.netProfit?.worstCase?.toFixed(2) || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">5th percentile</div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Expected</span>
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      ${results.netProfit?.expected?.toFixed(2) || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Mean value</div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Best Case</span>
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      ${results.netProfit?.bestCase?.toFixed(2) || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">95th percentile</div>
                  </div>
                </div>

                {/* Scenario Comparison Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Scenario Comparison</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={generateScenarioData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="scenario" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="profit" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Detailed Metrics */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Profit Breakdown</h2>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gross Profit:</span>
                        <span className="font-semibold">${results.baseProfit?.gross?.toFixed(2) || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gas Costs:</span>
                        <span className="font-semibold text-red-600">
                          -${results.costs?.gasCosts?.toFixed(2) || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Slippage:</span>
                        <span className="font-semibold text-red-600">
                          -${results.costs?.slippageCosts?.toFixed(2) || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Competition:</span>
                        <span className="font-semibold text-red-600">
                          -${results.costs?.competitionCosts?.toFixed(2) || 0}
                        </span>
                      </div>
                      <div className="border-t pt-3 flex justify-between">
                        <span className="font-semibold">Net Profit:</span>
                        <span className="font-bold text-green-600">
                          ${results.netProfit?.expected?.toFixed(2) || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Risk Analysis</h2>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Success Probability:</span>
                        <span className="font-semibold">
                          {((results.probabilities?.profitability || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Risk Score:</span>
                        <span className={`font-semibold ${
                          (results.risks?.combinedRiskScore || 0) <= 3 ? 'text-green-600' :
                          (results.risks?.combinedRiskScore || 0) <= 6 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {results.risks?.combinedRiskScore?.toFixed(1) || 0}/10
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Confidence Interval:</span>
                        <span className="font-semibold text-sm">
                          ${results.netProfit?.confidenceLower?.toFixed(2) || 0} - 
                          ${results.netProfit?.confidenceUpper?.toFixed(2) || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Risk-Adjusted Profit:</span>
                        <span className="font-semibold text-blue-600">
                          ${results.netProfit?.riskAdjusted?.toFixed(2) || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {(results.risks?.combinedRiskScore || 0) > 6 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-yellow-900">High Risk Detected</h3>
                        <p className="text-sm text-yellow-800 mt-1">
                          This opportunity has elevated risk factors. Consider reducing position size or 
                          adjusting slippage tolerance.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitCalculator;