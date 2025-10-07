import { useState } from 'react';
import { TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';

const RiskCalculator = () => {
  const [inputs, setInputs] = useState({
    capital: 10000,
    riskPercent: 2,
    winRate: 60,
    avgWin: 100,
    avgLoss: 50
  });

  const calculate = () => {
    const { capital, riskPercent, winRate, avgWin, avgLoss } = inputs;
    const winRateDecimal = winRate / 100;
    
    // Risk amount per trade
    const riskAmount = capital * (riskPercent / 100);
    
    // Expected value
    const expectedValue = (winRateDecimal * avgWin) - ((1 - winRateDecimal) * avgLoss);
    
    // Kelly Criterion
    const b = avgWin / avgLoss;
    const kelly = (winRateDecimal * b - (1 - winRateDecimal)) / b;
    const halfKelly = kelly / 2;
    const kellyPosition = capital * Math.max(0, Math.min(halfKelly, 0.10));
    
    // Risk of Ruin (simplified)
    const a = (1 - winRateDecimal) / winRateDecimal;
    const n = capital / riskAmount;
    const riskOfRuin = Math.pow(a, n) * 100;
    
    // Sharpe Ratio (simplified)
    const avgReturn = expectedValue / riskAmount;
    const sharpeRatio = avgReturn / 0.5; // Assuming 0.5 std dev
    
    // Expected trades to double
    const tradesToDouble = capital / expectedValue;
    
    return {
      riskAmount,
      expectedValue,
      kellyPosition,
      riskOfRuin: Math.min(riskOfRuin, 100),
      sharpeRatio,
      tradesToDouble: Math.max(0, tradesToDouble),
      recommendation: getRecommendation(riskOfRuin, expectedValue, riskPercent)
    };
  };

  const getRecommendation = (riskOfRuin, ev, riskPercent) => {
    if (ev <= 0) return { level: 'danger', text: 'Negative expected value - do not trade' };
    if (riskOfRuin > 50) return { level: 'danger', text: 'Very high risk of ruin - reduce position size' };
    if (riskOfRuin > 20) return { level: 'warning', text: 'Moderate risk - consider reducing risk per trade' };
    if (riskPercent > 5) return { level: 'warning', text: 'Risk per trade is high - consider 2-3%' };
    return { level: 'success', text: 'Risk parameters are acceptable' };
  };

  const result = calculate();

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="text-blue-400" />
        <h3 className="text-xl font-semibold">Risk Calculator</h3>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Capital ($)</label>
          <input type="number" value={inputs.capital} onChange={(e) => setInputs({...inputs, capital: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-gray-700 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Risk Per Trade (%)</label>
          <input type="number" value={inputs.riskPercent} onChange={(e) => setInputs({...inputs, riskPercent: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-gray-700 rounded" step="0.5" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Win Rate (%)</label>
          <input type="range" min="0" max="100" value={inputs.winRate} onChange={(e) => setInputs({...inputs, winRate: parseFloat(e.target.value)})} className="w-full" />
          <div className="text-center text-sm text-gray-400">{inputs.winRate}%</div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Avg Win ($)</label>
          <input type="number" value={inputs.avgWin} onChange={(e) => setInputs({...inputs, avgWin: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-gray-700 rounded" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Avg Loss ($)</label>
          <input type="number" value={inputs.avgLoss} onChange={(e) => setInputs({...inputs, avgLoss: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-gray-700 rounded" />
        </div>
      </div>

      {/* Results */}
      <div className="bg-gray-900 rounded-lg p-4 space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Risk Per Trade:</span>
          <span className="font-semibold text-lg">${result.riskAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Expected Value:</span>
          <span className={`font-semibold text-lg ${result.expectedValue > 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${result.expectedValue.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Kelly Position:</span>
          <span className="font-semibold">${result.kellyPosition.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Risk of Ruin:</span>
          <span className={`font-semibold ${result.riskOfRuin > 20 ? 'text-red-400' : result.riskOfRuin > 10 ? 'text-yellow-400' : 'text-green-400'}`}>
            {result.riskOfRuin.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Sharpe Ratio:</span>
          <span className={`font-semibold ${result.sharpeRatio > 2 ? 'text-green-400' : result.sharpeRatio > 1 ? 'text-yellow-400' : 'text-red-400'}`}>
            {result.sharpeRatio.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Trades to Double:</span>
          <span className="font-semibold">
            {result.tradesToDouble > 0 ? result.tradesToDouble.toFixed(0) : 'N/A'}
          </span>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`rounded-lg p-4 flex items-start gap-3 ${
        result.recommendation.level === 'danger' ? 'bg-red-900/20 border border-red-500/30' :
        result.recommendation.level === 'warning' ? 'bg-yellow-900/20 border border-yellow-500/30' :
        'bg-green-900/20 border border-green-500/30'
      }`}>
        <AlertTriangle className={`mt-0.5 ${
          result.recommendation.level === 'danger' ? 'text-red-400' :
          result.recommendation.level === 'warning' ? 'text-yellow-400' :
          'text-green-400'
        }`} size={20} />
        <div>
          <div className="font-semibold mb-1">Recommendation</div>
          <div className="text-sm text-gray-300">{result.recommendation.text}</div>
        </div>
      </div>

      {/* Risk Metrics Explanation */}
      <div className="mt-4 text-xs text-gray-400 space-y-1">
        <div>• <strong>Expected Value:</strong> Average profit per trade</div>
        <div>• <strong>Kelly Position:</strong> Optimal position size (half-Kelly for safety)</div>
        <div>• <strong>Risk of Ruin:</strong> Probability of losing all capital</div>
        <div>• <strong>Sharpe Ratio:</strong> Risk-adjusted returns (>2 excellent, >1 good)</div>
      </div>
    </div>
  );
};

export default RiskCalculator;
