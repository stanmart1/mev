import { useState } from 'react';
import { Activity, Download, Filter } from 'lucide-react';
import LiveActivityFeed from '../../components/activity/LiveActivityFeed';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

export default function ActivityPage() {
  const stats = [
    { label: 'Total Activities', value: '2,847', change: '+15%', color: 'text-blue-600' },
    { label: 'MEV Extractions', value: '1,234', change: '+12%', color: 'text-green-600' },
    { label: 'Bundle Submissions', value: '987', change: '+8%', color: 'text-purple-600' },
    { label: 'Validator Updates', value: '626', change: '+5%', color: 'text-orange-600' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Live Activity Feed
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time MEV extractions, bundle submissions, and validator updates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="ghost" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Advanced Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600">{stat.change}</p>
                <Activity className="w-4 h-4 text-gray-400 mt-1" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <LiveActivityFeed />
    </div>
  );
}