import { useState } from 'react';
import { Award, TrendingUp, Activity, DollarSign } from 'lucide-react';

const ValidatorComparison = () => {
  const [validators] = useState([
    { id: 1, name: 'Validator A', isJito: true, commission: 5, skipRate: 1.2, uptime: 99.8, mevRewards: 50000, score: 92 },
    { id: 2, name: 'Validator B', isJito: true, commission: 7, skipRate: 2.1, uptime: 99.5, mevRewards: 35000, score: 78 },
    { id: 3, name: 'Validator C', isJito: false, commission: 5, skipRate: 2.8, uptime: 99.2, mevRewards: 0, score: 65 },
    { id: 4, name: 'Validator D', isJito: true, commission: 4, skipRate: 1.8, uptime: 99.7, mevRewards: 42000, score: 85 },
    { id: 5, name: 'Validator E', isJito: false, commission: 8, skipRate: 4.5, uptime: 98.5, mevRewards: 0, score: 45 }
  ]);

  const [sortBy, setSortBy] = useState('score');

  const sortedValidators = [...validators].sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score;
    if (sortBy === 'skipRate') return a.skipRate - b.skipRate;
    if (sortBy === 'mevRewards') return b.mevRewards - a.mevRewards;
    if (sortBy === 'uptime') return b.uptime - a.uptime;
    return 0;
  });

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSkipRateColor = (rate) => {
    if (rate < 2) return 'text-green-400';
    if (rate < 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Award className="text-purple-400" />
          <h3 className="text-xl font-semibold">Validator Comparison</h3>
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 bg-gray-700 rounded text-sm">
          <option value="score">Sort by Score</option>
          <option value="skipRate">Sort by Skip Rate</option>
          <option value="mevRewards">Sort by MEV Rewards</option>
          <option value="uptime">Sort by Uptime</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-3 text-left">Validator</th>
              <th className="p-3 text-center">Type</th>
              <th className="p-3 text-center">Commission</th>
              <th className="p-3 text-center">Skip Rate</th>
              <th className="p-3 text-center">Uptime</th>
              <th className="p-3 text-center">MEV/Month</th>
              <th className="p-3 text-center">Score</th>
            </tr>
          </thead>
          <tbody>
            {sortedValidators.map((v, index) => (
              <tr key={v.id} className={`border-t border-gray-700 ${index < 3 ? 'bg-gray-750' : ''}`}>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {index < 3 && <span className="text-yellow-400">★</span>}
                    <span className="font-medium">{v.name}</span>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${v.isJito ? 'bg-blue-600' : 'bg-gray-600'}`}>
                    {v.isJito ? 'Jito' : 'Regular'}
                  </span>
                </td>
                <td className="p-3 text-center">{v.commission}%</td>
                <td className={`p-3 text-center font-semibold ${getSkipRateColor(v.skipRate)}`}>
                  {v.skipRate}%
                </td>
                <td className="p-3 text-center">{v.uptime}%</td>
                <td className="p-3 text-center">
                  {v.mevRewards > 0 ? `$${(v.mevRewards / 1000).toFixed(0)}K` : '-'}
                </td>
                <td className={`p-3 text-center font-bold ${getScoreColor(v.score)}`}>
                  {v.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-gray-700 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="text-green-400" size={14} />
            <span className="font-semibold">Skip Rate</span>
          </div>
          <div className="text-gray-400">
            <div className="text-green-400">• &lt;2% Excellent</div>
            <div className="text-yellow-400">• 2-5% Good</div>
            <div className="text-red-400">• &gt;5% Poor</div>
          </div>
        </div>

        <div className="bg-gray-700 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="text-blue-400" size={14} />
            <span className="font-semibold">Score</span>
          </div>
          <div className="text-gray-400">
            <div className="text-green-400">• 80+ Excellent</div>
            <div className="text-yellow-400">• 60-79 Good</div>
            <div className="text-red-400">• &lt;60 Avoid</div>
          </div>
        </div>

        <div className="bg-gray-700 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="text-yellow-400" size={14} />
            <span className="font-semibold">MEV Rewards</span>
          </div>
          <div className="text-gray-400">
            Only Jito validators earn MEV rewards from bundle tips
          </div>
        </div>

        <div className="bg-gray-700 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <Award className="text-purple-400" size={14} />
            <span className="font-semibold">Top 3</span>
          </div>
          <div className="text-gray-400">
            ★ Recommended validators for bundle submission
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <div className="font-semibold mb-2">💡 Recommendation</div>
        <div className="text-sm text-gray-300">
          Submit bundles to top 3 validators (★) for best inclusion rates. 
          All are Jito-enabled with excellent performance metrics.
        </div>
      </div>
    </div>
  );
};

export default ValidatorComparison;
