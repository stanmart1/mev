-- Add practice mode support

-- Add practice mode flag to progress tables
ALTER TABLE user_learning_progress ADD COLUMN IF NOT EXISTS is_practice_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE user_tutorial_progress ADD COLUMN IF NOT EXISTS is_practice_mode BOOLEAN DEFAULT FALSE;

-- Create practice sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  content_type VARCHAR(50) NOT NULL, -- 'module' or 'tutorial'
  content_id INTEGER NOT NULL,
  attempts INTEGER DEFAULT 0,
  best_score INTEGER,
  total_time_spent INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for practice sessions
CREATE INDEX IF NOT EXISTS idx_practice_sessions ON practice_sessions(user_id, content_type, content_id);

-- Create code challenges library table
CREATE TABLE IF NOT EXISTS code_challenges (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50),
  category VARCHAR(100),
  starter_code TEXT,
  solution TEXT,
  test_cases JSONB,
  hints JSONB,
  xp_reward INTEGER DEFAULT 0,
  time_limit INTEGER, -- in seconds
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed some practice challenges
INSERT INTO code_challenges (title, description, difficulty, category, starter_code, solution, test_cases, hints, xp_reward, time_limit) VALUES
('Calculate MEV Profit', 'Calculate net MEV profit after gas costs', 'beginner', 'arbitrage', 'function calculateMEVProfit(grossProfit, gasCost) {\n  // Your code here\n}', 'function calculateMEVProfit(grossProfit, gasCost) {\n  return grossProfit - gasCost;\n}', '[{"input": [1, 0.1], "expected": 0.9}, {"input": [0.5, 0.2], "expected": 0.3}]', '["Subtract gas from profit", "Return the result"]', 50, 300),

('Find Best DEX Price', 'Find the DEX with the best price', 'beginner', 'arbitrage', 'function findBestDEX(prices) {\n  // prices = [{dex: "Raydium", price: 100}, {dex: "Orca", price: 102}]\n  // Return DEX name with highest price\n}', 'function findBestDEX(prices) {\n  return prices.reduce((best, curr) => curr.price > best.price ? curr : best).dex;\n}', '[{"input": [[{"dex": "Raydium", "price": 100}, {"dex": "Orca", "price": 102}]], "expected": "Orca"}]', '["Use reduce to find max", "Compare prices", "Return dex name"]', 75, 600),

('Calculate Health Factor', 'Calculate loan health factor', 'intermediate', 'liquidation', 'function calculateHealthFactor(collateral, debt, liquidationThreshold) {\n  // Health Factor = (collateral * threshold) / debt\n}', 'function calculateHealthFactor(collateral, debt, liquidationThreshold) {\n  return (collateral * liquidationThreshold) / debt;\n}', '[{"input": [1000, 500, 0.8], "expected": 1.6}, {"input": [1000, 1000, 0.8], "expected": 0.8}]', '["Multiply collateral by threshold", "Divide by debt"]', 100, 600);
