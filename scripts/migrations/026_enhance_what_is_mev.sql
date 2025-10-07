-- Enhance "What is MEV" module with 6 comprehensive sections

-- First, clear existing content for this module
DELETE FROM module_content WHERE module_id = (SELECT id FROM learning_modules WHERE slug = 'what-is-mev');

-- Update module metadata
UPDATE learning_modules 
SET 
  estimated_time = 45,
  description = 'Comprehensive introduction to Maximum Extractable Value: types, ecosystem, real-world examples, and economic impact on Solana'
WHERE slug = 'what-is-mev';

-- Section 1: Introduction to MEV
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'what-is-mev'), 1, 'text', 'Introduction to MEV', 
'{
  "text": "Maximum Extractable Value (MEV) refers to the profit that can be extracted from blockchain transactions by reordering, including, or excluding transactions within a block. Originally called Miner Extractable Value on Ethereum, it has evolved to include validators and searchers on Proof-of-Stake networks like Solana.",
  "keyPoints": [
    "MEV is profit from transaction ordering control",
    "Solana MEV differs from Ethereum due to parallel execution",
    "Global MEV market exceeds $500M+ annually",
    "Solana processes 65,000 TPS enabling unique MEV opportunities"
  ],
  "comparison": [
    {"aspect": "Block Time", "ethereum": "12 seconds", "solana": "400ms", "impact": "Faster MEV execution on Solana"},
    {"aspect": "Transaction Model", "ethereum": "Sequential", "solana": "Parallel", "impact": "Different MEV strategies required"},
    {"aspect": "MEV Infrastructure", "ethereum": "Flashbots", "solana": "Jito Labs", "impact": "Similar auction mechanisms"}
  ]
}'::jsonb);

-- Section 2: MEV Types
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'what-is-mev'), 2, 'text', 'Types of MEV', 
'{
  "text": "MEV opportunities come in various forms, each with different risk profiles, capital requirements, and profit potential. Understanding these types is crucial for identifying opportunities.",
  "examples": [
    {"type": "Arbitrage", "description": "Profit from price differences across DEXs. Example: SOL trading at $100 on Raydium but $101 on Orca - buy on Raydium, sell on Orca for $1 profit per SOL."},
    {"type": "Liquidations", "description": "Liquidate undercollateralized positions on lending protocols like Solend or MarginFi. Earn liquidation bonuses (typically 5-10%)."},
    {"type": "Sandwich Attacks", "description": "Front-run large trades by buying before and selling after, profiting from price impact. Controversial due to user harm."},
    {"type": "JIT Liquidity", "description": "Add concentrated liquidity just before large swaps, earn fees, then remove. Requires precise timing."},
    {"type": "NFT Sniping", "description": "Detect underpriced NFT listings and purchase before others. Requires fast execution and market knowledge."}
  ],
  "code": "// Detect arbitrage opportunity\\nconst detectArbitrage = async (token) => {\\n  const raydiumPrice = await getRaydiumPrice(token);\\n  const orcaPrice = await getOrcaPrice(token);\\n  const priceDiff = Math.abs(raydiumPrice - orcaPrice);\\n  const profitPercent = (priceDiff / Math.min(raydiumPrice, orcaPrice)) * 100;\\n  \\n  if (profitPercent > 0.5) { // 0.5% threshold\\n    return {\\n      profitable: true,\\n      buyDex: raydiumPrice < orcaPrice ? ''raydium'' : ''orca'',\\n      sellDex: raydiumPrice < orcaPrice ? ''orca'' : ''raydium'',\\n      profit: profitPercent\\n    };\\n  }\\n  return { profitable: false };\\n};"
}'::jsonb);

-- Section 3: MEV Ecosystem
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'what-is-mev'), 3, 'text', 'The MEV Ecosystem', 
'{
  "text": "The MEV ecosystem consists of multiple stakeholders, each playing a crucial role in the value extraction and distribution process.",
  "stakeholders": [
    {"role": "Searchers", "impact": "Identify and execute MEV opportunities", "action": "Run bots to detect arbitrage, liquidations, and other opportunities"},
    {"role": "Validators", "impact": "Control transaction ordering within blocks", "action": "Accept bundles from searchers, earn tips and MEV rewards"},
    {"role": "Block Builders (Jito)", "impact": "Aggregate transactions and bundles", "action": "Run auctions for block space, optimize bundle inclusion"},
    {"role": "Users", "impact": "Experience slippage and front-running", "action": "Use private RPCs and MEV protection tools"},
    {"role": "Protocols", "impact": "Design mechanisms to minimize harmful MEV", "action": "Implement batch auctions, time-weighted prices, MEV redistribution"}
  ],
  "keyPoints": [
    "Searchers compete for opportunities using sophisticated bots",
    "Jito-enabled validators earn 50%+ more than regular validators",
    "Users can protect themselves using Jito RPC endpoints",
    "Protocols are evolving to capture MEV for their communities"
  ]
}'::jsonb);

-- Section 4: Real-World Examples
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'what-is-mev'), 4, 'text', 'Real-World MEV Examples', 
'{
  "text": "Examining actual MEV events helps understand the scale and impact of these opportunities on Solana.",
  "examples": [
    {"type": "Major Arbitrage (Nov 2023)", "description": "A searcher extracted $1.2M in a single transaction by exploiting a price discrepancy between Raydium and Orca during high volatility. The bot detected the opportunity within 400ms and executed atomically."},
    {"type": "Solend Liquidation Cascade (June 2022)", "description": "When SOL price dropped 40%, over $20M in positions were liquidated. Searchers earned $1.5M+ in liquidation bonuses. This event highlighted the importance of risk management."},
    {"type": "Sandwich Attack Pattern", "description": "A whale attempted to swap $500K USDC for SOL. A searcher front-ran with $100K buy, causing 2% slippage, then back-ran with a sell, profiting $8K. The whale lost $10K to slippage."},
    {"type": "JIT Liquidity Success", "description": "A sophisticated bot added $2M liquidity to Orca CLMM pool 1 slot before a $500K swap, earned $2,500 in fees (0.5%), then removed liquidity. Total time: 800ms."}
  ],
  "keyPoints": [
    "Single MEV transactions can exceed $1M profit",
    "Speed is critical - opportunities exist for milliseconds",
    "Liquidations provide consistent income during volatility",
    "Sandwich attacks are profitable but ethically questionable"
  ]
}'::jsonb);

-- Section 5: Economic Impact
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'what-is-mev'), 5, 'text', 'Economic Impact of MEV', 
'{
  "text": "MEV has far-reaching effects on network participants, protocol design, and overall market efficiency.",
  "keyPoints": [
    "Network Effects: MEV incentivizes validator participation and network security",
    "User Costs: Average user loses 0.5-2% to MEV on large trades",
    "Validator Revenue: Jito validators earn 30-50% more than non-Jito validators",
    "Protocol Design: New protocols must consider MEV in their economic models",
    "Market Efficiency: Arbitrage MEV improves price discovery across DEXs",
    "Centralization Risk: MEV concentration among few searchers raises concerns"
  ],
  "examples": [
    {"type": "Positive Impact", "description": "Arbitrage bots keep prices aligned across DEXs, improving market efficiency. Liquidation bots maintain protocol solvency by quickly liquidating risky positions."},
    {"type": "Negative Impact", "description": "Sandwich attacks extract value from users. Priority fee wars increase transaction costs. Centralization of MEV extraction among sophisticated actors."},
    {"type": "Neutral Impact", "description": "MEV redistribution through Jito allows validators and stakers to earn additional yield, but may increase inequality between technical and non-technical participants."}
  ]
}'::jsonb);

-- Section 6: Quiz
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'what-is-mev'), 6, 'quiz', 'Knowledge Check', 
'{
  "questions": [
    {
      "id": 1,
      "question": "What does MEV stand for?",
      "options": ["Miner Extractable Value", "Maximum Extractable Value", "Market Efficiency Value", "Minimum Exchange Value"],
      "correct": 1,
      "explanation": "MEV stands for Maximum Extractable Value. It was originally called Miner Extractable Value on Ethereum but evolved to Maximum as it applies to validators and searchers."
    },
    {
      "id": 2,
      "question": "What is the primary difference between Ethereum and Solana MEV?",
      "options": ["Solana has no MEV", "Solana uses parallel transaction execution", "Ethereum has faster blocks", "Solana prohibits MEV extraction"],
      "correct": 1,
      "explanation": "Solana uses parallel transaction execution, unlike Ethereum sequential model. This creates different MEV opportunities and strategies."
    },
    {
      "id": 3,
      "question": "Which MEV type involves profiting from price differences across exchanges?",
      "options": ["Liquidation", "Sandwich Attack", "Arbitrage", "JIT Liquidity"],
      "correct": 2,
      "explanation": "Arbitrage involves buying an asset on one exchange and selling it on another to profit from price differences."
    },
    {
      "id": 4,
      "question": "What is a sandwich attack?",
      "options": ["A type of arbitrage", "Front-running and back-running a user trade", "Liquidating multiple positions", "Adding liquidity before swaps"],
      "correct": 1,
      "explanation": "A sandwich attack involves front-running a user trade (buying before) and back-running (selling after) to profit from the price impact."
    },
    {
      "id": 5,
      "question": "Who are searchers in the MEV ecosystem?",
      "options": ["Validators who search for blocks", "Bots that identify MEV opportunities", "Users searching for best prices", "Protocols that search for liquidity"],
      "correct": 1,
      "explanation": "Searchers are sophisticated actors (often bots) that identify and execute MEV opportunities like arbitrage and liquidations."
    },
    {
      "id": 6,
      "question": "What is Jito Labs role in Solana MEV?",
      "options": ["Prevents all MEV", "Provides block building infrastructure", "Only for validators", "Eliminates sandwich attacks"],
      "correct": 1,
      "explanation": "Jito Labs provides block building infrastructure that enables MEV auctions and bundle submission on Solana."
    },
    {
      "id": 7,
      "question": "How much more do Jito-enabled validators typically earn?",
      "options": ["10-20%", "30-50%", "70-90%", "100%+"],
      "correct": 1,
      "explanation": "Jito-enabled validators typically earn 30-50% more than regular validators due to MEV tips and rewards."
    },
    {
      "id": 8,
      "question": "What is the typical liquidation bonus on Solana lending protocols?",
      "options": ["1-2%", "5-10%", "15-20%", "25-30%"],
      "correct": 1,
      "explanation": "Liquidation bonuses typically range from 5-10%, incentivizing searchers to liquidate undercollateralized positions quickly."
    },
    {
      "id": 9,
      "question": "What is JIT (Just-In-Time) liquidity?",
      "options": ["Permanent liquidity provision", "Adding liquidity right before large swaps", "Removing liquidity during volatility", "Arbitrage between pools"],
      "correct": 1,
      "explanation": "JIT liquidity involves adding concentrated liquidity just before large swaps to earn fees, then removing it immediately after."
    },
    {
      "id": 10,
      "question": "What is a positive impact of MEV?",
      "options": ["Increased user slippage", "Improved price discovery through arbitrage", "Higher transaction costs", "Centralization of power"],
      "correct": 1,
      "explanation": "Arbitrage MEV improves price discovery by keeping prices aligned across different exchanges, benefiting the overall market."
    },
    {
      "id": 11,
      "question": "How fast are Solana block times?",
      "options": ["12 seconds", "2 seconds", "400ms", "100ms"],
      "correct": 2,
      "explanation": "Solana has approximately 400ms block times, much faster than Ethereum 12 seconds, enabling rapid MEV execution."
    },
    {
      "id": 12,
      "question": "What is the estimated annual global MEV market size?",
      "options": ["$50M+", "$200M+", "$500M+", "$1B+"],
      "correct": 2,
      "explanation": "The global MEV market is estimated to exceed $500M+ annually across all blockchains, with Solana representing a growing share."
    }
  ],
  "passing_score": 75
}'::jsonb);

-- Update quiz reference in learning_modules
UPDATE learning_modules 
SET xp_reward = 100
WHERE slug = 'what-is-mev';
