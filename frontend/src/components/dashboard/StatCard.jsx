import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from '../common/Card';

export default function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  loading = false,
}) {
  const changeColor = {
    positive: 'text-success-600',
    negative: 'text-danger-600',
    neutral: 'text-gray-500',
  }[changeType];

  const TrendIcon = changeType === 'positive' ? TrendingUp : TrendingDown;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {value}
          </p>
          {change && (
            <div className={`flex items-center mt-1 ${changeColor}`}>
              <TrendIcon className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">{change}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
            <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
        )}
      </div>
    </Card>
  );
}