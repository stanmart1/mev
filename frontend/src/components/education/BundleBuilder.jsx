import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Play, DollarSign } from 'lucide-react';

const BundleBuilder = () => {
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'buy', dex: 'raydium', token: 'SOL', amount: 1000, compute: 150000 }
  ]);
  const [tipPercent, setTipPercent] = useState(10);
  const [simResult, setSimResult] = useState(null);

  const txTypes = [
    { value: 'buy', label: 'Buy', color: 'bg-green-600' },
    { value: 'sell', label: 'Sell', color: 'bg-red-600' },
    { value: 'swap', label: 'Swap', color: 'bg-blue-600' },
    { value: 'tip', label: 'Tip', color: 'bg-yellow-600' }
  ];

  const addTransaction = () => {
    if (transactions.length >= 5) {
      alert('Maximum 5 transactions per bundle');
      return;
    }
    setTransactions([...transactions, {
      id: Date.now(),
      type: 'buy',
      dex: 'raydium',
      token: 'SOL',
      amount: 1000,
      compute: 150000
    }]);
  };

  const removeTransaction = (id) => {
    setTransactions(transactions.filter(tx => tx.id !== id));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newTxs = [...transactions];
    [newTxs[index - 1], newTxs[index]] = [newTxs[index], newTxs[index - 1]];
    setTransactions(newTxs);
  };

  const moveDown = (index) => {
    if (index === transactions.length - 1) return;
    const newTxs = [...transactions];
    [newTxs[index], newTxs[index + 1]] = [newTxs[index + 1], newTxs[index]];
    setTransactions(newTxs);
  };

  const updateTransaction = (id, field, value) => {
    setTransactions(transactions.map(tx =>
      tx.id === id ? { ...tx, [field]: value } : tx
    ));
  };

  const simulateBundle = () => {
    const totalCompute = transactions.reduce((sum, tx) => sum + tx.compute, 0);
    const estimatedProfit = 100;
    const gasCost = 0.5;
    const tip = estimatedProfit * (tipPercent / 100);
    const netProfit = estimatedProfit - gasCost - tip;

    setSimResult({
      success: totalCompute < 7000000 && netProfit > 0,
      totalCompute,
      estimatedProfit,
      gasCost,
      tip,
      netProfit,
      withinLimit: totalCompute < 7000000
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Bundle Builder</h3>
        <div className="text-sm text-gray-400">
          {transactions.length}/5 transactions
        </div>
      </div>

      {/* Transactions */}
      <div className="space-y-3 mb-6">
        {transactions.map((tx, index) => (
          <div key={tx.id} className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex flex-col gap-1">
                <button onClick={() => moveUp(index)} disabled={index === 0} className="p-1 hover:bg-gray-600 rounded disabled:opacity-30">
                  <ArrowUp size={14} />
                </button>
                <button onClick={() => moveDown(index)} disabled={index === transactions.length - 1} className="p-1 hover:bg-gray-600 rounded disabled:opacity-30">
                  <ArrowDown size={14} />
                </button>
              </div>
              
              <div className="flex-1 grid grid-cols-4 gap-2">
                <select value={tx.type} onChange={(e) => updateTransaction(tx.id, 'type', e.target.value)} className="px-2 py-1 bg-gray-600 rounded text-sm">
                  {txTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input type="text" value={tx.token} onChange={(e) => updateTransaction(tx.id, 'token', e.target.value)} placeholder="Token" className="px-2 py-1 bg-gray-600 rounded text-sm" />
                <input type="number" value={tx.amount} onChange={(e) => updateTransaction(tx.id, 'amount', parseFloat(e.target.value))} placeholder="Amount" className="px-2 py-1 bg-gray-600 rounded text-sm" />
                <input type="number" value={tx.compute} onChange={(e) => updateTransaction(tx.id, 'compute', parseInt(e.target.value))} placeholder="Compute" className="px-2 py-1 bg-gray-600 rounded text-sm" />
              </div>

              <button onClick={() => removeTransaction(tx.id)} className="p-2 hover:bg-red-600 rounded">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="text-xs text-gray-400">
              Tx {index + 1}: {tx.type} {tx.amount} {tx.token} • {(tx.compute / 1000).toFixed(0)}K compute
            </div>
          </div>
        ))}
      </div>

      {/* Add Transaction */}
      <button onClick={addTransaction} disabled={transactions.length >= 5} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded mb-6 disabled:opacity-50">
        <Plus size={16} />
        Add Transaction
      </button>

      {/* Tip Slider */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Tip Percentage: {tipPercent}%</label>
        <input type="range" min="0" max="25" value={tipPercent} onChange={(e) => setTipPercent(parseInt(e.target.value))} className="w-full" />
      </div>

      {/* Simulate Button */}
      <button onClick={simulateBundle} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded font-semibold mb-6">
        <Play size={18} />
        Simulate Bundle
      </button>

      {/* Simulation Results */}
      {simResult && (
        <div className={`rounded-lg p-4 ${simResult.success ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
          <div className="text-center mb-4">
            <div className={`text-4xl mb-2 ${simResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {simResult.success ? '✓' : '✗'}
            </div>
            <div className="font-semibold">
              {simResult.success ? 'Bundle Valid' : 'Bundle Invalid'}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Compute:</span>
              <span className={simResult.withinLimit ? 'text-green-400' : 'text-red-400'}>
                {(simResult.totalCompute / 1000000).toFixed(2)}M / 7M
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Estimated Profit:</span>
              <span>${simResult.estimatedProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Gas Cost:</span>
              <span className="text-red-400">-${simResult.gasCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tip ({tipPercent}%):</span>
              <span className="text-orange-400">-${simResult.tip.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-600 pt-2 font-semibold">
              <span>Net Profit:</span>
              <span className={simResult.netProfit > 0 ? 'text-green-400' : 'text-red-400'}>
                ${simResult.netProfit.toFixed(2)}
              </span>
            </div>
          </div>

          {!simResult.withinLimit && (
            <div className="mt-4 text-sm text-red-300">
              Compute limit exceeded. Remove transactions or optimize compute usage.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BundleBuilder;
