import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const MarketIntelligence = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchMarketData();
  }, [timeRange]);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      const response = await api.getMarketIntelligence({ timeRange });
      setData(response);
    } catch (error) {
      console.error('Failed to fetch market intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-blue-400 text-xl">Loading market intelligence...</div>
      </div>
    );
  }

  const sentimentColor = data?.sentiment?.overall >= 70 ? 'text-green-400' : 
                         data?.sentiment?.overall >= 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Market Intelligence</h1>
            <p className="text-gray-400 mt-1">Solana MEV Ecosystem Trends</p>
          </div>
          <div className="flex gap-2">
            {['24h', '7d', '30d', '90d'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded ${timeRange === range ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total MEV Volume</div>
            <div className="text-2xl font-bold text-blue-400">{data?.metrics?.totalVolume?.toFixed(2)} SOL</div>
            <div className="text-sm text-green-400 mt-1">↑ {data?.metrics?.volumeChange}%</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Market Efficiency</div>
            <div className="text-2xl font-bold text-green-400">{data?.metrics?.efficiency}%</div>
            <div className="text-sm text-gray-400 mt-1">Avg spread: {data?.metrics?.avgSpread}%</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Competition Index</div>
            <div className="text-2xl font-bold text-yellow-400">{data?.metrics?.competitionIndex}/100</div>
            <div className="text-sm text-gray-400 mt-1">{data?.metrics?.activeSearchers} searchers</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Market Sentiment</div>
            <div className={`text-2xl font-bold ${sentimentColor}`}>{data?.sentiment?.overall}/100</div>
            <div className="text-sm text-gray-400 mt-1">{data?.sentiment?.trend}</div>
          </div>
        </div>

        {/* Most Profitable Token Pairs */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Most Profitable Token Pairs</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-2">Rank</th>
                  <th className="pb-2">Token Pair</th>
                  <th className="pb-2">Total Profit</th>
                  <th className="pb-2">Opportunities</th>
                  <th className="pb-2">Avg Profit</th>
                  <th className="pb-2">Success Rate</th>
                  <th className="pb-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data?.tokenPairs?.map((pair, idx) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="py-3">{idx + 1}</td>
                    <td className="py-3 font-semibold">{pair.pair}</td>
                    <td className="py-3 text-green-400">{pair.totalProfit.toFixed(2)} SOL</td>
                    <td className="py-3">{pair.opportunities}</td>
                    <td className="py-3">{pair.avgProfit.toFixed(3)} SOL</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${pair.successRate >= 70 ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>
                        {pair.successRate}%
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={pair.trend === 'up' ? 'text-green-400' : 'text-red-400'}>
                        {pair.trend === 'up' ? '↑' : '↓'} {pair.trendValue}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DEX Activity & Competition Levels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Most Active DEXs */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Most Active DEXs for MEV</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.dexActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="dex" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                <Bar dataKey="volume" fill="#3b82f6" name="Volume (SOL)" />
                <Bar dataKey="opportunities" fill="#10b981" name="Opportunities" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Competition Levels by Opportunity Type */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Competition by Opportunity Type</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.competitionLevels} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="type" type="category" stroke="#9ca3af" width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                <Bar dataKey="competition" fill="#f59e0b" name="Competition Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MEV Volume Over Time & Market Efficiency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* MEV Volume Trend */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">MEV Volume Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.volumeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                <Area type="monotone" dataKey="volume" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Volume (SOL)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Market Efficiency Over Time */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Market Efficiency Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.efficiencyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2} name="Efficiency %" />
                <Line type="monotone" dataKey="spread" stroke="#f59e0b" strokeWidth={2} name="Avg Spread %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Correlation Analysis */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">MEV Activity vs Market Conditions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MEV vs SOL Price */}
            <div>
              <h3 className="text-sm text-gray-400 mb-2">MEV Volume vs SOL Price</h3>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="solPrice" name="SOL Price" stroke="#9ca3af" />
                  <YAxis dataKey="mevVolume" name="MEV Volume" stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={data?.correlations?.solPrice} fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
              <div className="text-center text-sm text-gray-400 mt-2">
                Correlation: <span className="text-blue-400 font-semibold">{data?.correlations?.solPriceCorr}</span>
              </div>
            </div>

            {/* MEV vs Trading Volume */}
            <div>
              <h3 className="text-sm text-gray-400 mb-2">MEV Volume vs Trading Volume</h3>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="tradingVolume" name="Trading Volume" stroke="#9ca3af" />
                  <YAxis dataKey="mevVolume" name="MEV Volume" stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={data?.correlations?.tradingVolume} fill="#10b981" />
                </ScatterChart>
              </ResponsiveContainer>
              <div className="text-center text-sm text-gray-400 mt-2">
                Correlation: <span className="text-green-400 font-semibold">{data?.correlations?.tradingVolumeCorr}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment Indicators & Trend Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Sentiment Breakdown */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Sentiment Indicators</h2>
            <div className="space-y-4">
              {data?.sentiment?.indicators?.map((indicator, idx) => (
                <div key={idx}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-400">{indicator.name}</span>
                    <span className={`text-sm font-semibold ${indicator.value >= 70 ? 'text-green-400' : indicator.value >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {indicator.value}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${indicator.value >= 70 ? 'bg-green-400' : indicator.value >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${indicator.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunity Distribution */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Opportunity Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data?.opportunityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data?.opportunityDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Analysis */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Trend Analysis & Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data?.trends?.map((trend, idx) => (
              <div key={idx} className={`p-4 rounded-lg ${trend.type === 'positive' ? 'bg-green-900/20 border border-green-700' : trend.type === 'negative' ? 'bg-red-900/20 border border-red-700' : 'bg-blue-900/20 border border-blue-700'}`}>
                <div className={`text-sm font-semibold mb-2 ${trend.type === 'positive' ? 'text-green-400' : trend.type === 'negative' ? 'text-red-400' : 'text-blue-400'}`}>
                  {trend.title}
                </div>
                <div className="text-sm text-gray-300">{trend.description}</div>
                <div className="text-xs text-gray-500 mt-2">{trend.impact}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketIntelligence;
