-- Add adaptive learning system

-- Create learning paths table
CREATE TABLE IF NOT EXISTS learning_paths (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  skill_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  recommended_modules JSONB, -- Array of module IDs in order
  completed_modules JSONB DEFAULT '[]',
  current_module_id INTEGER,
  learning_style VARCHAR(50), -- 'visual', 'hands-on', 'theoretical'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create skill assessments table
CREATE TABLE IF NOT EXISTS skill_assessments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  assessment_type VARCHAR(50), -- 'initial', 'progress', 'final'
  questions JSONB,
  answers JSONB,
  score INTEGER,
  skill_level VARCHAR(50),
  weak_areas JSONB, -- Array of topics needing improvement
  strong_areas JSONB, -- Array of mastered topics
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Create module recommendations table
CREATE TABLE IF NOT EXISTS module_recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  module_id INTEGER,
  reason VARCHAR(255), -- 'skill_gap', 'next_in_path', 'similar_interest'
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_learning_paths ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments ON skill_assessments(user_id, assessment_type);
CREATE INDEX IF NOT EXISTS idx_recommendations ON module_recommendations(user_id, priority DESC);

-- Seed initial assessment questions
INSERT INTO skill_assessments (user_id, assessment_type, questions, answers, score, skill_level, completed_at) VALUES
(0, 'template', '[
  {
    "id": 1,
    "question": "Have you worked with blockchain technology before?",
    "options": ["Never", "Basic knowledge", "Intermediate", "Expert"],
    "category": "experience",
    "weight": 3
  },
  {
    "id": 2,
    "question": "How familiar are you with DeFi concepts?",
    "options": ["Not at all", "Heard of it", "Use DeFi apps", "Build DeFi apps"],
    "category": "defi",
    "weight": 3
  },
  {
    "id": 3,
    "question": "Do you understand what arbitrage is?",
    "options": ["No", "Vaguely", "Yes, conceptually", "Yes, I''ve done it"],
    "category": "arbitrage",
    "weight": 2
  },
  {
    "id": 4,
    "question": "Have you used Solana before?",
    "options": ["Never", "As a user", "Built simple apps", "Built complex apps"],
    "category": "solana",
    "weight": 2
  },
  {
    "id": 5,
    "question": "What''s your programming experience?",
    "options": ["None", "Beginner", "Intermediate", "Advanced"],
    "category": "programming",
    "weight": 3
  },
  {
    "id": 6,
    "question": "How do you prefer to learn?",
    "options": ["Reading theory", "Watching videos", "Hands-on coding", "Mix of all"],
    "category": "learning_style",
    "weight": 1
  },
  {
    "id": 7,
    "question": "What''s your goal with MEV?",
    "options": ["Understand basics", "Build MEV bots", "Optimize strategies", "Research/Analysis"],
    "category": "goal",
    "weight": 2
  },
  {
    "id": 8,
    "question": "Do you know what Jito is?",
    "options": ["Never heard of it", "Heard the name", "Know what it does", "Used it"],
    "category": "jito",
    "weight": 2
  }
]', '{}', 0, 'beginner', NOW());
