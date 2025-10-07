-- Enhance "Understanding Jito" module with 7 comprehensive sections

DELETE FROM module_content WHERE module_id = (SELECT id FROM learning_modules WHERE slug = 'understanding-jito');

UPDATE learning_modules 
SET 
  estimated_time = 60,
  description = 'Deep dive into Jito Labs infrastructure: block engine, bundle mechanics, tip strategies, and integration guide'
WHERE slug = 'understanding-jito';

-- Section 1: Jito Overview
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'understanding-jito'), 1, 'text', 'Jito Overview', 
'{
  "text": "Jito Labs is the leading MEV infrastructure provider on Solana, offering a block engine that enables efficient MEV extraction while distributing rewards to validators and stakers.",
  "keyPoints": [
    "Jito processes 50%+ of Solana blocks",
    "Block engine aggregates transactions and bundles",
    "MEV auction mechanism ensures fair competition",
    "Validators earn additional yield from MEV tips",
    "Users get MEV protection via Jito RPC"
  ],
  "examples": [
    {"type": "Architecture", "description": "Searchers submit bundles → Block engine runs auction → Winning bundles included in blocks → Tips distributed to validators and stakers"},
    {"type": "Benefits", "description": "Validators: +30-50% APY | Searchers: Guaranteed execution | Users: Front-running protection"}
  ]
}'::jsonb);

-- Section 2: Bundle Mechanics
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'understanding-jito'), 2, 'text', 'Bundle Mechanics', 
'{
  "text": "Bundles are groups of transactions that execute atomically in a specific order. They are the core primitive for MEV extraction on Jito.",
  "keyPoints": [
    "Bundles contain 1-5 transactions that execute together",
    "Atomic execution: all transactions succeed or all fail",
    "Transaction order is guaranteed within bundle",
    "Bundles compete in auction based on tip amount",
    "Failed bundles do not consume fees"
  ],
  "code": "// Build a simple arbitrage bundle\\nimport { Bundle } from ''@jito-foundation/sdk'';\\n\\nconst buildArbitrageBundle = async (opportunity) => {\\n  const bundle = new Bundle([]);\\n  \\n  // Transaction 1: Buy on DEX A\\n  const buyTx = await buildBuyTransaction(\\n    opportunity.tokenIn,\\n    opportunity.tokenOut,\\n    opportunity.amountIn,\\n    ''raydium''\\n  );\\n  bundle.addTransaction(buyTx);\\n  \\n  // Transaction 2: Sell on DEX B\\n  const sellTx = await buildSellTransaction(\\n    opportunity.tokenOut,\\n    opportunity.tokenIn,\\n    opportunity.amountOut,\\n    ''orca''\\n  );\\n  bundle.addTransaction(sellTx);\\n  \\n  // Transaction 3: Tip to validator\\n  const tipTx = await buildTipTransaction(\\n    opportunity.profit * 0.05 // 5% tip\\n  );\\n  bundle.addTransaction(tipTx);\\n  \\n  return bundle;\\n};",
  "examples": [
    {"type": "Simple Bundle", "description": "2 transactions: Buy token on Raydium + Sell on Orca + Tip"},
    {"type": "Complex Bundle", "description": "5 transactions: Flash loan + Multi-hop arbitrage + Repay loan + Profit withdrawal + Tip"},
    {"type": "Liquidation Bundle", "description": "3 transactions: Liquidate position + Sell collateral + Tip"}
  ]
}'::jsonb);

-- Section 3: Tip Strategies
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'understanding-jito'), 3, 'text', 'Tip Strategies', 
'{
  "text": "Tipping is how searchers bid for bundle inclusion. Optimal tip strategies balance profitability with success rate.",
  "keyPoints": [
    "Tips are paid in SOL to validator tip accounts",
    "Higher tips increase bundle inclusion probability",
    "Typical tips: 5-20% of expected profit",
    "Dynamic tipping adjusts based on competition",
    "Failed bundles do not pay tips"
  ],
  "code": "// Dynamic tip calculator\\nclass TipCalculator {\\n  calculateOptimalTip(profit, competition, urgency) {\\n    // Base tip: 5% of profit\\n    let tipPercent = 0.05;\\n    \\n    // Adjust for competition (0-1 scale)\\n    tipPercent += competition * 0.10;\\n    \\n    // Adjust for urgency (0-1 scale)\\n    tipPercent += urgency * 0.05;\\n    \\n    // Cap at 25% to maintain profitability\\n    tipPercent = Math.min(tipPercent, 0.25);\\n    \\n    const tipAmount = profit * tipPercent;\\n    const netProfit = profit - tipAmount;\\n    \\n    return {\\n      tipAmount,\\n      tipPercent: tipPercent * 100,\\n      netProfit,\\n      roi: (netProfit / tipAmount) * 100\\n    };\\n  }\\n  \\n  // Example usage\\n  // tip = calculator.calculateOptimalTip(100, 0.7, 0.5)\\n  // Result: { tipAmount: 20, tipPercent: 20, netProfit: 80, roi: 400 }\\n}",
  "examples": [
    {"type": "Low Competition", "description": "Profit: $100 | Tip: 5% ($5) | Net: $95 | Success: 90%"},
    {"type": "High Competition", "description": "Profit: $100 | Tip: 15% ($15) | Net: $85 | Success: 95%"},
    {"type": "Extreme Competition", "description": "Profit: $100 | Tip: 25% ($25) | Net: $75 | Success: 98%"}
  ]
}'::jsonb);

-- Section 4: Jito vs Regular Validators
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'understanding-jito'), 4, 'text', 'Jito vs Regular Validators', 
'{
  "text": "Jito-enabled validators significantly outperform regular validators in terms of MEV rewards and overall yield.",
  "comparison": [
    {"aspect": "Base APY", "ethereum": "6-7%", "solana": "6-7%", "impact": "Same base staking rewards"},
    {"aspect": "MEV Rewards", "ethereum": "0%", "solana": "2-3%", "impact": "Jito validators earn extra"},
    {"aspect": "Total APY", "ethereum": "6-7%", "solana": "8-10%", "impact": "30-50% higher yield"},
    {"aspect": "Bundle Success", "ethereum": "70-80%", "solana": "90-95%", "impact": "Higher execution rate"}
  ],
  "keyPoints": [
    "Jito validators process 50%+ of network transactions",
    "MEV tips distributed: 50% validator, 50% stakers",
    "Top Jito validators earn $10K-$50K monthly in MEV",
    "Regular validators miss out on all MEV revenue",
    "Stakers benefit from MEV rewards automatically"
  ]
}'::jsonb);

-- Section 5: Integration Guide
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'understanding-jito'), 5, 'text', 'Integration Guide', 
'{
  "text": "Integrating Jito into your MEV bot requires SDK installation, authentication, and proper bundle construction.",
  "code": "// Complete Jito integration example\\nimport { searcherClient } from ''jito-ts/sdk/block-engine/searcher'';\\nimport { Bundle } from ''jito-ts/sdk/block-engine/types'';\\nimport { Connection, Keypair } from ''@solana/web3.js'';\\n\\n// 1. Initialize Jito client\\nconst BLOCK_ENGINE_URL = ''https://mainnet.block-engine.jito.wtf'';\\nconst keypair = Keypair.fromSecretKey(/* your key */);\\nconst client = searcherClient(BLOCK_ENGINE_URL, keypair);\\n\\n// 2. Build bundle\\nconst bundle = new Bundle([]);\\nbundle.addTransaction(buyTx);\\nbundle.addTransaction(sellTx);\\nbundle.addTransaction(tipTx);\\n\\n// 3. Submit bundle\\ntry {\\n  const bundleId = await client.sendBundle(bundle);\\n  console.log(''Bundle submitted:'', bundleId);\\n  \\n  // 4. Track status\\n  const status = await client.getBundleStatuses([bundleId]);\\n  console.log(''Status:'', status);\\n  \\n  // 5. Handle result\\n  if (status[0].confirmation_status === ''confirmed'') {\\n    console.log(''Bundle landed! Profit secured.'');\\n  } else {\\n    console.log(''Bundle failed. No fees charged.'');\\n  }\\n} catch (error) {\\n  console.error(''Submission error:'', error);\\n}",
  "keyPoints": [
    "Install: npm install jito-ts @solana/web3.js",
    "Authenticate with keypair for bundle submission",
    "Use mainnet.block-engine.jito.wtf endpoint",
    "Always include tip transaction in bundles",
    "Monitor bundle status for confirmation",
    "Handle errors gracefully - retry if needed"
  ]
}'::jsonb);

-- Section 6: Advanced Features
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'understanding-jito'), 6, 'text', 'Advanced Features', 
'{
  "text": "Jito offers advanced features for sophisticated searchers including bundle simulation, performance metrics, and priority routing.",
  "keyPoints": [
    "Bundle Simulation: Test bundles before submission",
    "Performance Metrics: Track success rates and profitability",
    "Priority Routing: Target specific validators",
    "Batch Submission: Submit multiple bundles simultaneously",
    "Status Webhooks: Real-time bundle status updates"
  ],
  "code": "// Advanced: Bundle simulation\\nconst simulateBundle = async (bundle) => {\\n  const simulation = await client.simulateBundle(bundle);\\n  \\n  return {\\n    success: simulation.summary.succeeded,\\n    profit: simulation.summary.totalProfit,\\n    gasUsed: simulation.summary.totalGas,\\n    errors: simulation.transactionResults\\n      .filter(r => r.err)\\n      .map(r => r.err)\\n  };\\n};\\n\\n// Check profitability before submission\\nconst result = await simulateBundle(bundle);\\nif (result.success && result.profit > MIN_PROFIT) {\\n  await client.sendBundle(bundle);\\n} else {\\n  console.log(''Unprofitable, skipping'');\\n}",
  "examples": [
    {"type": "Simulation", "description": "Test bundle execution without paying fees. Verify profitability and catch errors early."},
    {"type": "Metrics", "description": "Track: bundles submitted, success rate, average profit, tip efficiency, validator performance."},
    {"type": "Targeting", "description": "Send bundles to specific high-performance validators for better inclusion rates."}
  ]
}'::jsonb);

-- Section 7: Quiz
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'understanding-jito'), 7, 'quiz', 'Jito Knowledge Check', 
'{
  "questions": [
    {"id": 1, "question": "What percentage of Solana blocks does Jito process?", "options": ["10-20%", "30-40%", "50%+", "80%+"], "correct": 2, "explanation": "Jito processes over 50% of Solana blocks, making it the dominant MEV infrastructure."},
    {"id": 2, "question": "What is a bundle in Jito?", "options": ["A group of validators", "Atomic transactions that execute together", "A collection of tokens", "A type of smart contract"], "correct": 1, "explanation": "A bundle is a group of transactions that execute atomically in a guaranteed order."},
    {"id": 3, "question": "How many transactions can a Jito bundle contain?", "options": ["1-3", "1-5", "1-10", "Unlimited"], "correct": 1, "explanation": "Jito bundles can contain 1-5 transactions that execute together atomically."},
    {"id": 4, "question": "What happens if a bundle fails?", "options": ["You pay full fees", "You pay partial fees", "You pay no fees", "You pay double fees"], "correct": 2, "explanation": "Failed bundles do not consume any fees, making Jito risk-free for searchers."},
    {"id": 5, "question": "What is a typical tip percentage for bundle inclusion?", "options": ["1-3%", "5-20%", "25-40%", "50%+"], "correct": 1, "explanation": "Typical tips range from 5-20% of expected profit, balancing profitability with success rate."},
    {"id": 6, "question": "How much more do Jito validators earn compared to regular validators?", "options": ["5-10%", "15-25%", "30-50%", "100%+"], "correct": 2, "explanation": "Jito validators typically earn 30-50% more due to MEV tips and rewards."},
    {"id": 7, "question": "How are MEV tips distributed?", "options": ["100% to validator", "100% to stakers", "50% validator, 50% stakers", "33% each to validator, stakers, protocol"], "correct": 2, "explanation": "MEV tips are split 50/50 between validators and their stakers."},
    {"id": 8, "question": "What is the Jito block engine endpoint for mainnet?", "options": ["mainnet.jito.wtf", "mainnet.block-engine.jito.wtf", "api.jito.wtf", "rpc.jito.wtf"], "correct": 1, "explanation": "The mainnet block engine endpoint is mainnet.block-engine.jito.wtf."},
    {"id": 9, "question": "What must every bundle include?", "options": ["A flash loan", "A tip transaction", "An arbitrage", "A liquidation"], "correct": 1, "explanation": "Every bundle must include a tip transaction to compensate validators for inclusion."},
    {"id": 10, "question": "What is bundle simulation used for?", "options": ["Paying fees", "Testing execution before submission", "Increasing tip amount", "Bypassing validators"], "correct": 1, "explanation": "Bundle simulation tests execution without paying fees, helping verify profitability."}
  ],
  "passing_score": 70
}'::jsonb);

UPDATE learning_modules SET xp_reward = 150 WHERE slug = 'understanding-jito';
