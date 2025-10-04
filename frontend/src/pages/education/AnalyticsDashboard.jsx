import React, { useState, useEffect } from 'react';
import { Clock, Target, Award, TrendingUp, BookOpen, Code, CheckCircle, BarChart } from 'lucide-react';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/education/analytics/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-gray-500">No analytics data available</div>
      </div>
    );
  }

  const stats = [
    {
      icon: Clock,
      label: 'Time Spent',
      value: formatTime(analytics.timeSpent),
      color: 'blue'
    },
    {
      icon: BookOpen,
      label: 'Modules Completed',
      value: `${analytics.modulesCompleted}/${analytics.modulesStarted}`,
      color: 'green'
    },
    {
      icon: Target,
      label: 'Quiz Accuracy',
      value: `${analytics.quizAccuracy}%`,
      color: 'purple'
    },
    {
      icon: Code,
      label: 'Code Success Rate',
      value: `${analytics.codeSuccessRate}%`,
      color: 'orange'
    }
  ];

  const detailedStats = [
    { label: 'Modules Visited', value: analytics.modulesVisited },
    { label: 'Tutorials Visited', value: analytics.tutorialsVisited },
    { label: 'Quiz Attempts', value: analytics.quizAttempts },
    { label: 'Avg Quiz Time', value: `${analytics.avgQuizTime}s` },
    { label: 'Code Submissions', value: analytics.codeSubmissions },
    { label: 'Average Progress', value: `${analytics.avgProgress}%` }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Analytics</h1>
        <p className="text-gray-600">Track your learning progress and performance</p>
      </div>

      {/* Main Stats Grid */}
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

      {/* Detailed Stats */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <BarChart className="w-5 h-5 mr-2" />
          Detailed Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {detailedStats.map((stat, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4">
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Performance Insights
        </h2>
        <div className="space-y-4">
          {analytics.quizAccuracy >= 80 && (
            <div className="flex items-start p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
              <div>
                <div className="font-semibold text-green-900">Excellent Quiz Performance</div>
                <div className="text-sm text-green-700">You're scoring {analytics.quizAccuracy}% on quizzes. Keep it up!</div>
              </div>
            </div>
          )}
          {analytics.codeSuccessRate >= 70 && (
            <div className="flex items-start p-4 bg-blue-50 rounded-lg">
              <Code className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <div className="font-semibold text-blue-900">Strong Coding Skills</div>
                <div className="text-sm text-blue-700">{analytics.codeSuccessRate}% of your code submissions pass. Great work!</div>
              </div>
            </div>
          )}
          {analytics.modulesCompleted > 0 && (
            <div className="flex items-start p-4 bg-purple-50 rounded-lg">
              <Award className="w-5 h-5 text-purple-600 mr-3 mt-0.5" />
              <div>
                <div className="font-semibold text-purple-900">Modules Completed</div>
                <div className="text-sm text-purple-700">You've completed {analytics.modulesCompleted} modules. Keep learning!</div>
              </div>
            </div>
          )}
          {analytics.quizAccuracy < 60 && analytics.quizAttempts > 5 && (
            <div className="flex items-start p-4 bg-yellow-50 rounded-lg">
              <Target className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <div className="font-semibold text-yellow-900">Room for Improvement</div>
                <div className="text-sm text-yellow-700">Consider reviewing modules before taking quizzes to improve your score.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
