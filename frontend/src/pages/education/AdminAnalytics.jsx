import React, { useState, useEffect } from 'react';
import { Users, Activity, BookOpen, Code, TrendingUp, Star, Clock } from 'lucide-react';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [contentAnalytics, setContentAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const [adminRes, contentRes] = await Promise.all([
        fetch('/api/education/analytics/admin', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/education/analytics/content', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const adminData = await adminRes.json();
      const contentData = await contentRes.json();

      if (adminData.success) setAnalytics(adminData.data);
      if (contentData.success) setContentAnalytics(contentData.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const stats = [
    {
      icon: Users,
      label: 'Total Users',
      value: analytics?.total_users || 0,
      color: 'blue'
    },
    {
      icon: Activity,
      label: 'Active Users (7d)',
      value: analytics?.active_users || 0,
      color: 'green'
    },
    {
      icon: BookOpen,
      label: 'Modules Completed',
      value: analytics?.modules_completed || 0,
      color: 'purple'
    },
    {
      icon: Code,
      label: 'Code Submissions',
      value: analytics?.total_code_submissions || 0,
      color: 'orange'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Analytics</h1>
        <p className="text-gray-600">Platform-wide learning metrics and content performance</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Platform Metrics */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Platform Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(analytics?.avg_completion_time || 0)}m
            </div>
            <div className="text-sm text-gray-600">Avg Completion Time</div>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <div className="text-2xl font-bold text-gray-900">
              {analytics?.total_quiz_attempts || 0}
            </div>
            <div className="text-sm text-gray-600">Total Quiz Attempts</div>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(analytics?.avg_quiz_score || 0)}%
            </div>
            <div className="text-sm text-gray-600">Avg Quiz Score</div>
          </div>
          <div className="border-l-4 border-orange-500 pl-4">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(analytics?.avg_code_success_rate || 0)}%
            </div>
            <div className="text-sm text-gray-600">Code Success Rate</div>
          </div>
        </div>
      </div>

      {/* Content Performance */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Content Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quiz Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contentAnalytics.map((module) => (
                <tr key={module.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{module.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {module.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{module.total_users}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${module.completion_rate}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-900">{module.completion_rate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{module.avg_time_spent}m</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{module.avg_quiz_score}%</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="text-gray-900">{module.avg_rating || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{module.avg_difficulty || 'N/A'}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
