import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Award, AlertCircle, Download, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const SearcherPerformance = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');
  const [performance, setPerformance] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, [timeRange]);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getSearcherPerformance(user?.userId, { timeRange });
      setPerformance(data.data);
      setGoals(data.data.goals || []);
    } catch (error) {
      console.error('Failed to load performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6'];

  const suggestions = [
    { type: 'success', text: 'Your success rate is above network average. Keep it up!' },
    { type: 'warning', text: 'Consider focusing on arbitrage opportunities - highest ROI for you' },
    { type: 'info', text: 'Peak performance hours: 12:00-16:00 UTC' }
  ];

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Searcher Performance</h1>
            <p className="text-gray-400 mt-1">Track your MEV extraction performance</p>
          </div>
          <div className="flex gap-2">
            {['24h', '7d', '30d', '90d'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  timeRange === range ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Personal Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-gray-400">Bundles Submitted</span>
            </div>
            <div className="text-3xl font-bold text-white">{performance?.bundlesSubmitted || 0}</div>
            <div className="text-sm text-gray-400 mt-2">
              {performance?.bundlesExecuted || 0} executed
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-gray-400">Success Rate</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {performance?.successRate?.toFixed(1) || 0}%
            </div>
            <div className={`text-sm mt-2 ${
              (performance?.successRate || 0) > (performance?.networkAverage?.successRate || 0)
                ? 'text-green-400' : 'text-red-400'
            }`}>
              Network avg: {performance?.networkAverage?.successRate?.toFixed(1) || 0}%
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-gray-400">Total Profit</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {performance?.totalProfit?.toFixed(4) || 0} SOL
            </div>
            <div className="text-sm text-gray-400 mt-2">
              ${(performance?.totalProfitUSD || 0).toFixed(2)} USD
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Award className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="text-gray-400">Best Opportunity</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {performance?.bestOpportunity?.profit?.toFixed(4) || 0} SOL
            </div>
            <div className="text-sm text-gray-400 mt-2">
              {performance?.bestOpportunity?.type || 'N/A'}
            </div>
          </div>
        </div>

        {/* Performance vs Network */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Performance Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performance?.comparison || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="metric" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="you" fill="#3B82F6" name="You" />
                <Bar dataKey="network" fill="#6B7280" name="Network Avg" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Opportunity Type Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={performance?.opportunityTypes || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {performance?.opportunityTypes?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit/Loss Statement */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Profit/Loss Statement</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 font-medium py-3 px-4">Date</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">Type</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">Tx Hash</th>
                  <th className="text-right text-gray-400 font-medium py-3 px-4">Profit (SOL)</th>
                  <th className="text-right text-gray-400 font-medium py-3 px-4">Gas Cost</th>
                  <th className="text-right text-gray-400 font-medium py-3 px-4">Net P&L</th>
                  <th className="text-center text-gray-400 font-medium py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {performance?.transactions?.map((tx, idx) => (
                  <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-gray-300">{new Date(tx.timestamp).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-sm">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-sm">
                      {tx.txHash?.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-right text-green-400">
                      {tx.profit?.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {tx.gasCost?.toFixed(4)}
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      tx.netPL > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.netPL?.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tx.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Goals & Suggestions */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Performance Goals</h3>
            <div className="space-y-4">
              {goals.map((goal, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">{goal.name}</span>
                    <span className="text-sm text-gray-400">
                      {goal.current}/{goal.target}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Performance Suggestions</h3>
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${
                  suggestion.type === 'success' ? 'bg-green-500/10' :
                  suggestion.type === 'warning' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
                }`}>
                  <AlertCircle className={`w-5 h-5 mt-0.5 ${
                    suggestion.type === 'success' ? 'text-green-400' :
                    suggestion.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                  }`} />
                  <p className="text-gray-300 text-sm">{suggestion.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Profit Trend */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Profit Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performance?.profitTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} name="Profit (SOL)" />
              <Line type="monotone" dataKey="cumulative" stroke="#3B82F6" strokeWidth={2} name="Cumulative" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SearcherPerformance;
