import { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, Filter, ExternalLink, TrendingUp, Package, Users, Clock, Hash } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import Button from '../common/Button';
import Card from '../common/Card';
import { formatTimeAgo } from '../../utils/formatters';

const activityTypes = {
  mev_extraction: { 
    label: 'MEV Extraction', 
    icon: TrendingUp, 
    color: 'text-green-600', 
    bg: 'bg-green-100 dark:bg-green-900' 
  },
  bundle_submission: { 
    label: 'Bundle Submission', 
    icon: Package, 
    color: 'text-blue-600', 
    bg: 'bg-blue-100 dark:bg-blue-900' 
  },
  validator_update: { 
    label: 'Validator Update', 
    icon: Users, 
    color: 'text-purple-600', 
    bg: 'bg-purple-100 dark:bg-purple-900' 
  }
};

export default function LiveActivityFeed() {
  const { demoMode } = useDemo();
  const { subscribe, unsubscribe } = useWebSocket();
  const [activities, setActivities] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all',
    showProfit: false
  });
  const [isLoading, setIsLoading] = useState(true);

  const generateMockActivity = () => ({
    id: `activity_${Date.now()}_${Math.random()}`,
    type: ['mev_extraction', 'bundle_submission', 'validator_update'][Math.floor(Math.random() * 3)],
    txHash: `${Math.random().toString(36).substring(2, 15)}...${Math.random().toString(36).substring(2, 7)}`,
    blockNumber: Math.floor(Math.random() * 1000000) + 200000000,
    profit: Math.random() > 0.6 ? Math.random() * 5 + 0.1 : null,
    timestamp: new Date().toISOString(),
    description: generateDescription(),
    validator: Math.random() > 0.5 ? `Validator ${Math.floor(Math.random() * 100) + 1}` : null,
    bundleId: Math.random() > 0.7 ? `bundle_${Math.random().toString(36).substring(2, 10)}` : null
  });

  const generateDescription = () => {
    const descriptions = [
      'Arbitrage executed on SOL/USDC pair',
      'Liquidation opportunity captured',
      'Sandwich attack on RAY/USDT',
      'Bundle submitted to Jito',
      'Validator performance updated',
      'MEV reward distributed',
      'Cross-DEX arbitrage completed'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch('/api/activity/recent');
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            setActivities(data);
          }
        }
      } catch (error) {
        // Silently fail - activity feed is not critical
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  useEffect(() => {
    const handleActivityUpdate = (data) => {
      setActivities(prev => [data, ...prev.slice(0, 99)]);
    };

    subscribe('ACTIVITY_FEED', handleActivityUpdate);

    return () => {
      unsubscribe('ACTIVITY_FEED', handleActivityUpdate);
    };
  }, [subscribe, unsubscribe]);

  const filteredActivities = useMemo(() => {
    let filtered = [...activities];

    if (filters.type !== 'all') {
      filtered = filtered.filter(activity => activity.type === filters.type);
    }

    if (filters.showProfit) {
      filtered = filtered.filter(activity => activity.profit !== null);
    }

    return filtered;
  }, [activities, filters]);

  const handleActivityClick = useCallback((activity) => {
    if (activity.txHash) {
      window.open(`https://solscan.io/tx/${activity.txHash}`, '_blank');
    }
  }, []);

  const ActivityItem = ({ activity, isNew = false }) => {
    const typeConfig = activityTypes[activity.type];
    const Icon = typeConfig.icon;

    return (
      <div 
        className={`p-4 border-l-4 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer ${
          isNew ? 'animate-slideIn border-l-blue-500' : ''
        }`}
        onClick={() => handleActivityClick(activity)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${typeConfig.bg}`}>
              <Icon className={`w-4 h-4 ${typeConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {typeConfig.label}
                </span>
                {activity.profit && (
                  <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full">
                    +{activity.profit.toFixed(4)} SOL
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {activity.description}
              </p>
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                {activity.txHash && (
                  <div className="flex items-center space-x-1">
                    <Hash className="w-3 h-3" />
                    <span className="font-mono">{activity.txHash}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <span>Block:</span>
                  <span className="font-mono">{activity.blockNumber.toLocaleString()}</span>
                </div>
                {activity.validator && (
                  <span>{activity.validator}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(activity.timestamp)}</span>
            {activity.txHash && (
              <ExternalLink className="w-3 h-3" />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Live Activity Feed
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({filteredActivities.length} items)
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
          >
            <option value="all">All Activities</option>
            <option value="mev_extraction">MEV Extractions</option>
            <option value="bundle_submission">Bundle Submissions</option>
            <option value="validator_update">Validator Updates</option>
          </select>
          
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={filters.showProfit}
              onChange={(e) => setFilters(prev => ({ ...prev, showProfit: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span>Profitable only</span>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-96">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading activities...</span>
          </div>
        ) : filteredActivities.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredActivities.map((activity, index) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity} 
                isNew={index === 0 && activities.length > 20}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No activities match your filters</p>
            <p className="text-sm">Try adjusting your filter criteria</p>
          </div>
        )}
      </div>

      <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Last update: {formatTimeAgo(Date.now())}
          </span>
          <div className="flex items-center space-x-4">
            <span>
              Total Profit: {filteredActivities
                .filter(a => a.profit)
                .reduce((sum, a) => sum + a.profit, 0)
                .toFixed(4)} SOL
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}