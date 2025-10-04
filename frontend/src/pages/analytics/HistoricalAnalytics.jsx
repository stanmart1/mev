import React, { useState, useEffect } from 'react';
import { Calendar, Download, TrendingUp, DollarSign, Activity, Target, FileText } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import apiService from '../../services/api';

const HistoricalAnalytics = () => {
  const [dateRange, setDateRange] = useState('7d');
  const [timeGranularity, setTimeGranularity] = useState('daily');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, timeGranularity]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAnalytics({ timeRange: dateRange });
      setAnalytics(data.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mev-analytics-${dateRange}.csv`;
    a.click();
  };

  const generateCSV = () => {
    if (!analytics) return '';
    let csv = 'Time,Opportunities,Profit (SOL)\n';
    analytics.profitOverTime?.forEach(row => {
      csv += `${row.time},${row.opportunities},${row.profit}\n`;
    });
    return csv;
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const totalProfit = analytics?.profitOverTime?.reduce((sum, item) => sum + item.profit, 0).toFixed(2) || '0.00';
    const totalOpps = analytics?.profitOverTime?.reduce((sum, item) => sum + item.opportunities, 0) || 0;
    
    doc.setFontSize(20);
    doc.text('MEV Analytics Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Date Range: ${dateRange.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    doc.setFontSize(12);
    doc.text('Summary Metrics', 14, 40);
    doc.autoTable({
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total MEV Extracted', `${totalProfit} SOL`],
        ['Opportunities Detected', totalOpps],
        ['Success Rate', '78.4%'],
        ['Average ROI', '245%']
      ]
    });
    
    doc.text('Profit Over Time', 14, doc.lastAutoTable.finalY + 15);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Time', 'Opportunities', 'Profit (SOL)']],
      body: analytics?.profitOverTime?.map(row => [
        row.time,
        row.opportunities,
        row.profit.toFixed(4)
      ]) || []
    });
    
    doc.save(`mev-analytics-${dateRange}.pdf`);
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const heatmapData = analytics?.heatmapData || [];

  const riskRewardData = analytics?.profitOverTime?.map((item, idx) => ({
    risk: (idx + 1) * 1.2,
    reward: item.profit,
    opportunities: item.opportunities
  })) || [];

  const cumulativeData = analytics?.profitOverTime?.reduce((acc, item, idx) => {
    const prev = acc[idx - 1]?.cumulative || 0;
    acc.push({ time: item.time, cumulative: prev + item.profit });
    return acc;
  }, []) || [];

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Historical Analytics</h1>
            <p className="text-gray-400 mt-1">Comprehensive MEV performance analysis</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400">Date Range:</span>
            </div>
            {['24h', '7d', '30d', '90d'].map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-gray-400">Granularity:</span>
              {['hourly', 'daily', 'weekly'].map(gran => (
                <button
                  key={gran}
                  onClick={() => setTimeGranularity(gran)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    timeGranularity === gran
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {gran}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Aggregate Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-gray-400">Total MEV Extracted</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {analytics?.profitOverTime?.reduce((sum, item) => sum + item.profit, 0).toFixed(2) || '0.00'} SOL
            </div>
            <div className="text-sm text-gray-400 mt-2">
              {analytics?.profitOverTime?.length || 0} data points
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-gray-400">Opportunities Detected</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {analytics?.profitOverTime?.reduce((sum, item) => sum + item.opportunities, 0) || 0}
            </div>
            <div className="text-sm text-gray-400 mt-2">
              Across {analytics?.opportunityTypes?.length || 0} types
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-gray-400">Success Rate</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {analytics?.successRates?.length > 0 
                ? `${(analytics.successRates.reduce((sum, r) => sum + r.rate, 0) / analytics.successRates.length).toFixed(1)}%`
                : '0.0%'
              }
            </div>
            <div className="text-sm text-green-400 mt-2">Average execution rate</div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="text-gray-400">Avg Profit/Opp</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {analytics?.profitOverTime?.length > 0
                ? `${(
                    analytics.profitOverTime.reduce((sum, item) => sum + item.profit, 0) /
                    analytics.profitOverTime.reduce((sum, item) => sum + item.opportunities, 0)
                  ).toFixed(4)} SOL`
                : '0.0000 SOL'
              }
            </div>
            <div className="text-sm text-green-400 mt-2">Per opportunity</div>
          </div>
        </div>

        {/* MEV Volume Over Time */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">MEV Volume Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics?.profitOverTime || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Legend />
              <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} name="Profit (SOL)" />
              <Line type="monotone" dataKey="opportunities" stroke="#10B981" strokeWidth={2} name="Opportunities" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Profit by Opportunity Type */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Profit by Opportunity Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.opportunityTypes || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Opportunity Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics?.opportunityTypes || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics?.opportunityTypes?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative Profits */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Cumulative Profits</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="cumulative" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk vs Reward Analysis */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Risk vs Reward Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" dataKey="risk" name="Risk Score" stroke="#9CA3AF" />
              <YAxis type="number" dataKey="reward" name="Profit (SOL)" stroke="#9CA3AF" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Scatter name="Opportunities" data={riskRewardData} fill="#8B5CF6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Profit Distribution */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Profit Distribution by Range</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics?.profitDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="range" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="count" fill="#3B82F6" name="Count" />
              <Bar dataKey="profit" fill="#10B981" name="Total Profit (SOL)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Heatmap - Best Times for Opportunities */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Best Times for Opportunities (Heatmap)</h3>
          <div className="grid grid-cols-8 gap-1">
            <div className="text-xs text-gray-400 p-2"></div>
            {['00', '04', '08', '12', '16', '20', '24'].map(hour => (
              <div key={hour} className="text-xs text-gray-400 text-center p-2">{hour}:00</div>
            ))}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <React.Fragment key={day}>
                <div className="text-xs text-gray-400 p-2">{day}</div>
                {[0, 4, 8, 12, 16, 20, 24].map(hour => {
                  const cell = heatmapData.find(d => d.day === day && d.hour === `${String(hour).padStart(2, '0')}:00`);
                  const value = cell?.value || 0;
                  const intensity = Math.min(value / 50, 1);
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="p-2 rounded text-xs text-center transition-colors"
                      style={{
                        backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                        color: intensity > 0.5 ? '#fff' : '#9CA3AF'
                      }}
                      title={`${day} ${hour}:00 - ${value} opportunities`}
                    >
                      {value}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Validator Performance Comparison */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Top Validator Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics?.validatorPerformance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Legend />
              <Line type="monotone" dataKey="rewards" stroke="#F59E0B" strokeWidth={2} name="Rewards (SOL)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Success Rate Trends */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Success Rate Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics?.successRates || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                formatter={(value) => `${value.toFixed(1)}%`}
              />
              <Line type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2} name="Success Rate (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default HistoricalAnalytics;
