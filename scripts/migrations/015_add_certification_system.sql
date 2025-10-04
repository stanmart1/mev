-- Add certification system

-- Create certifications table
CREATE TABLE IF NOT EXISTS certifications (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  required_modules JSONB, -- Array of module IDs
  required_tutorials JSONB, -- Array of tutorial IDs
  passing_score INTEGER DEFAULT 80,
  total_questions INTEGER DEFAULT 20,
  time_limit INTEGER, -- in minutes
  xp_reward INTEGER DEFAULT 500,
  badge_icon VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create certification exams table
CREATE TABLE IF NOT EXISTS certification_exams (
  id SERIAL PRIMARY KEY,
  certification_id INTEGER REFERENCES certifications(id),
  questions JSONB NOT NULL, -- Array of questions
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user certifications table
CREATE TABLE IF NOT EXISTS user_certifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  certification_id INTEGER REFERENCES certifications(id),
  exam_score INTEGER,
  passed BOOLEAN DEFAULT FALSE,
  certificate_hash VARCHAR(255), -- For blockchain verification
  issued_at TIMESTAMP,
  expires_at TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, certification_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_certifications ON user_certifications(user_id, certification_id);
CREATE INDEX IF NOT EXISTS idx_certification_hash ON user_certifications(certificate_hash);

-- Seed MEV Fundamentals Certification
INSERT INTO certifications (name, description, required_modules, required_tutorials, passing_score, total_questions, time_limit, xp_reward, badge_icon) VALUES
('MEV Fundamentals', 'Master the basics of MEV on Solana', '[1, 2]', '[]', 80, 15, 30, 500, 'certificate-fundamentals'),
('MEV Advanced Practitioner', 'Advanced MEV strategies and techniques', '[1, 2, 3, 4, 5]', '[1]', 85, 25, 45, 1000, 'certificate-advanced'),
('MEV Expert', 'Complete mastery of MEV on Solana', '[1, 2, 3, 4, 5, 6, 7]', '[1, 2, 3, 4]', 90, 30, 60, 2000, 'certificate-expert');

-- Seed exam questions for MEV Fundamentals
INSERT INTO certification_exams (certification_id, questions) VALUES
(1, '[
  {
    "id": 1,
    "question": "What does MEV stand for?",
    "options": ["Maximum Extractable Value", "Miner Extracted Value", "Market Efficiency Value", "Minimum Exchange Value"],
    "correct": 0,
    "category": "basics"
  },
  {
    "id": 2,
    "question": "Which protocol enables atomic bundles on Solana?",
    "options": ["Flashbots", "Jito", "Serum", "Raydium"],
    "correct": 1,
    "category": "jito"
  },
  {
    "id": 3,
    "question": "What is the typical liquidation bonus percentage?",
    "options": ["1-2%", "5-15%", "20-30%", "50%+"],
    "correct": 1,
    "category": "liquidation"
  },
  {
    "id": 4,
    "question": "What triggers a liquidation?",
    "options": ["Low gas fees", "Health factor < 1.0", "High volume", "Price increase"],
    "correct": 1,
    "category": "liquidation"
  },
  {
    "id": 5,
    "question": "What is arbitrage?",
    "options": ["Buying and holding", "Profiting from price differences", "Lending crypto", "Mining"],
    "correct": 1,
    "category": "arbitrage"
  },
  {
    "id": 6,
    "question": "How much faster is Solana than Ethereum?",
    "options": ["5x", "10x", "30x", "100x"],
    "correct": 2,
    "category": "basics"
  },
  {
    "id": 7,
    "question": "What is the minimum viable arbitrage profit?",
    "options": ["0.01%", "0.1-0.5%", "5-10%", "20%+"],
    "correct": 1,
    "category": "arbitrage"
  },
  {
    "id": 8,
    "question": "What happens if one transaction in a Jito bundle fails?",
    "options": ["Others execute", "Entire bundle fails", "It retries", "Validator decides"],
    "correct": 1,
    "category": "jito"
  },
  {
    "id": 9,
    "question": "What is a good validator skip rate?",
    "options": ["< 1%", "< 5%", "< 20%", "< 50%"],
    "correct": 1,
    "category": "validators"
  },
  {
    "id": 10,
    "question": "What is slippage?",
    "options": ["Transaction fee", "Price difference from expected", "Network delay", "Validator tip"],
    "correct": 1,
    "category": "arbitrage"
  },
  {
    "id": 11,
    "question": "How do Jito validators earn more revenue?",
    "options": ["Higher fees", "MEV tips", "More stake", "Faster blocks"],
    "correct": 1,
    "category": "jito"
  },
  {
    "id": 12,
    "question": "What is the compute unit limit per transaction on Solana?",
    "options": ["200K", "1.4M", "10M", "Unlimited"],
    "correct": 1,
    "category": "technical"
  },
  {
    "id": 13,
    "question": "What percentage should you risk per trade?",
    "options": ["10-20%", "1-5%", "50%", "100%"],
    "correct": 1,
    "category": "risk"
  },
  {
    "id": 14,
    "question": "What is the typical bundle tip percentage?",
    "options": ["0.1%", "1-5%", "10-20%", "50%"],
    "correct": 1,
    "category": "bundles"
  },
  {
    "id": 15,
    "question": "Why use atomic bundles?",
    "options": ["Lower fees", "All succeed or all fail", "Faster execution", "Higher profits"],
    "correct": 1,
    "category": "bundles"
  }
]');
