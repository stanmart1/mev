import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Play } from 'lucide-react';

const ArbitrageSimulator = () => {
  const [dexPrices, setDexPrices] = useState({
    raydium: 100,
    orca: 100.5,
    serum: 99.8
  });
  const [amount, setAmount] = useState(1000);
  const [selectedPath, setSelectedPath] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState(null);

  const dexes = [
    { id: 'raydium', name: 'Raydium', color: 'bg-purple-600', fee: 0.25 },
    { id: 'orca', name: 'Orca', color: 'bg-blue-600', fee: 0.20 },
    { id: 'serum', name: 'Serum', color: 'bg-green-600', fee: 0.30 }
  ];

  const randomizePrices = () => {
    setDexPrices({
      raydium: 100 + (Math.random() - 0.5) * 4,
      orca: 100 + (Math.random() - 0.5) * 4,
      serum: 100 + (Math.random() - 0.5) * 4
    });
    setResult(null);
  };

  const findBestOpportunity = () => {
    const opportunities = [];
    
    Object.keys(dexPrices).forEach(buyDex => {
      Object.keys(dexPrices).forEach(sellDex => {
        if (buyDex !== sellDex) {
          const buyPrice = dexPrices[buyDex];
          const sellPrice = dexPrices[sellDex];
          const buyFee = dexes.find(d => d.id === buyDex).fee;
          const sellFee = dexes.find(d => d.id === sellDex).fee;
          
          const cost = amount * buyPrice * (1 + buyFee / 100);
          const revenue = amount * sellPrice * (1 - sellFee / 100);
          const profit = revenue - cost;
          const profitPercent = (profit / cost) * 100;
          
          opportunities.push({
            buyDex,
            sellDex,
            buyPrice,
            sellPrice,
            cost,
            revenue,
            profit,
            profitPercent
          });
        }
      });
    });
    
    return opportunities.sort((a, b) => b.profit - a.profit)[0];
  };

  const simulateArbitrage = () => {
    setSimulating(true);
    const best = findBestOpportunity();
    
    setTimeout(() => {
      const gasCost = 0.5;
      const tipPercent = 10;
      const tip = Math.max(0, best.profit * (tipPercent / 100));
      const netProfit = best.profit - gasCost - tip;
      
      setResult({
        ...best,
        gasCost,
        tip,
        netProfit,
        success: netProfit > 0
      });
      setSelectedPath(best);
      setSimulating(false);
    }, 1000);
  };

  useEffect(() => {
    randomizePrices();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-green-400" />
          <h3 className="text-xl font-semibold">Arbitrage Simulator</h3>
        </div>
        <button onClick={randomizePrices} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
          <RefreshCw size={16} />
          New Prices
        </button>
      </div>

      {/* DEX Prices */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {dexes.map(dex => (
          <div key={dex.id} className={`${dex.color} rounded-lg p-4 text-center`}>
            <div className="text-sm opacity-80 mb-1">{dex.name}</div>
            <div className="text-2xl font-bold">${dexPrices[dex.id].toFixed(2)}</div>
            <div className="text-xs opacity-70 mt-1">Fee: {dex.fee}%</div>
          </div>
        ))}
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Trade Amount (SOL)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))} className="w-full px-4 py-2 bg-gray-700 rounded" />
      </div>

      {/* Simulate Button */}
      <button onClick={simulateArbitrage} disabled={simulating} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded font-semibold disabled:opacity-50">
        <Play size={18} />
        {simulating ? 'Simulating...' : 'Find Best Arbitrage'}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-6 bg-gray-900 rounded-lg p-4">
          <div className="text-center mb-4">
            <div className={`text-4xl mb-2 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.success ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-400 mb-2">
              Buy on {dexes.find(d => d.id === result.buyDex).name} → Sell on {dexes.find(d => d.id === result.sellDex).name}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Buy Price:</span>
              <span>${result.buyPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sell Price:</span>
              <span>${result.sellPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cost (with fees):</span>
              <span>${result.cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Revenue (after fees):</span>
              <span>${result.revenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Gross Profit:</span>
              <span className="text-green-400">${result.profit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Gas Cost:</span>
              <span className="text-red-400">-${result.gasCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tip (10%):</span>
              <span className="text-orange-400">-${result.tip.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-2 font-semibold">
              <span>Net Profit:</span>
              <span className={result.netProfit > 0 ? 'text-green-400' : 'text-red-400'}>
                ${result.netProfit.toFixed(2)} ({result.profitPercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {!result.success && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-sm text-red-300">
              Not profitable after fees, gas, and tip. Try different prices or larger amount.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArbitrageSimulator;
