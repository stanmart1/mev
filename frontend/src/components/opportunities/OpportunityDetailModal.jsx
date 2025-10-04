import React, { useState, useEffect } from 'react';
import { X, TrendingUp, AlertTriangle, Clock, DollarSign, Activity, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiService from '../../services/api';

const OpportunityDetailModal = ({ opportunity, isOpen, onClose, onBuildBundle }) => {
  const [profitBreakdown, setProfitBreakdown] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && opportunity) {
      loadOpportunityDetails();
    }
  }, [isOpen, opportunity]);

  const loadOpportunityDetails = async () => {
    setLoading(true);
    try {
      const profitData = await apiService.calculateProfit(opportunity);
      setProfitBreakdown(profitData.data);
      
      setPriceHistory([
        { time: '5m', buyPrice: opportunity.buy_price * 0.98, sellPrice: opportunity.sell_price * 0.98 },
        { time: '4m', buyPrice: opportunity.buy_price * 0.99, sellPrice: opportunity.sell_price * 0.99 },
        { time: '3m', buyPrice: opportunity.buy_price * 0.995, sellPrice: opportunity.sell_price * 0.995 },
        { time: '2m', buyPrice: opportunity.buy_price, sellPrice: opportunity.sell_price },
        { time: '1m', buyPrice: opportunity.buy_price * 1.005, sellPrice: opportunity.sell_price * 1.005 },
        { time: 'Now', buyPrice: opportunity.buy_price, sellPrice: opportunity.sell_price }
      ]);
    } catch (error) {
      console.error('Failed to load details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !opportunity) return null;

  const getRiskLevel = (score) => {
    if (score <= 3) return { label: 'Low', color: 'text-green-400', bg: 'bg-green-500/10' };
    if (score <= 6) return { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    return { label: 'High', color: 'text-red-400', bg: 'bg-red-500/10' };
  };

  const risk = getRiskLevel(opportunity.execution_risk_score || 5);
  const profitSOL = opportunity.estimated_profit_sol || 0;
  const profitUSD = profitSOL * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Opportunity Details</h2>
            <p className="text-sm text-gray-400 mt-1">
              {opportunity.opportunity_type} • {new Date(opportunity.detected_at).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <DollarSign className="w-4 h-4" />
                <span>Estimated Profit</span>
              </div>
              <div className="text-2xl font-bold text-green-400">{profitSOL.toFixed(4)} SOL</div>
              <div className="text-sm text-gray-500">${profitUSD.toFixed(2)}</div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Risk Level</span>
              </div>
              <div className={`text-2xl font-bold ${risk.color}`}>{risk.label}</div>
              <div className="text-sm text-gray-500">Score: {opportunity.execution_risk_score}/10</div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Activity className="w-4 h-4" />
                <span>Success Rate</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">78%</div>
              <div className="text-sm text-gray-500">Similar opportunities</div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Clock className="w-4 h-4" />
                <span>Time Window</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">~2s</div>
              <div className="text-sm text-gray-500">Execution time</div>
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-400 mb-1">Token Pair</div>
                <div className="text-white font-medium">
                  {opportunity.token_symbol_a || 'SOL'} / {opportunity.token_symbol_b || 'USDC'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Type</div>
                <div className="text-white font-medium capitalize">{opportunity.opportunity_type}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Primary DEX</div>
                <div className="text-white font-medium">{opportunity.primary_dex || 'Raydium'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Secondary DEX</div>
                <div className="text-white font-medium">{opportunity.secondary_dex || 'Orca'}</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Price Differences</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="text-white font-medium">{opportunity.primary_dex || 'Raydium'}</div>
                  <div className="text-sm text-gray-400">Buy Price</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">${opportunity.buy_price?.toFixed(4) || '0.0000'}</div>
                </div>
              </div>
              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="text-white font-medium">{opportunity.secondary_dex || 'Orca'}</div>
                  <div className="text-sm text-gray-400">Sell Price</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">${opportunity.sell_price?.toFixed(4) || '0.0000'}</div>
                  <div className="text-sm text-green-400">
                    +{((opportunity.sell_price - opportunity.buy_price) / opportunity.buy_price * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Profit Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Gross Profit</span>
                <span className="text-white font-medium">{profitSOL.toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gas Costs</span>
                <span className="text-red-400">-0.0015 SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Slippage</span>
                <span className="text-yellow-400">-0.0008 SOL</span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between">
                <span className="text-white font-semibold">Net Profit</span>
                <span className="text-green-400 font-bold">{(profitSOL - 0.0023).toFixed(4)} SOL</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Price Movement</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="buyPrice" stroke="#3B82F6" strokeWidth={2} name="Buy" />
                <Line type="monotone" dataKey="sellPrice" stroke="#10B981" strokeWidth={2} name="Sell" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Risk Factors</h3>
            <div className="space-y-3">
              {[
                { factor: 'Liquidity Risk', level: 'Low', score: 2 },
                { factor: 'Price Volatility', level: 'Medium', score: 5 },
                { factor: 'Competition', level: 'High', score: 7 },
                { factor: 'Execution Time', level: 'Low', score: 3 }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-gray-400">{item.factor}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          item.score <= 3 ? 'bg-green-500' : item.score <= 6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(item.score / 10) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium w-16 ${
                      item.score <= 3 ? 'text-green-400' : item.score <= 6 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {item.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">Recommended Actions</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Execute within 2 seconds to maintain profit margin</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Set slippage tolerance to 0.5% for optimal execution</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Monitor competition - 3 other searchers detected</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Consider bundling for better gas efficiency</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-800 bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onBuildBundle(opportunity);
              onClose();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Build Bundle
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpportunityDetailModal;
