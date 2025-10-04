-- Migration: Enhance Beginner Courses
-- Description: Add more robust content, interactive elements, and better structure to beginner modules

-- Update Module 1: What is MEV? with enhanced content
UPDATE module_content SET content = '{
  "text": "Maximum Extractable Value (MEV) refers to the maximum value that can be extracted from block production in excess of the standard block reward and gas fees. On Solana, MEV opportunities arise from the ability to reorder, include, or exclude transactions within blocks.",
  "keyPoints": [
    "MEV is profit extracted beyond standard rewards",
    "Comes from transaction ordering control",
    "Common on all blockchains including Solana",
    "Can be worth millions of dollars annually"
  ],
  "interactiveElements": {
    "quiz": {
      "question": "If a validator earns 1 SOL in block rewards and 0.5 SOL in MEV, what is their total earnings?",
      "answer": "1.5 SOL",
      "explanation": "Total earnings = Block rewards (1 SOL) + MEV (0.5 SOL) = 1.5 SOL"
    },
    "visualization": {
      "type": "diagram",
      "description": "Block production flow showing where MEV extraction occurs"
    }
  },
  "realWorldExample": {
    "title": "Real MEV Extraction on Solana",
    "description": "In January 2024, a searcher extracted 127 SOL ($12,700) in a single arbitrage opportunity between Raydium and Orca DEXs.",
    "breakdown": [
      "Detected price discrepancy: BONK token",
      "Bought 1M BONK on Raydium at lower price",
      "Sold 1M BONK on Orca at higher price",
      "Net profit: 127 SOL after fees"
    ]
  }
}' WHERE module_id = 1 AND section_order = 1;

-- Add new section: Hands-on MEV Calculation
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
(1, 5, 'interactive', 'Calculate MEV Profit', '{
  "text": "Let''s practice calculating potential MEV profits from a real arbitrage scenario.",
  "scenario": {
    "description": "You notice SOL/USDC trading at different prices on two DEXs",
    "dex1": {
      "name": "Raydium",
      "price": 98.50,
      "liquidity": "High"
    },
    "dex2": {
      "name": "Orca",
      "price": 100.20,
      "liquidity": "High"
    },
    "yourCapital": 10000,
    "fees": {
      "trading": 0.003,
      "network": 0.00001
    }
  },
  "steps": [
    "Calculate how much SOL you can buy on Raydium with $10,000",
    "Calculate how much USDC you get selling that SOL on Orca",
    "Subtract all fees (trading + network)",
    "Calculate net profit"
  ],
  "solution": {
    "step1": "10000 / 98.50 = 101.52 SOL",
    "step2": "101.52 * 100.20 = 10,172.30 USDC",
    "step3": "Trading fees: (10000 * 0.003) + (10172.30 * 0.003) = 60.52 USDC",
    "step4": "Net profit: 10172.30 - 10000 - 60.52 = 111.78 USDC",
    "profitPercentage": "1.12%"
  },
  "practiceProblems": [
    {
      "id": 1,
      "question": "If the price difference is only 0.5%, is it still profitable after 0.3% fees?",
      "answer": "Yes, 0.5% - 0.3% = 0.2% profit",
      "difficulty": "easy"
    },
    {
      "id": 2,
      "question": "What minimum price difference do you need to break even with 0.6% total fees?",
      "answer": "0.6% or higher",
      "difficulty": "medium"
    }
  ]
}');

-- Update Module 2: Understanding Jito with enhanced content
UPDATE learning_modules SET 
  description = 'Deep dive into Jito protocol: how it works, why validators use it, and how searchers can leverage it for MEV extraction. Includes hands-on bundle construction.',
  estimated_time = 15,
  xp_reward = 200
WHERE slug = 'understanding-jito';

-- Add comprehensive Jito content sections
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
(2, 1, 'text', 'What is Jito?', '{
  "text": "Jito is a MEV infrastructure protocol for Solana that enables atomic transaction bundles and fair MEV distribution. It allows searchers to submit bundles of transactions that execute atomically (all or nothing).",
  "keyPoints": [
    "Jito-Solana is a modified validator client",
    "Enables atomic transaction bundles",
    "Provides MEV rewards to validators and stakers",
    "Currently used by 30%+ of Solana validators"
  ],
  "architecture": {
    "components": [
      {
        "name": "Jito-Solana Client",
        "description": "Modified validator software that accepts bundles",
        "role": "Validator-side"
      },
      {
        "name": "Block Engine",
        "description": "Receives and validates bundles from searchers",
        "role": "Infrastructure"
      },
      {
        "name": "Relayer",
        "description": "Forwards bundles to validators",
        "role": "Infrastructure"
      },
      {
        "name": "Searcher API",
        "description": "Interface for submitting bundles",
        "role": "Searcher-side"
      }
    ]
  },
  "benefits": {
    "forValidators": [
      "Additional MEV revenue (10-30% increase)",
      "Fair distribution to stakers",
      "No additional hardware requirements"
    ],
    "forSearchers": [
      "Atomic execution guarantees",
      "No failed transactions on-chain",
      "Priority execution for bundles",
      "Lower risk of being front-run"
    ],
    "forStakers": [
      "Share in MEV rewards",
      "Higher APY on staked SOL",
      "Transparent reward distribution"
    ]
  }
}'),

(2, 2, 'text', 'How Jito Bundles Work', '{
  "text": "A Jito bundle is a group of transactions that must execute atomically in a specific order. If any transaction fails, the entire bundle is rejected.",
  "bundleStructure": {
    "maxTransactions": 5,
    "maxSize": "1232 bytes",
    "requirements": [
      "All transactions must be signed",
      "Must include tip transaction to Jito",
      "Transactions execute in specified order",
      "Bundle expires after 150 slots (~60 seconds)"
    ]
  },
  "executionFlow": [
    {
      "step": 1,
      "action": "Searcher detects MEV opportunity",
      "example": "Price difference between DEXs"
    },
    {
      "step": 2,
      "action": "Construct bundle with transactions",
      "example": "Buy on DEX A, Sell on DEX B, Send tip"
    },
    {
      "step": 3,
      "action": "Submit bundle to Jito Block Engine",
      "example": "POST to https://mainnet.block-engine.jito.wtf/api/v1/bundles"
    },
    {
      "step": 4,
      "action": "Block Engine validates and forwards to validators",
      "example": "Checks signatures, simulates execution"
    },
    {
      "step": 5,
      "action": "Validator includes bundle in block",
      "example": "Bundle executes atomically or not at all"
    }
  ],
  "tipCalculation": {
    "formula": "Tip = (Expected Profit * 0.05) to (Expected Profit * 0.20)",
    "explanation": "Tip 5-20% of expected profit to ensure bundle inclusion",
    "example": "If expecting 1 SOL profit, tip 0.05-0.20 SOL"
  }
}'),

(2, 3, 'interactive', 'Build Your First Bundle', '{
  "text": "Let''s construct a simple Jito bundle for an arbitrage opportunity.",
  "scenario": {
    "opportunity": "Buy SOL on Raydium at 98 USDC, sell on Orca at 100 USDC",
    "capital": "1000 USDC",
    "expectedProfit": "20 USDC (2%)"
  },
  "bundleTemplate": {
    "transaction1": {
      "type": "Swap",
      "program": "Raydium",
      "action": "Buy 10.2 SOL with 1000 USDC",
      "accounts": ["userWallet", "raydiumPool", "tokenAccounts"]
    },
    "transaction2": {
      "type": "Swap",
      "program": "Orca",
      "action": "Sell 10.2 SOL for 1020 USDC",
      "accounts": ["userWallet", "orcaPool", "tokenAccounts"]
    },
    "transaction3": {
      "type": "Tip",
      "program": "System",
      "action": "Send 1 USDC tip to Jito",
      "recipient": "Jito tip account"
    }
  },
  "codeExample": "// Pseudo-code for bundle construction\\nconst bundle = {\\n  transactions: [\\n    buyOnRaydium(1000, ''USDC'', ''SOL''),\\n    sellOnOrca(10.2, ''SOL'', ''USDC''),\\n    sendTip(1, jitoTipAccount)\\n  ],\\n  recentBlockhash: await getRecentBlockhash(),\\n  signatures: await signAllTransactions(wallet)\\n};\\n\\nawait submitBundle(bundle);",
  "practiceExercise": {
    "task": "Calculate the optimal tip amount",
    "given": {
      "expectedProfit": 20,
      "competitionLevel": "medium",
      "urgency": "high"
    },
    "hint": "Higher competition and urgency require higher tips (15-20% of profit)",
    "answer": "3-4 USDC (15-20% of 20 USDC)"
  }
}'),

(2, 4, 'text', 'Jito Best Practices', '{
  "text": "Follow these best practices to maximize your success rate with Jito bundles.",
  "bestPractices": [
    {
      "category": "Bundle Construction",
      "practices": [
        "Keep bundles small (2-3 transactions ideal)",
        "Always simulate bundle before submission",
        "Set appropriate compute unit limits",
        "Include sufficient tip for competition level"
      ]
    },
    {
      "category": "Timing",
      "practices": [
        "Submit bundles early in slot",
        "Monitor bundle status via API",
        "Have backup strategies if bundle fails",
        "Consider slot leader schedule"
      ]
    },
    {
      "category": "Risk Management",
      "practices": [
        "Never risk more than you can afford to lose",
        "Account for slippage in calculations",
        "Set maximum tip limits",
        "Monitor for failed bundles and adjust"
      ]
    },
    {
      "category": "Optimization",
      "practices": [
        "Use priority fees in addition to tips",
        "Optimize transaction size",
        "Batch similar opportunities",
        "Monitor validator performance"
      ]
    }
  ],
  "commonMistakes": [
    {
      "mistake": "Tip too low",
      "consequence": "Bundle not included",
      "solution": "Increase tip to 10-15% of profit"
    },
    {
      "mistake": "Bundle too large",
      "consequence": "Exceeds size limit, rejected",
      "solution": "Split into multiple bundles"
    },
    {
      "mistake": "No simulation",
      "consequence": "Bundle fails on-chain",
      "solution": "Always simulate before submission"
    },
    {
      "mistake": "Stale blockhash",
      "consequence": "Bundle expires",
      "solution": "Use recent blockhash (<60 seconds old)"
    }
  ],
  "metrics": {
    "successRate": "Track bundle inclusion rate",
    "avgTip": "Monitor average tip amounts",
    "profitPerBundle": "Calculate net profit after tips",
    "competitionLevel": "Analyze how many searchers target same opportunities"
  }
}');

-- Enhanced quiz for Jito module
INSERT INTO quizzes (module_id, title, passing_score, questions) VALUES
(2, 'Jito Protocol Mastery Quiz', 75, '[
  {
    "id": 1,
    "question": "What is the maximum number of transactions in a Jito bundle?",
    "options": ["3", "5", "10", "Unlimited"],
    "correct": 1,
    "explanation": "Jito bundles can contain up to 5 transactions that execute atomically."
  },
  {
    "id": 2,
    "question": "If you expect 10 SOL profit from an arbitrage, what is a reasonable tip range?",
    "options": ["0.1-0.5 SOL", "0.5-2 SOL", "2-5 SOL", "5-10 SOL"],
    "correct": 1,
    "explanation": "A reasonable tip is 5-20% of expected profit, so 0.5-2 SOL for a 10 SOL profit."
  },
  {
    "id": 3,
    "question": "What happens if one transaction in a bundle fails?",
    "options": [
      "Only that transaction fails",
      "The entire bundle is rejected",
      "Other transactions still execute",
      "The bundle is retried automatically"
    ],
    "correct": 1,
    "explanation": "Jito bundles are atomic - if any transaction fails, the entire bundle is rejected."
  },
  {
    "id": 4,
    "question": "How long does a bundle remain valid?",
    "options": ["30 slots", "60 slots", "150 slots", "300 slots"],
    "correct": 2,
    "explanation": "Bundles expire after 150 slots (approximately 60 seconds on Solana)."
  },
  {
    "id": 5,
    "question": "What percentage of Solana validators currently run Jito?",
    "options": ["10%", "30%", "50%", "70%"],
    "correct": 1,
    "explanation": "Approximately 30% of Solana validators run the Jito-Solana client."
  },
  {
    "id": 6,
    "question": "Why should you simulate a bundle before submission?",
    "options": [
      "It''s required by Jito",
      "To avoid failed transactions on-chain",
      "To calculate gas fees",
      "To reserve a slot"
    ],
    "correct": 1,
    "explanation": "Simulation helps catch errors before submission, avoiding failed transactions and wasted tips."
  }
]');

-- Add interactive tutorial for Jito
INSERT INTO interactive_tutorials (slug, title, description, difficulty, estimated_time, total_steps, category, xp_reward, order_index) VALUES
('jito-bundle-builder', 'Build a Jito Bundle', 'Step-by-step guide to constructing and submitting your first Jito bundle', 'beginner', 20, 6, 'basics', 250, 1);

-- Add tutorial steps
INSERT INTO tutorial_steps (tutorial_id, step_number, step_type, title, content, validation_rules, hints) VALUES
(1, 1, 'explanation', 'Understanding Bundle Structure', '{
  "text": "A Jito bundle consists of multiple transactions that execute atomically. Let''s break down the structure.",
  "diagram": "Bundle → [Tx1: Buy] → [Tx2: Sell] → [Tx3: Tip]",
  "keyPoints": [
    "All transactions must succeed or none execute",
    "Transactions execute in order",
    "Must include tip to Jito",
    "Bundle has expiration time"
  ]
}', '{}', '[]'),

(1, 2, 'code', 'Set Up Connection', '{
  "text": "First, let''s connect to Solana and Jito endpoints.",
  "instructions": "Complete the code to establish connections to both Solana RPC and Jito Block Engine.",
  "starterCode": "import { Connection, Keypair } from ''@solana/web3.js'';\\nimport { SearcherClient } from ''jito-ts'';\\n\\n// TODO: Create Solana connection\\nconst connection = new Connection(___);\\n\\n// TODO: Create Jito searcher client\\nconst searcher = new SearcherClient(___);",
  "solution": "import { Connection, Keypair } from ''@solana/web3.js'';\\nimport { SearcherClient } from ''jito-ts'';\\n\\nconst connection = new Connection(''https://api.mainnet-beta.solana.com'');\\nconst searcher = new SearcherClient(''https://mainnet.block-engine.jito.wtf'');",
  "testCases": [
    "Check connection is defined",
    "Check searcher client is initialized"
  ]
}', '{
  "requiredImports": ["Connection", "SearcherClient"],
  "requiredVariables": ["connection", "searcher"]
}', '[
  "Use the mainnet-beta RPC endpoint",
  "Jito Block Engine URL is mainnet.block-engine.jito.wtf"
]'),

(1, 3, 'code', 'Detect Arbitrage Opportunity', '{
  "text": "Write code to detect a price difference between two DEXs.",
  "instructions": "Complete the function to calculate profit from price difference.",
  "starterCode": "async function detectArbitrage(dex1Price, dex2Price, amount) {\\n  // TODO: Calculate potential profit\\n  const profit = ___;\\n  \\n  // TODO: Check if profitable after fees (0.6%)\\n  const fees = ___;\\n  const netProfit = ___;\\n  \\n  return netProfit > 0 ? netProfit : 0;\\n}",
  "solution": "async function detectArbitrage(dex1Price, dex2Price, amount) {\\n  const profit = (dex2Price - dex1Price) * amount;\\n  const fees = amount * 0.006;\\n  const netProfit = profit - fees;\\n  return netProfit > 0 ? netProfit : 0;\\n}",
  "testCases": [
    "detectArbitrage(98, 100, 10) should return ~19.4",
    "detectArbitrage(100, 100, 10) should return 0"
  ]
}', '{
  "functionName": "detectArbitrage",
  "parameters": ["dex1Price", "dex2Price", "amount"],
  "returnType": "number"
}', '[
  "Profit = (sell price - buy price) * amount",
  "Fees are 0.6% of the amount",
  "Only return profit if it''s positive"
]'),

(1, 4, 'code', 'Construct Bundle Transactions', '{
  "text": "Create the transactions for your arbitrage bundle.",
  "instructions": "Build buy, sell, and tip transactions.",
  "starterCode": "async function buildBundle(wallet, amount, tip) {\\n  const transactions = [];\\n  \\n  // TODO: Add buy transaction\\n  transactions.push(___);\\n  \\n  // TODO: Add sell transaction\\n  transactions.push(___);\\n  \\n  // TODO: Add tip transaction\\n  transactions.push(___);\\n  \\n  return transactions;\\n}",
  "solution": "async function buildBundle(wallet, amount, tip) {\\n  const transactions = [];\\n  \\n  transactions.push(await createSwapTx(''raydium'', ''buy'', amount));\\n  transactions.push(await createSwapTx(''orca'', ''sell'', amount));\\n  transactions.push(await createTipTx(wallet, tip));\\n  \\n  return transactions;\\n}",
  "testCases": [
    "Bundle should have 3 transactions",
    "Last transaction should be tip"
  ]
}', '{
  "functionName": "buildBundle",
  "minTransactions": 3,
  "maxTransactions": 3
}', '[
  "Use createSwapTx helper for DEX swaps",
  "Tip transaction goes to Jito tip account",
  "Order matters: buy → sell → tip"
]'),

(1, 5, 'code', 'Calculate Optimal Tip', '{
  "text": "Determine the right tip amount based on expected profit and competition.",
  "instructions": "Implement tip calculation logic.",
  "starterCode": "function calculateTip(expectedProfit, competition) {\\n  // TODO: Base tip percentage (5-20% of profit)\\n  let tipPercent = ___;\\n  \\n  // TODO: Adjust for competition\\n  if (competition === ''high'') {\\n    tipPercent = ___;\\n  }\\n  \\n  return expectedProfit * tipPercent;\\n}",
  "solution": "function calculateTip(expectedProfit, competition) {\\n  let tipPercent = 0.10; // 10% base\\n  \\n  if (competition === ''high'') {\\n    tipPercent = 0.18; // 18% for high competition\\n  } else if (competition === ''low'') {\\n    tipPercent = 0.07; // 7% for low competition\\n  }\\n  \\n  return expectedProfit * tipPercent;\\n}",
  "testCases": [
    "calculateTip(10, ''low'') should return ~0.7",
    "calculateTip(10, ''high'') should return ~1.8"
  ]
}', '{
  "functionName": "calculateTip",
  "validCompetitionLevels": ["low", "medium", "high"]
}', '[
  "Base tip: 10% of expected profit",
  "High competition: increase to 15-20%",
  "Low competition: can go as low as 5-7%"
]'),

(1, 6, 'code', 'Submit Bundle', '{
  "text": "Finally, submit your bundle to Jito.",
  "instructions": "Complete the submission code with error handling.",
  "starterCode": "async function submitBundle(bundle) {\\n  try {\\n    // TODO: Submit to Jito\\n    const result = await ___;\\n    \\n    // TODO: Check result\\n    if (result.success) {\\n      console.log(''Bundle submitted:'', result.bundleId);\\n    }\\n    \\n    return result;\\n  } catch (error) {\\n    // TODO: Handle error\\n    console.error(___);\\n    return null;\\n  }\\n}",
  "solution": "async function submitBundle(bundle) {\\n  try {\\n    const result = await searcher.sendBundle(bundle);\\n    \\n    if (result.success) {\\n      console.log(''Bundle submitted:'', result.bundleId);\\n    }\\n    \\n    return result;\\n  } catch (error) {\\n    console.error(''Bundle submission failed:'', error.message);\\n    return null;\\n  }\\n}",
  "testCases": [
    "Should return result object",
    "Should handle errors gracefully"
  ]
}', '{
  "functionName": "submitBundle",
  "requiresTryCatch": true
}', '[
  "Use searcher.sendBundle() method",
  "Always wrap in try-catch",
  "Log both success and failure cases"
]');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_module_content_type ON module_content(section_type);
CREATE INDEX IF NOT EXISTS idx_tutorials_difficulty ON interactive_tutorials(difficulty);
CREATE INDEX IF NOT EXISTS idx_tutorial_steps_type ON tutorial_steps(step_type);

-- Add completion tracking
ALTER TABLE user_learning_progress ADD COLUMN IF NOT EXISTS interactive_completed JSONB DEFAULT '{}';
ALTER TABLE user_learning_progress ADD COLUMN IF NOT EXISTS practice_scores JSONB DEFAULT '[]';
