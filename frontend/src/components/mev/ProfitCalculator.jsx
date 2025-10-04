import { useState } from 'react';
import { Calculator, TrendingUp, AlertTriangle } from 'lucide-react';
import Button from '../common/Button';

export default function ProfitCalculator({ opportunity }) {
  const [inputs, setInputs] = useState({
    amount: '',
    gasPrice: '0.000005',
    slippage: '0.5',
    competitionFactor: '0.3'
  });
  const [result, setResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculate = async () => {
    setIsCalculating(true);
    try {
      // Simulate calculation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const amount = parseFloat(inputs.amount);
      const profit = amount * (opportunity?.profitMargin || 0.02);
      const gasCost = parseFloat(inputs.gasPrice) * 1000000; // Estimate gas units
      const slippageCost = amount * (parseFloat(inputs.slippage) / 100);
      const competitionRisk = parseFloat(inputs.competitionFactor);
      
      const netProfit = profit - gasCost - slippageCost;
      const successProbability = Math.max(0.1, 1 - competitionRisk);
      const expectedValue = netProfit * successProbability;
      
      setResult({
        grossProfit: profit,
        gasCost,
        slippageCost,
        netProfit,
        successProbability,
        expectedValue,
        roi: (expectedValue / amount) * 100
      });
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center mb-6">
        <Calculator className="w-5 h-5 mr-2 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profit Calculator</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Investment Amount (SOL)
          </label>
          <input
            type="number"
            value={inputs.amount}
            onChange={(e) => setInputs({...inputs, amount: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
            placeholder="1.0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gas Price (SOL)
            </label>
            <input
              type="number"
              value={inputs.gasPrice}
              onChange={(e) => setInputs({...inputs, gasPrice: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              step="0.000001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slippage %
            </label>
            <input
              type="number"
              value={inputs.slippage}
              onChange={(e) => setInputs({...inputs, slippage: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              step="0.1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Competition Factor (0-1)
          </label>
          <input
            type="number"
            value={inputs.competitionFactor}
            onChange={(e) => setInputs({...inputs, competitionFactor: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
            min="0"
            max="1"
            step="0.1"
          />
        </div>

        <Button 
          onClick={calculate} 
          disabled={!inputs.amount || isCalculating}
          className="w-full"
        >
          {isCalculating ? 'Calculating...' : 'Calculate Profit'}
        </Button>

        {result && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Results</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Gross Profit:</span>
                <span className="text-green-600 font-medium">+{result.grossProfit.toFixed(6)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Gas Cost:</span>
                <span className="text-red-600">-{result.gasCost.toFixed(6)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Slippage Cost:</span>
                <span className="text-red-600">-{result.slippageCost.toFixed(6)} SOL</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900 dark:text-white">Net Profit:</span>
                <span className={result.netProfit > 0 ? 'text-green-600' : 'text-red-600'}>
                  {result.netProfit > 0 ? '+' : ''}{result.netProfit.toFixed(6)} SOL
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Success Probability:</span>
                <span className="text-blue-600">{(result.successProbability * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900 dark:text-white">Expected Value:</span>
                <span className={result.expectedValue > 0 ? 'text-green-600' : 'text-red-600'}>
                  {result.expectedValue > 0 ? '+' : ''}{result.expectedValue.toFixed(6)} SOL
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">ROI:</span>
                <span className={result.roi > 0 ? 'text-green-600' : 'text-red-600'}>
                  {result.roi.toFixed(2)}%
                </span>
              </div>
            </div>
            
            {result.expectedValue <= 0 && (
              <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900 rounded flex items-center">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  Negative expected value - high risk opportunity
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}