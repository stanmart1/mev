-- Migration: Create Education Hub Tables
-- Description: Tables for learning modules, tutorials, quizzes, and progress tracking

-- 1. Learning Modules Table
CREATE TABLE IF NOT EXISTS learning_modules (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50),
  estimated_time INTEGER,
  order_index INTEGER,
  prerequisites JSONB DEFAULT '[]',
  xp_reward INTEGER DEFAULT 0,
  badge_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Module Content Table
CREATE TABLE IF NOT EXISTS module_content (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
  section_order INTEGER NOT NULL,
  section_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Quizzes Table
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  passing_score INTEGER DEFAULT 70,
  questions JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Interactive Tutorials Table
CREATE TABLE IF NOT EXISTS interactive_tutorials (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50),
  estimated_time INTEGER,
  total_steps INTEGER,
  category VARCHAR(100),
  prerequisites JSONB DEFAULT '[]',
  xp_reward INTEGER DEFAULT 0,
  badge_id VARCHAR(100),
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Tutorial Steps Table
CREATE TABLE IF NOT EXISTS tutorial_steps (
  id SERIAL PRIMARY KEY,
  tutorial_id INTEGER REFERENCES interactive_tutorials(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  validation_rules JSONB,
  hints JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. User Learning Progress Table
CREATE TABLE IF NOT EXISTS user_learning_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'not_started',
  progress_percentage INTEGER DEFAULT 0,
  quiz_score INTEGER,
  quiz_attempts INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  last_section INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  started_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- 7. User Tutorial Progress Table
CREATE TABLE IF NOT EXISTS user_tutorial_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  tutorial_id INTEGER REFERENCES interactive_tutorials(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  completed_steps JSONB DEFAULT '[]',
  code_submissions JSONB DEFAULT '{}',
  quiz_scores JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'not_started',
  time_spent INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  started_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tutorial_id)
);

-- 8. User Achievements Table
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_id VARCHAR(100) NOT NULL,
  earned_at TIMESTAMP DEFAULT NOW(),
  xp_earned INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- 9. Interactive Exercises Table
CREATE TABLE IF NOT EXISTS interactive_exercises (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
  exercise_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  instructions TEXT,
  starter_code TEXT,
  solution TEXT,
  test_cases JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_learning_modules_category ON learning_modules(category);
CREATE INDEX IF NOT EXISTS idx_learning_modules_order ON learning_modules(order_index);
CREATE INDEX IF NOT EXISTS idx_module_content_module ON module_content(module_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_module ON quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_tutorials_category ON interactive_tutorials(category);
CREATE INDEX IF NOT EXISTS idx_tutorial_steps_tutorial ON tutorial_steps(tutorial_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tutorial_progress_user ON user_tutorial_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- Insert initial modules
INSERT INTO learning_modules (slug, category, title, description, difficulty, estimated_time, order_index, xp_reward, badge_id) VALUES
('what-is-mev', 'basics', 'What is MEV?', 'Introduction to Maximum Extractable Value on Solana', 'beginner', 8, 1, 100, 'mev_novice'),
('understanding-jito', 'basics', 'Understanding Jito', 'Learn about Jito protocol and MEV-enabled validators', 'beginner', 10, 2, 150, 'jito_explorer'),
('arbitrage-strategies', 'advanced', 'Arbitrage Strategies', 'Master cross-DEX arbitrage opportunities', 'intermediate', 12, 3, 200, 'arbitrage_hunter'),
('liquidation-hunting', 'advanced', 'Liquidation Hunting', 'Identify and execute liquidation opportunities', 'intermediate', 12, 4, 200, 'liquidation_expert'),
('validator-selection', 'validators', 'Validator Selection', 'Choose optimal validators for MEV extraction', 'intermediate', 10, 5, 150, 'validator_analyst'),
('bundle-construction', 'searchers', 'Bundle Construction', 'Build and optimize MEV bundles', 'advanced', 15, 6, 250, 'bundle_master'),
('risk-management', 'searchers', 'Risk Management', 'Assess and mitigate MEV extraction risks', 'advanced', 10, 7, 250, 'risk_manager')
ON CONFLICT (slug) DO NOTHING;
