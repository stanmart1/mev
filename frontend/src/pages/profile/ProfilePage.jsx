import React, { useState, useEffect } from 'react';
import { User, Mail, Award, BookOpen, Code, Clock, TrendingUp, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const ProfilePage = ({ embedded = false }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const [profileRes, analyticsRes, achievementsRes] = await Promise.all([
        api.get('/auth/profile'),
        api.get('/education/analytics/dashboard'),
        api.get('/education/achievements')
      ]);

      setProfile(profileRes);
      setAnalytics(analyticsRes);
      setAchievements(achievementsRes || []);
      setFormData({ username: profileRes.username, email: profileRes.email });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put('/auth/profile', formData);
      setProfile({ ...profile, ...formData });
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setEditingPassword(false);
      alert('Password updated successfully');
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Failed to update password');
    }
  };

  const calculateLevel = (xp) => {
    if (xp >= 2100) return 5;
    if (xp >= 1200) return 4;
    if (xp >= 700) return 3;
    if (xp >= 300) return 2;
    return 1;
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const totalXP = achievements.reduce((sum, a) => sum + (a.xp_earned || 0), 0);
  const level = calculateLevel(totalXP);
  const nextLevelXP = level === 5 ? 2100 : [300, 700, 1200, 2100][level];
  const progressToNext = ((totalXP / nextLevelXP) * 100).toFixed(1);

  return (
    <div className={embedded ? 'p-6' : 'min-h-screen bg-gray-900 text-white p-6'}>
      <div className="max-w-6xl mx-auto">
        {!embedded && <h1 className="text-3xl font-bold mb-8">My Profile</h1>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl font-bold">
                  {profile?.username?.charAt(0).toUpperCase()}
                </div>
              </div>

              {!editing ? (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-1">{profile?.username}</h2>
                    <p className="text-gray-400 text-sm">{profile?.email}</p>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setEditingPassword(true)}
                      className="w-full py-2 bg-gray-600 hover:bg-gray-700 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Change Password
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setFormData({ username: profile?.username || '', email: profile?.email || '' });
                      }}
                      className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {editingPassword && (
                <div className="space-y-4">
                  {passwordError && (
                    <div className="bg-red-900/20 border border-red-700 text-red-200 px-3 py-2 rounded text-sm">
                      {passwordError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePasswordChange}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Update Password
                    </button>
                    <button
                      onClick={() => {
                        setEditingPassword(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setPasswordError('');
                      }}
                      className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Level {level}</span>
                  <span className="text-sm text-gray-400">{totalXP} / {nextLevelXP} XP</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                    style={{ width: `${progressToNext}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {level === 5 ? 'Max Level!' : `${nextLevelXP - totalXP} XP to Level ${level + 1}`}
                </p>
              </div>
            </div>
          </div>

          {/* Stats & Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-400">Modules</span>
                </div>
                <div className="text-2xl font-bold">{analytics?.modulesCompleted || 0}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-gray-400">Time</span>
                </div>
                <div className="text-2xl font-bold">{formatTime(analytics?.timeSpent || 0)}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-gray-400">Quiz</span>
                </div>
                <div className="text-2xl font-bold">{analytics?.quizAccuracy || 0}%</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-5 h-5 text-orange-400" />
                  <span className="text-sm text-gray-400">Code</span>
                </div>
                <div className="text-2xl font-bold">{analytics?.codeSuccessRate || 0}%</div>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-400" />
                Achievements ({achievements.length})
              </h3>
              {achievements.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="bg-gray-700 rounded-lg p-4 text-center hover:bg-gray-600 transition-colors"
                    >
                      <div className="text-3xl mb-2">
                        {achievement.achievement_type === 'module_completion' ? '📚' : 
                         achievement.achievement_type === 'certification' ? '🏆' : '⭐'}
                      </div>
                      <div className="text-sm font-semibold mb-1">{achievement.achievement_id}</div>
                      <div className="text-xs text-gray-400">+{achievement.xp_earned} XP</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(achievement.earned_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No achievements yet. Start learning to earn badges!</p>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Learning Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Modules Started</span>
                  <span className="font-bold">{analytics?.modulesStarted || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Quiz Attempts</span>
                  <span className="font-bold">{analytics?.quizAttempts || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Code Submissions</span>
                  <span className="font-bold">{analytics?.codeSubmissions || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Average Progress</span>
                  <span className="font-bold">{analytics?.avgProgress || 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
