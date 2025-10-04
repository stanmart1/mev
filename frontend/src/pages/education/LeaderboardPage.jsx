import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, TrendingUp, Award, Zap, Target } from 'lucide-react';
import './LeaderboardPage.css';

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [category, setCategory] = useState('overall');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [category]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [leaderboardRes, rankRes] = await Promise.all([
        fetch(`/api/education/leaderboard?category=${category}&limit=100`, { headers }),
        token ? fetch('/api/education/my-rank', { headers }) : Promise.resolve({ json: () => ({ data: null }) })
      ]);

      const leaderboardData = await leaderboardRes.json();
      const rankData = await rankRes.json();

      setLeaderboard(leaderboardData.data || []);
      setUserRank(rankData.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown size={24} style={{ color: '#F59E0B' }} />;
    if (rank === 2) return <Medal size={24} style={{ color: '#9CA3AF' }} />;
    if (rank === 3) return <Medal size={24} style={{ color: '#CD7F32' }} />;
    return <span className="rank-number">#{rank}</span>;
  };

  const getCategoryIcon = (cat) => {
    const icons = {
      overall: <Trophy size={20} />,
      badges: <Award size={20} />,
      streak: <Zap size={20} />,
      modules: <Target size={20} />
    };
    return icons[cat] || icons.overall;
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      overall: 'Overall XP',
      badges: 'Badge Collection',
      streak: 'Learning Streak',
      modules: 'Modules Completed'
    };
    return labels[cat] || labels.overall;
  };

  if (loading) {
    return <div className="leaderboard-loading">Loading leaderboard...</div>;
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h1><Trophy size={32} /> Leaderboard</h1>
        <p>Compete with other learners and climb the ranks</p>
      </div>

      {userRank && (
        <div className="user-rank-card">
          <div className="rank-badge">
            {getRankIcon(userRank.rank || 999)}
          </div>
          <div className="rank-info">
            <h3>Your Rank</h3>
            <p className="rank-position">
              {userRank.rank ? `#${userRank.rank}` : 'Unranked'}
            </p>
          </div>
          <div className="rank-stats">
            <div className="rank-stat">
              <span className="stat-value">{userRank.total_xp}</span>
              <span className="stat-label">Total XP</span>
            </div>
            <div className="rank-stat">
              <span className="stat-value">Level {userRank.level}</span>
              <span className="stat-label">Current Level</span>
            </div>
          </div>
        </div>
      )}

      <div className="category-tabs">
        {['overall', 'badges', 'streak', 'modules'].map(cat => (
          <button
            key={cat}
            className={category === cat ? 'active' : ''}
            onClick={() => setCategory(cat)}
          >
            {getCategoryIcon(cat)}
            <span>{getCategoryLabel(cat)}</span>
          </button>
        ))}
      </div>

      <div className="leaderboard-table">
        <div className="table-header">
          <div className="col-rank">Rank</div>
          <div className="col-user">User</div>
          <div className="col-level">Level</div>
          {category === 'overall' && <div className="col-stat">Total XP</div>}
          {category === 'badges' && <div className="col-stat">Badges</div>}
          {category === 'streak' && <div className="col-stat">Streak</div>}
          {category === 'modules' && <div className="col-stat">Modules</div>}
          <div className="col-activity">Last Active</div>
        </div>

        {leaderboard.map((entry, index) => (
          <div
            key={entry.user_id}
            className={`table-row ${entry.user_id === userRank?.user_id ? 'current-user' : ''}`}
          >
            <div className="col-rank">
              {getRankIcon(entry.rank || index + 1)}
            </div>
            <div className="col-user">
              <div className="user-info">
                <div className="user-avatar">
                  {entry.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="username">{entry.username || 'Anonymous'}</span>
              </div>
            </div>
            <div className="col-level">
              <span className="level-badge">Level {entry.level}</span>
            </div>
            {category === 'overall' && (
              <div className="col-stat">
                <TrendingUp size={16} />
                <span>{entry.total_xp.toLocaleString()} XP</span>
              </div>
            )}
            {category === 'badges' && (
              <div className="col-stat">
                <Award size={16} />
                <span>{entry.badges_earned} badges</span>
                {entry.legendary_badges > 0 && (
                  <span className="legendary-count">({entry.legendary_badges} legendary)</span>
                )}
              </div>
            )}
            {category === 'streak' && (
              <div className="col-stat">
                <Zap size={16} />
                <span>{entry.streak_days} days</span>
              </div>
            )}
            {category === 'modules' && (
              <div className="col-stat">
                <Target size={16} />
                <span>{entry.modules_completed} completed</span>
              </div>
            )}
            <div className="col-activity">
              {new Date(entry.last_active).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {leaderboard.length === 0 && (
        <div className="no-data">
          <Trophy size={64} />
          <p>No leaderboard data available yet</p>
          <p className="hint">Complete modules to appear on the leaderboard!</p>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
