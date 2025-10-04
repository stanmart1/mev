-- Seed content for Module 1: What is MEV?

-- Insert 4 sections for "What is MEV?" module
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
(1, 1, 'text', 'Introduction to MEV', '{
  "text": "Maximum Extractable Value (MEV) refers to the maximum value that can be extracted from block production in excess of the standard block reward and gas fees. On Solana, MEV opportunities arise from the ability to reorder, include, or exclude transactions within blocks.",
  "keyPoints": [
    "MEV is profit extracted beyond standard rewards",
    "Comes from transaction ordering control",
    "Common on all blockchains including Solana",
    "Can be worth millions of dollars annually"
  ]
}'),

(1, 2, 'text', 'Types of MEV', '{
  "text": "There are several common types of MEV strategies that searchers employ to extract value from the blockchain. Each type exploits different market inefficiencies or transaction patterns.",
  "keyPoints": [
    "Arbitrage: Profit from price differences across DEXs",
    "Liquidations: Profit from liquidating undercollateralized positions",
    "Sandwich Attacks: Front-run and back-run large trades",
    "NFT Sniping: Front-run valuable NFT purchases"
  ],
  "examples": [
    {
      "type": "Arbitrage",
      "description": "SOL trades at $100 on Raydium but $102 on Orca. Buy on Raydium, sell on Orca for $2 profit per SOL."
    },
    {
      "type": "Liquidation",
      "description": "A loan position falls below health factor 1.0. Liquidate it and earn a 5% liquidation bonus."
    }
  ]
}'),

(1, 3, 'text', 'MEV on Solana vs Ethereum', '{
  "text": "Solana''s architecture creates unique MEV dynamics compared to Ethereum. The high throughput and low latency of Solana mean MEV opportunities are more competitive and time-sensitive.",
  "comparison": [
    {
      "aspect": "Block Time",
      "ethereum": "~12 seconds",
      "solana": "~400ms",
      "impact": "Much faster execution required on Solana"
    },
    {
      "aspect": "Transaction Ordering",
      "ethereum": "Gas auction (priority fee)",
      "solana": "Jito bundles + priority fees",
      "impact": "Different strategies needed"
    },
    {
      "aspect": "Competition",
      "ethereum": "High, established market",
      "solana": "Growing, less saturated",
      "impact": "More opportunities on Solana currently"
    }
  ],
  "keyPoints": [
    "Solana is 30x faster than Ethereum",
    "Requires different technical approach",
    "Jito protocol enables atomic bundles",
    "Lower gas costs mean smaller opportunities are viable"
  ]
}'),

(1, 4, 'text', 'Why MEV Matters', '{
  "text": "Understanding MEV is crucial for anyone participating in DeFi, whether as a trader, protocol developer, or validator. MEV affects market efficiency, user experience, and network security.",
  "stakeholders": [
    {
      "role": "Traders",
      "impact": "May experience worse prices due to sandwich attacks or front-running",
      "action": "Use private RPCs and limit orders to protect against MEV"
    },
    {
      "role": "Validators",
      "impact": "Can earn additional revenue from MEV extraction",
      "action": "Run Jito-Solana client to capture MEV rewards"
    },
    {
      "role": "Searchers",
      "impact": "Opportunity to earn profits by finding and executing MEV strategies",
      "action": "Build bots to detect and capture MEV opportunities"
    },
    {
      "role": "Protocols",
      "impact": "MEV can affect protocol security and user trust",
      "action": "Design MEV-resistant mechanisms or capture MEV for users"
    }
  ],
  "keyPoints": [
    "MEV is inevitable in any blockchain system",
    "Can be worth $500M+ annually across all chains",
    "Affects everyone in the DeFi ecosystem",
    "Understanding it helps you protect yourself or profit from it"
  ]
}');

-- Insert quiz for "What is MEV?" module
INSERT INTO quizzes (module_id, title, passing_score, questions) VALUES
(1, 'MEV Fundamentals Quiz', 80, '[
  {
    "id": 1,
    "question": "What does MEV stand for?",
    "options": [
      "Maximum Extractable Value",
      "Miner Extracted Value",
      "Market Efficiency Value",
      "Minimum Exchange Value"
    ],
    "correct": 0,
    "explanation": "MEV stands for Maximum Extractable Value - the maximum value that can be extracted from block production beyond standard rewards."
  },
  {
    "id": 2,
    "question": "Which of the following is NOT a common type of MEV?",
    "options": [
      "Arbitrage",
      "Liquidations",
      "Staking Rewards",
      "Sandwich Attacks"
    ],
    "correct": 2,
    "explanation": "Staking rewards are standard blockchain rewards, not MEV. MEV comes from transaction ordering and execution strategies."
  },
  {
    "id": 3,
    "question": "How much faster is Solana compared to Ethereum in block production?",
    "options": [
      "5x faster",
      "10x faster",
      "30x faster",
      "100x faster"
    ],
    "correct": 2,
    "explanation": "Solana produces blocks every ~400ms compared to Ethereum''s ~12 seconds, making it approximately 30x faster."
  },
  {
    "id": 4,
    "question": "What protocol enables atomic transaction bundles on Solana?",
    "options": [
      "Flashbots",
      "Jito",
      "Serum",
      "Raydium"
    ],
    "correct": 1,
    "explanation": "Jito is the protocol that enables atomic transaction bundles on Solana, similar to Flashbots on Ethereum."
  },
  {
    "id": 5,
    "question": "Who benefits from understanding MEV?",
    "options": [
      "Only validators",
      "Only traders",
      "Only bot operators",
      "Everyone in the DeFi ecosystem"
    ],
    "correct": 3,
    "explanation": "MEV affects traders, validators, searchers, and protocol developers. Understanding it helps everyone protect themselves or profit from it."
  }
]');
