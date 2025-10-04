import { Star, TrendingUp, Shield, Zap } from 'lucide-react';
import { useState } from 'react';

export default function ValidatorCard({ validator, onFavorite }) {
  const [isFavorited, setIsFavorited] = useState(validator.isFavorited || false);

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    onFavorite?.(validator.address, !isFavorited);
  };

  const getPerformanceColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {validator.name || `Validator ${validator.address.slice(0, 8)}...`}
            </h3>
            {validator.isJitoEnabled && (
              <Zap className="w-4 h-4 text-yellow-500" title="Jito Enabled" />
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
            {validator.address.slice(0, 12)}...{validator.address.slice(-8)}
          </p>
        </div>
        <button
          onClick={handleFavorite}
          className={`p-2 rounded-full ${isFavorited ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
        >
          <Star className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Stake</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {(validator.totalStake / 1000000).toFixed(1)}M SOL
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Commission</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {validator.commission}%
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">MEV Earnings (24h)</span>
          <span className="text-sm font-medium text-green-600">
            +{validator.mevEarnings24h.toFixed(3)} SOL
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Success Rate</span>
          <span className="text-sm font-medium text-blue-600">
            {validator.successRate.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Performance Score</span>
          <span className={`text-sm font-medium ${getPerformanceColor(validator.performanceScore)}`}>
            {validator.performanceScore}/100
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Rank #{validator.rank}</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600">+{validator.apy.toFixed(2)}% APY</span>
          </div>
        </div>
      </div>
    </div>
  );
}