-- Migration: Add Gamification Enhancements
-- Description: Badge rarity/tiers, hidden achievements, and leaderboards

-- 1. Badge Definitions Table with Rarity Tiers
CREATE TABLE IF NOT EXISTS badge_definitions (
  id SERIAL PRIMARY KEY,
  badge_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  rarity VARCHAR(50) NOT NULL DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  category VARCHAR(100),
  is_hidden BOOLEAN DEFAULT FALSE,
  unlock_criteria JSONB NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Enhanced User Achievements with Rarity
ALTER TABLE user_achievements 
ADD COLUMN IF NOT EXISTS rarity VARCHAR(50),
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_required INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3. Leaderboard Table
CREATE TABLE IF NOT EXISTS leaderboards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  username VARCHAR(255),
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  modules_completed INTEGER DEFAULT 0,
  tutorials_completed INTEGER DEFAULT 0,
  badges_earned INTEGER DEFAULT 0,
  rare_badges INTEGER DEFAULT 0,
  epic_badges INTEGER DEFAULT 0,
  legendary_badges INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_active TIMESTAMP DEFAULT NOW(),
  rank INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 4. Daily Activity Tracking for Streaks
CREATE TABLE IF NOT EXISTS user_daily_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  activity_date DATE NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  modules_completed INTEGER DEFAULT 0,
  tutorials_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_badge_definitions_rarity ON badge_definitions(rarity);
CREATE INDEX IF NOT EXISTS idx_badge_definitions_hidden ON badge_definitions(is_hidden);
CREATE INDEX IF NOT EXISTS idx_user_achievements_rarity ON user_achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_leaderboards_total_xp ON leaderboards(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_rank ON leaderboards(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboards_user ON leaderboards(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON user_daily_activity(user_id, activity_date);

-- Insert Badge Definitions with Rarity Tiers
INSERT INTO badge_definitions (badge_id, name, description, rarity, category, is_hidden, unlock_criteria, xp_reward) VALUES
-- Common Badges (Starter achievements)
('mev_novice', 'MEV Novice', 'Complete your first MEV module', 'common', 'basics', FALSE, '{"type": "module_complete", "count": 1}', 100),
('first_steps', 'First Steps', 'Start your learning journey', 'common', 'basics', FALSE, '{"type": "tutorial_start", "count": 1}', 50),
('quick_learner', 'Quick Learner', 'Complete a module in under 5 minutes', 'common', 'speed', FALSE, '{"type": "module_time", "max_time": 300}', 150),

-- Uncommon Badges (Regular progression)
('jito_explorer', 'Jito Explorer', 'Master Jito protocol fundamentals', 'uncommon', 'basics', FALSE, '{"type": "module_complete", "module_id": "understanding-jito"}', 150),
('arbitrage_hunter', 'Arbitrage Hunter', 'Complete arbitrage strategies module', 'uncommon', 'advanced', FALSE, '{"type": "module_complete", "module_id": "arbitrage-strategies"}', 200),
('liquidation_expert', 'Liquidation Expert', 'Master liquidation hunting', 'uncommon', 'advanced', FALSE, '{"type": "module_complete", "module_id": "liquidation-hunting"}', 200),
('validator_analyst', 'Validator Analyst', 'Complete validator selection module', 'uncommon', 'validators', FALSE, '{"type": "module_complete", "module_id": "validator-selection"}', 150),
('dedicated_learner', 'Dedicated Learner', 'Complete 3 modules', 'uncommon', 'progression', FALSE, '{"type": "module_complete", "count": 3}', 200),

-- Rare Badges (Significant achievements)
('bundle_master', 'Bundle Master', 'Master bundle construction', 'rare', 'searchers', FALSE, '{"type": "module_complete", "module_id": "bundle-construction"}', 250),
('risk_manager', 'Risk Manager', 'Complete risk management module', 'rare', 'searchers', FALSE, '{"type": "module_complete", "module_id": "risk-management"}', 250),
('perfect_score', 'Perfect Score', 'Score 100% on any quiz', 'rare', 'achievement', FALSE, '{"type": "quiz_score", "score": 100}', 300),
('week_warrior', 'Week Warrior', 'Maintain a 7-day learning streak', 'rare', 'streak', FALSE, '{"type": "streak", "days": 7}', 350),
('tutorial_champion', 'Tutorial Champion', 'Complete all 4 tutorials', 'rare', 'tutorials', FALSE, '{"type": "tutorial_complete", "count": 4}', 400),

-- Epic Badges (Major accomplishments)
('mev_scholar', 'MEV Scholar', 'Complete all 7 learning modules', 'epic', 'mastery', FALSE, '{"type": "module_complete", "count": 7}', 500),
('speed_demon', 'Speed Demon', 'Complete 3 modules in one day', 'epic', 'speed', FALSE, '{"type": "modules_per_day", "count": 3}', 600),
('certification_master', 'Certification Master', 'Earn all 3 certifications', 'epic', 'certification', FALSE, '{"type": "certification_complete", "count": 3}', 700),
('month_champion', 'Month Champion', 'Maintain a 30-day learning streak', 'epic', 'streak', FALSE, '{"type": "streak", "days": 30}', 800),

-- Legendary Badges (Ultimate achievements)
('mev_legend', 'MEV Legend', 'Complete everything with perfect scores', 'legendary', 'mastery', FALSE, '{"type": "perfect_completion", "all": true}', 1000),
('hidden_master', 'Hidden Master', 'Unlock all hidden achievements', 'legendary', 'secrets', TRUE, '{"type": "hidden_complete", "count": 5}', 1500),

-- Hidden Achievements (Discoverable through exploration)
('night_owl', 'Night Owl', 'Complete a module between 12 AM - 4 AM', 'rare', 'secrets', TRUE, '{"type": "time_based", "hours": [0, 1, 2, 3]}', 300),
('early_bird', 'Early Bird', 'Complete a module between 5 AM - 7 AM', 'rare', 'secrets', TRUE, '{"type": "time_based", "hours": [5, 6]}', 300),
('code_ninja', 'Code Ninja', 'Submit working code on first try 5 times', 'epic', 'secrets', TRUE, '{"type": "first_try_success", "count": 5}', 500),
('perfectionist', 'Perfectionist', 'Score 100% on 5 different quizzes', 'epic', 'secrets', TRUE, '{"type": "perfect_quizzes", "count": 5}', 600),
('explorer', 'Explorer', 'Visit all module categories', 'uncommon', 'secrets', TRUE, '{"type": "category_explorer", "categories": ["basics", "advanced", "validators", "searchers"]}', 250)

ON CONFLICT (badge_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity = EXCLUDED.rarity,
  is_hidden = EXCLUDED.is_hidden,
  unlock_criteria = EXCLUDED.unlock_criteria,
  xp_reward = EXCLUDED.xp_reward;
