import { Clock, TrendingUp, Zap, Users } from 'lucide-react';

const activityTypes = {
  mev_extraction: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
  bundle_submission: { icon: Zap, color: 'text-blue-600', bg: 'bg-blue-100' },
  validator_update: { icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' }
};

export default function ActivityFeed({ activities = [] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Live Activity</h3>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent activity</p>
        ) : (
          activities.map((activity, index) => {
            const { icon: Icon, color, bg } = activityTypes[activity.type] || activityTypes.mev_extraction;
            return (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className={`p-2 rounded-full ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.timestamp}
                    </span>
                  </div>
                  {activity.profit && (
                    <span className="text-xs text-green-600 font-medium">
                      +{activity.profit} SOL
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}