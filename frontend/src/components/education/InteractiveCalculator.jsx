import { useState } from 'react';
import { Calculator } from 'lucide-react';

const InteractiveCalculator = ({ type = 'arbitrage' }) => {
  const [inputs, setInputs] = useState({
    buyPrice: 100,
    sellPrice: 101,
    amount: 1000,
    gasCost: 0.5,
    tipPercent: 10
  });

  const calculate = () => {
    const { buyPrice, sellPrice, amount, gasCost, tipPercent } = inputs;
    const revenue = amount * sellPrice;
    const cost = amount * buyPrice;
    const grossProfit = revenue - cost;
    const netProfit = grossProfit - gasCost;
    const tip = netProfit * (tipPercent / 100);
    const finalProfit = netProfit - tip;
    const roi = ((finalProfit / cost) * 100).toFixed(2);

    return { grossProfit, netProfit, tip, finalProfit, roi };
  };

  const result = calculate();

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="text-blue-400" />
        <h3 className="text-lg font-semibold">Arbitrage Profit Calculator</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Buy Price ($)</label>
          <input type="number" value={inputs.buyPrice} onChange={(e) => setInputs({...inputs, buyPrice: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-gray-700 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Sell Price ($)</label>
          <input type="number" value={inputs.sellPrice} onChange={(e) => setInputs({...inputs, sellPrice: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-gray-700 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Amount</label>
          <input type="number" value={inputs.amount} onChange={(e) => setInputs({...inputs, amount: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-gray-700 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Gas Cost ($)</label>
          <input type="number" value={inputs.gasCost} onChange={(e) => setInputs({...inputs, gasCost: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-gray-700 rounded" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Tip Percent (%)</label>
          <input type="range" min="0" max="25" value={inputs.tipPercent} onChange={(e) => setInputs({...inputs, tipPercent: parseFloat(e.target.value)})} className="w-full" />
          <div className="text-center text-sm text-gray-400">{inputs.tipPercent}%</div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Gross Profit:</span>
          <span className="font-semibold">${result.grossProfit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">After Gas:</span>
          <span className="font-semibold">${result.netProfit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Tip ({inputs.tipPercent}%):</span>
          <span className="font-semibold text-orange-400">-${result.tip.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-700 pt-2">
          <span className="text-gray-400 font-semibold">Final Profit:</span>
          <span className={`font-bold text-lg ${result.finalProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${result.finalProfit.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">ROI:</span>
          <span className="font-semibold text-blue-400">{result.roi}%</span>
        </div>
      </div>
    </div>
  );
};

export default InteractiveCalculator;
