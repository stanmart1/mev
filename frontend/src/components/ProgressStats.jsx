import React from 'react';
import { Award, TrendingUp, Clock, Target } from 'lucide-react';

const ProgressStats = ({ progress, totalXP, modules }) => {
  const completedModules = progress.filter(p => p.status === 'completed').length;
  const inProgressModules = progress.filter(p => p.status === 'in_progress').length;
  const totalModules = modules.length;
  const completionRate = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  
  const calculateLevel = (xp) => {
    if (xp >= 2100) return 5;
    if (xp >= 1200) return 4;
    if (xp >= 700) return 3;
    if (xp >= 300) return 2;
    return 1;
  };
  
  const level = calculateLevel(totalXP);
  const nextLevelXP = level === 5 ? 2100 : [300, 700, 1200, 2100][level];
  const prevLevelXP = level === 1 ? 0 : [0, 300, 700, 1200][level - 1];
  const levelProgress = ((totalXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100;

  const stats = [
    {
      icon: Target,
      label: 'Completion Rate',
      value: `${completionRate}%`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      icon: Award,
      label: 'Level',
      value: level,
      subValue: `${totalXP} XP`,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20'
    },
    {
      icon: TrendingUp,
      label: 'Completed',
      value: completedModules,
      subValue: `of ${totalModules}`,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      icon: Clock,
      label: 'In Progress',
      value: inProgressModules,
      subValue: 'modules',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    }
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-8">
      <h3 className="text-xl font-bold mb-4">Your Progress</h3>
      
      {/* Level Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Level {level}</span>
          <span className="text-sm text-gray-400">
            {level === 5 ? 'Max Level!' : `${totalXP} / ${nextLevelXP} XP`}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${level === 5 ? 100 : levelProgress}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-700 rounded-lg p-4">
            <div className={`${stat.bgColor} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-xs text-gray-400">{stat.label}</div>
            {stat.subValue && <div className="text-xs text-gray-500 mt-1">{stat.subValue}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressStats;
