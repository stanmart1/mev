import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Award, TrendingUp, Clock, Brain, BarChart, Trophy, Medal, BookMarked } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ProgressStats from '../../components/ProgressStats';

const LearningJourney = () => {
  const [modules, setModules] = useState([]);
  const [tutorials, setTutorials] = useState([]);
  const [progress, setProgress] = useState([]);
  const [totalXP, setTotalXP] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const modulesRes = await api.get('/education/modules');
      setModules(modulesRes.data || []);

      const tutorialsRes = await api.get('/education/tutorials');
      setTutorials(tutorialsRes.data || []);

      if (user) {
        const progressRes = await api.get('/education/progress');
        setProgress(progressRes.data?.progress || []);
        setTotalXP(progressRes.data?.totalXP || 0);
        
        const recsRes = await api.get('/education/recommendations');
        setRecommendations(recsRes.data || []);
      }
    } catch (error) {
      console.error('Failed to load education data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getModuleProgress = (moduleId) => {
    return progress.find(p => p.module_id === moduleId);
  };

  const calculateLevel = (xp) => {
    if (xp >= 2100) return 5;
    if (xp >= 1200) return 4;
    if (xp >= 700) return 3;
    if (xp >= 300) return 2;
    return 1;
  };

  const getCategoryModules = (category) => {
    return modules.filter(m => m.category === category);
  };

  const categories = [
    { id: 'basics', name: 'Basics', icon: '🎓', color: 'blue' },
    { id: 'advanced', name: 'Advanced', icon: '⚡', color: 'purple' },
    { id: 'validators', name: 'Validators', icon: '📊', color: 'green' },
    { id: 'searchers', name: 'Searchers', icon: '🔍', color: 'orange' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-blue-400 text-xl">Loading learning journey...</div>
      </div>
    );
  }

  const level = calculateLevel(totalXP);
  const progressPercent = (totalXP / 2100) * 100;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Your Learning Journey</h1>
              <p className="text-gray-400">Master MEV on Solana through interactive lessons</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => navigate('/glossary')}
                className="px-6 py-3 bg-teal-600 rounded-lg hover:bg-teal-500 flex items-center gap-2 font-semibold"
              >
                <BookMarked size={20} />
                Glossary
              </button>
              <button
                onClick={() => navigate('/education/badges')}
                className="px-6 py-3 bg-amber-600 rounded-lg hover:bg-amber-500 flex items-center gap-2 font-semibold"
              >
                <Trophy size={20} />
                Badges
              </button>
              <button
                onClick={() => navigate('/education/leaderboard')}
                className="px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-500 flex items-center gap-2 font-semibold"
              >
                <Medal size={20} />
                Leaderboard
              </button>
              {user && (
                <button
                  onClick={() => navigate('/education/analytics')}
                  className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 flex items-center gap-2 font-semibold"
                >
                  <BarChart size={20} />
                  Analytics
                </button>
              )}
              <button
                onClick={() => navigate('/education/practice')}
                className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-500 flex items-center gap-2 font-semibold"
              >
                <TrendingUp size={20} />
                Practice Mode
              </button>
              <button
                onClick={() => navigate('/education/certifications')}
                className="px-6 py-3 bg-yellow-600 rounded-lg hover:bg-yellow-500 flex items-center gap-2 font-semibold"
              >
                <Award size={20} />
                Certifications
              </button>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {user && recommendations.length > 0 && (
          <div className="bg-blue-900 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">📚 Recommended for You</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.slice(0, 3).map(rec => (
                <div
                  key={rec.id}
                  onClick={() => navigate(`/education/module/${rec.slug}`)}
                  className="bg-blue-800 rounded-lg p-4 cursor-pointer hover:bg-blue-700 transition-all"
                >
                  <h3 className="font-semibold mb-2">{rec.title}</h3>
                  <p className="text-sm text-blue-200 mb-2">{rec.reason}</p>
                  <div className="text-xs text-blue-300">⭐ {rec.xp_reward} XP</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Stats */}
        {user && progress.length > 0 && (
          <ProgressStats progress={progress} totalXP={totalXP} modules={modules} />
        )}

        {/* Take Assessment CTA */}
        {user && recommendations.length === 0 && progress.length === 0 && (
          <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-8 mb-8 text-center">
            <Brain className="w-16 h-16 text-purple-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Get Your Personalized Learning Path</h2>
            <p className="text-gray-300 mb-6">Take a quick 8-question assessment to receive customized module recommendations</p>
            <button
              onClick={() => navigate('/education/assessment')}
              className="px-8 py-3 bg-purple-600 rounded-lg hover:bg-purple-500 font-semibold"
            >
              Start Assessment
            </button>
          </div>
        )}

        {/* Simple XP Progress for non-authenticated */}
        {!user && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-400">Level {level}</div>
                <div className="text-2xl font-bold">{totalXP} / 2,100 XP</div>
              </div>
              <Award className="w-12 h-12 text-yellow-400" />
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-sm text-gray-400 mt-2">
              {Math.round(progressPercent)}% Complete
            </div>
          </div>
        )}

        {/* Categories */}
        {categories.map(category => {
          const categoryModules = getCategoryModules(category.id);
          if (categoryModules.length === 0) return null;

          return (
            <div key={category.id} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{category.icon}</span>
                <h2 className="text-2xl font-bold">{category.name}</h2>
                <span className="text-gray-400">({categoryModules.length} modules)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryModules.map(module => {
                  const moduleProgress = getModuleProgress(module.id);
                  const isCompleted = moduleProgress?.status === 'completed';
                  const isInProgress = moduleProgress?.status === 'in_progress';

                  return (
                    <div
                      key={module.id}
                      onClick={() => navigate(`/education/module/${module.slug}`)}
                      className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 cursor-pointer transition-all border-2 border-transparent hover:border-blue-500"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{module.title}</h3>
                          <p className="text-sm text-gray-400 line-clamp-2">{module.description}</p>
                        </div>
                        {isCompleted && (
                          <div className="ml-2 text-green-400">✓</div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {module.estimated_time} min
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {module.xp_reward} XP
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded ${
                          module.difficulty === 'beginner' ? 'bg-green-900 text-green-400' :
                          module.difficulty === 'intermediate' ? 'bg-yellow-900 text-yellow-400' :
                          'bg-red-900 text-red-400'
                        }`}>
                          {module.difficulty}
                        </span>

                        {isInProgress && (
                          <div className="text-xs text-blue-400">
                            {moduleProgress.progress_percentage}% complete
                          </div>
                        )}
                      </div>

                      {isInProgress && (
                        <div className="mt-3 w-full bg-gray-700 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full"
                            style={{ width: `${moduleProgress.progress_percentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Tutorials */}
        {tutorials.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎮</span>
              <h2 className="text-2xl font-bold">Interactive Tutorials</h2>
              <span className="text-gray-400">({tutorials.length} tutorials)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tutorials.map(tutorial => (
                <div
                  key={tutorial.id}
                  onClick={() => navigate(`/education/tutorial/${tutorial.slug}`)}
                  className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 cursor-pointer transition-all border-2 border-transparent hover:border-purple-500"
                >
                  <h3 className="font-semibold text-lg mb-2">{tutorial.title}</h3>
                  <p className="text-sm text-gray-400 mb-3">{tutorial.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {tutorial.estimated_time} min
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {tutorial.xp_reward} XP
                    </div>
                    <span>{tutorial.total_steps} steps</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    tutorial.difficulty === 'beginner' ? 'bg-green-900 text-green-400' :
                    tutorial.difficulty === 'intermediate' ? 'bg-yellow-900 text-yellow-400' :
                    'bg-red-900 text-red-400'
                  }`}>
                    {tutorial.difficulty}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default LearningJourney;
