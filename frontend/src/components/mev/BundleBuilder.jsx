import { useState } from 'react';
import { Plus, Trash2, Play } from 'lucide-react';
import Button from '../common/Button';

export default function BundleBuilder({ onSimulate }) {
  const [transactions, setTransactions] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const addTransaction = () => {
    setTransactions([...transactions, {
      id: Date.now(),
      type: 'swap',
      tokenIn: '',
      tokenOut: '',
      amountIn: '',
      slippage: '0.5'
    }]);
  };

  const removeTransaction = (id) => {
    setTransactions(transactions.filter(tx => tx.id !== id));
  };

  const updateTransaction = (id, field, value) => {
    setTransactions(transactions.map(tx => 
      tx.id === id ? { ...tx, [field]: value } : tx
    ));
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      await onSimulate(transactions);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bundle Builder</h3>
        <Button onClick={addTransaction} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      <div className="space-y-4">
        {transactions.map((tx, index) => (
          <div key={tx.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Transaction {index + 1}
              </span>
              <button
                onClick={() => removeTransaction(tx.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Token In
                </label>
                <input
                  type="text"
                  value={tx.tokenIn}
                  onChange={(e) => updateTransaction(tx.id, 'tokenIn', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  placeholder="SOL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Token Out
                </label>
                <input
                  type="text"
                  value={tx.tokenOut}
                  onChange={(e) => updateTransaction(tx.id, 'tokenOut', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  placeholder="USDC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={tx.amountIn}
                  onChange={(e) => updateTransaction(tx.id, 'amountIn', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  placeholder="1.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slippage %
                </label>
                <input
                  type="number"
                  value={tx.slippage}
                  onChange={(e) => updateTransaction(tx.id, 'slippage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  placeholder="0.5"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {transactions.length > 0 && (
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleSimulate} 
            disabled={isSimulating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {isSimulating ? 'Simulating...' : 'Simulate Bundle'}
          </Button>
        </div>
      )}
    </div>
  );
}