import React, { useState, useEffect } from 'react';
import { Trophy, Lock, Star, Award, Sparkles } from 'lucide-react';
import './BadgesPage.css';

const BadgesPage = () => {
  const [badges, setBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [allBadgesRes, userBadgesRes] = await Promise.all([
        fetch('/api/education/badges', { headers }),
        token ? fetch('/api/education/my-badges', { headers }) : Promise.resolve({ json: () => ({ data: [] }) })
      ]);

      const allBadgesData = await allBadgesRes.json();
      const userBadgesData = await userBadgesRes.json();

      setBadges(allBadgesData.data || []);
      setUserBadges(userBadgesData.data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity) => {
    const colors = {
      common: '#9CA3AF',
      uncommon: '#10B981',
      rare: '#3B82F6',
      epic: '#8B5CF6',
      legendary: '#F59E0B'
    };
    return colors[rarity] || colors.common;
  };

  const getRarityIcon = (rarity) => {
    if (rarity === 'legendary') return <Sparkles size={16} />;
    if (rarity === 'epic') return <Star size={16} />;
    return <Award size={16} />;
  };

  const isUnlocked = (badgeId) => {
    return userBadges.some(ub => ub.achievement_id === badgeId);
  };

  const filteredBadges = badges.filter(badge => {
    if (filter === 'all') return true;
    if (filter === 'unlocked') return isUnlocked(badge.badge_id);
    if (filter === 'locked') return !isUnlocked(badge.badge_id);
    return badge.rarity === filter;
  });

  const rarityStats = {
    common: badges.filter(b => b.rarity === 'common').length,
    uncommon: badges.filter(b => b.rarity === 'uncommon').length,
    rare: badges.filter(b => b.rarity === 'rare').length,
    epic: badges.filter(b => b.rarity === 'epic').length,
    legendary: badges.filter(b => b.rarity === 'legendary').length
  };

  const unlockedCount = userBadges.length;
  const totalCount = badges.filter(b => !b.is_hidden).length;
  const hiddenUnlocked = userBadges.filter(ub => {
    const badge = badges.find(b => b.badge_id === ub.achievement_id);
    return badge?.is_hidden;
  }).length;

  if (loading) {
    return <div className="badges-loading">Loading badges...</div>;
  }

  return (
    <div className="badges-page">
      <div className="badges-header">
        <h1><Trophy size={32} /> Badge Collection</h1>
        <p>Unlock achievements by completing modules, tutorials, and challenges</p>
      </div>

      <div className="badges-stats">
        <div className="stat-card">
          <div className="stat-value">{unlockedCount}/{totalCount}</div>
          <div className="stat-label">Badges Unlocked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{hiddenUnlocked}</div>
          <div className="stat-label">Hidden Badges</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round((unlockedCount / totalCount) * 100)}%</div>
          <div className="stat-label">Completion</div>
        </div>
      </div>

      <div className="badges-filters">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          All ({badges.length})
        </button>
        <button className={filter === 'unlocked' ? 'active' : ''} onClick={() => setFilter('unlocked')}>
          Unlocked ({unlockedCount})
        </button>
        <button className={filter === 'locked' ? 'active' : ''} onClick={() => setFilter('locked')}>
          Locked ({totalCount - unlockedCount})
        </button>
        <div className="filter-divider" />
        <button className={filter === 'legendary' ? 'active' : ''} onClick={() => setFilter('legendary')}>
          Legendary ({rarityStats.legendary})
        </button>
        <button className={filter === 'epic' ? 'active' : ''} onClick={() => setFilter('epic')}>
          Epic ({rarityStats.epic})
        </button>
        <button className={filter === 'rare' ? 'active' : ''} onClick={() => setFilter('rare')}>
          Rare ({rarityStats.rare})
        </button>
      </div>

      <div className="badges-grid">
        {filteredBadges.map(badge => {
          const unlocked = isUnlocked(badge.badge_id);
          const userBadge = userBadges.find(ub => ub.achievement_id === badge.badge_id);

          return (
            <div
              key={badge.id}
              className={`badge-card ${unlocked ? 'unlocked' : 'locked'} rarity-${badge.rarity}`}
              style={{ borderColor: getRarityColor(badge.rarity) }}
            >
              {!unlocked && badge.is_hidden && (
                <div className="badge-hidden-overlay">
                  <Lock size={48} />
                  <p>Hidden Achievement</p>
                </div>
              )}
              
              <div className="badge-icon" style={{ backgroundColor: getRarityColor(badge.rarity) + '20' }}>
                {unlocked ? (
                  <Trophy size={48} style={{ color: getRarityColor(badge.rarity) }} />
                ) : (
                  <Lock size={48} style={{ color: '#6B7280' }} />
                )}
              </div>

              <div className="badge-rarity" style={{ color: getRarityColor(badge.rarity) }}>
                {getRarityIcon(badge.rarity)}
                <span>{badge.rarity.toUpperCase()}</span>
              </div>

              <h3>{unlocked || !badge.is_hidden ? badge.name : '???'}</h3>
              <p className="badge-description">
                {unlocked || !badge.is_hidden ? badge.description : 'Complete hidden requirements to unlock'}
              </p>

              {unlocked && userBadge && (
                <div className="badge-earned">
                  <span className="xp-badge">+{badge.xp_reward} XP</span>
                  <span className="earned-date">
                    {new Date(userBadge.earned_at).toLocaleDateString()}
                  </span>
                </div>
              )}

              {!unlocked && !badge.is_hidden && (
                <div className="badge-locked-info">
                  <span className="xp-badge">+{badge.xp_reward} XP</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredBadges.length === 0 && (
        <div className="no-badges">
          <Trophy size={64} />
          <p>No badges found in this category</p>
        </div>
      )}
    </div>
  );
};

export default BadgesPage;
