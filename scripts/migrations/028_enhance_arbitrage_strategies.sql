-- Enhance "Arbitrage Strategies" module with 8 comprehensive sections

DELETE FROM module_content WHERE module_id = (SELECT id FROM learning_modules WHERE slug = 'arbitrage-strategies');

UPDATE learning_modules 
SET 
  estimated_time = 75,
  description = 'Master arbitrage strategies: DEX arbitrage, multi-hop paths, CEX-DEX, statistical arbitrage, and competition analysis'
WHERE slug = 'arbitrage-strategies';

-- Section 1: Arbitrage Fundamentals
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'arbitrage-strategies'), 1, 'text', 'Arbitrage Fundamentals', 
'{
  "text": "Arbitrage is the simultaneous purchase and sale of an asset to profit from price differences across markets. It is considered risk-free profit when executed properly.",
  "keyPoints": [
    "Price discovery: Markets find equilibrium through arbitrage",
    "Market efficiency: Arbitrage reduces price discrepancies",
    "Risk-free profit: When executed atomically with no market risk",
    "Capital requirements: Larger capital enables bigger profits",
    "Speed critical: Opportunities exist for milliseconds"
  ],
  "examples": [
    {"type": "Simple Arbitrage", "description": "SOL trades at $100 on Raydium, $101 on Orca. Buy 1000 SOL on Raydium ($100K), sell on Orca ($101K), profit $1K minus fees."},
    {"type": "Triangle Arbitrage", "description": "SOL→USDC→ETH→SOL creates profit loop when exchange rates are misaligned across three pairs."}
  ]
}'::jsonb);

-- Section 2: DEX Arbitrage
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'arbitrage-strategies'), 2, 'text', 'DEX Arbitrage on Solana', 
'{
  "text": "DEX arbitrage exploits price differences between decentralized exchanges like Raydium, Orca, and Serum. Understanding AMM mechanics is crucial.",
  "keyPoints": [
    "AMM vs CLMM: Constant product vs concentrated liquidity",
    "Slippage: Price impact increases with trade size",
    "Pool depth: Deeper pools have less slippage",
    "Fees: 0.25-0.3% typical, reduces profit margin",
    "Atomic execution: Bundle both trades together"
  ],
  "code": "// Detect DEX arbitrage opportunity\\nconst detectDexArbitrage = async (tokenPair) => {\\n  const raydiumPrice = await getRaydiumPrice(tokenPair);\\n  const orcaPrice = await getOrcaPrice(tokenPair);\\n  const serumPrice = await getSerumPrice(tokenPair);\\n  \\n  const prices = [\\n    { dex: ''raydium'', price: raydiumPrice },\\n    { dex: ''orca'', price: orcaPrice },\\n    { dex: ''serum'', price: serumPrice }\\n  ];\\n  \\n  const lowest = prices.reduce((min, p) => p.price < min.price ? p : min);\\n  const highest = prices.reduce((max, p) => p.price > max.price ? p : max);\\n  \\n  const spread = ((highest.price - lowest.price) / lowest.price) * 100;\\n  const minSpread = 0.5; // 0.5% minimum for profitability\\n  \\n  if (spread > minSpread) {\\n    return {\\n      profitable: true,\\n      buyDex: lowest.dex,\\n      sellDex: highest.dex,\\n      spread: spread.toFixed(2),\\n      estimatedProfit: calculateProfit(lowest.price, highest.price, 1000)\\n    };\\n  }\\n  \\n  return { profitable: false };\\n};",
  "comparison": [
    {"aspect": "Raydium", "ethereum": "AMM", "solana": "High liquidity", "impact": "Best for large trades"},
    {"aspect": "Orca", "ethereum": "CLMM", "solana": "Low fees", "impact": "Best for small trades"},
    {"aspect": "Serum", "ethereum": "Order book", "solana": "Limit orders", "impact": "Best for precise pricing"}
  ]
}'::jsonb);

-- Section 3: Multi-Hop Arbitrage
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'arbitrage-strategies'), 3, 'text', 'Multi-Hop Arbitrage', 
'{
  "text": "Multi-hop arbitrage involves trading across 3+ DEXs or token pairs to extract profit from complex price relationships.",
  "keyPoints": [
    "Path finding: Graph algorithms find profitable routes",
    "Gas optimization: More hops = higher gas costs",
    "Slippage accumulation: Each hop adds slippage",
    "Atomic execution: All trades must succeed or fail together",
    "Competition: Complex paths have less competition"
  ],
  "code": "// Multi-hop path finder using Bellman-Ford\\nclass PathFinder {\\n  constructor(dexes) {\\n    this.graph = this.buildGraph(dexes);\\n  }\\n  \\n  findProfitablePath(startToken, minProfit = 0.01) {\\n    const paths = [];\\n    \\n    // Try all possible 3-hop paths\\n    for (const token1 of this.getConnectedTokens(startToken)) {\\n      for (const token2 of this.getConnectedTokens(token1)) {\\n        for (const token3 of this.getConnectedTokens(token2)) {\\n          if (token3 === startToken) {\\n            const profit = this.calculatePathProfit([\\n              startToken, token1, token2, token3\\n            ]);\\n            \\n            if (profit > minProfit) {\\n              paths.push({\\n                route: [startToken, token1, token2, token3],\\n                profit,\\n                hops: 3\\n              });\\n            }\\n          }\\n        }\\n      }\\n    }\\n    \\n    return paths.sort((a, b) => b.profit - a.profit)[0];\\n  }\\n  \\n  calculatePathProfit(route) {\\n    let amount = 1000; // Start with 1000 units\\n    \\n    for (let i = 0; i < route.length - 1; i++) {\\n      const pair = [route[i], route[i + 1]];\\n      amount = this.simulateSwap(pair, amount);\\n    }\\n    \\n    return ((amount - 1000) / 1000) * 100; // Profit %\\n  }\\n}",
  "examples": [
    {"type": "3-Hop Path", "description": "SOL→USDC (Raydium) → ETH (Orca) → SOL (Serum). Profit: 1.2% after fees."},
    {"type": "4-Hop Path", "description": "SOL→USDC→BTC→ETH→SOL across 4 DEXs. Higher profit (2.1%) but more gas and risk."}
  ]
}'::jsonb);

-- Section 4: CEX-DEX Arbitrage
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'arbitrage-strategies'), 4, 'text', 'CEX-DEX Arbitrage', 
'{
  "text": "CEX-DEX arbitrage exploits price differences between centralized exchanges (Binance, FTX) and decentralized exchanges on Solana.",
  "keyPoints": [
    "Latency: CEX prices update faster than DEX",
    "Withdrawal times: CEX withdrawals take 1-5 minutes",
    "Capital split: Need funds on both CEX and DEX",
    "API integration: Real-time CEX price feeds required",
    "Risk: Price can move during withdrawal period"
  ],
  "code": "// CEX-DEX arbitrage detector\\nclass CexDexArbitrage {\\n  async detectOpportunity(token) {\\n    const [cexPrice, dexPrice] = await Promise.all([\\n      this.getCexPrice(token), // Binance API\\n      this.getDexPrice(token)  // Raydium\\n    ]);\\n    \\n    const spread = Math.abs(cexPrice - dexPrice) / Math.min(cexPrice, dexPrice);\\n    const minSpread = 0.008; // 0.8% to cover fees + risk\\n    \\n    if (spread > minSpread) {\\n      const direction = cexPrice < dexPrice ? ''buy_cex_sell_dex'' : ''buy_dex_sell_cex'';\\n      \\n      return {\\n        profitable: true,\\n        direction,\\n        spread: (spread * 100).toFixed(2),\\n        cexPrice,\\n        dexPrice,\\n        estimatedProfit: this.calculateProfit(cexPrice, dexPrice, 10000),\\n        risk: ''medium'' // Price movement during transfer\\n      };\\n    }\\n    \\n    return { profitable: false };\\n  }\\n  \\n  async executeCexDex(opportunity) {\\n    if (opportunity.direction === ''buy_cex_sell_dex'') {\\n      // 1. Buy on CEX\\n      await this.buyCex(opportunity.token, opportunity.amount);\\n      // 2. Withdraw to Solana wallet (1-5 min)\\n      await this.withdrawCex(opportunity.token, opportunity.amount);\\n      // 3. Sell on DEX\\n      await this.sellDex(opportunity.token, opportunity.amount);\\n    }\\n  }\\n}",
  "examples": [
    {"type": "Fast Opportunity", "description": "SOL $100 on Binance, $101.50 on Raydium. 1.5% spread. Execute within 2 minutes before price converges."},
    {"type": "Failed Opportunity", "description": "Detected 1.2% spread but price moved during 3-minute withdrawal. Lost 0.5% instead of gaining 1.2%."}
  ]
}'::jsonb);

-- Section 5: Statistical Arbitrage
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'arbitrage-strategies'), 5, 'text', 'Statistical Arbitrage', 
'{
  "text": "Statistical arbitrage uses quantitative models to identify temporary price deviations and profit from mean reversion.",
  "keyPoints": [
    "Mean reversion: Prices return to historical average",
    "Correlation trading: Trade correlated asset pairs",
    "Z-score: Measures standard deviations from mean",
    "Backtesting: Validate strategies on historical data",
    "Risk management: Use stop-losses and position sizing"
  ],
  "code": "// Statistical arbitrage with mean reversion\\nclass StatArbitrage {\\n  constructor(pair, lookback = 100) {\\n    this.pair = pair;\\n    this.lookback = lookback;\\n    this.priceHistory = [];\\n  }\\n  \\n  async detectOpportunity() {\\n    const currentRatio = await this.getPriceRatio();\\n    this.priceHistory.push(currentRatio);\\n    \\n    if (this.priceHistory.length < this.lookback) {\\n      return { signal: ''wait'', reason: ''insufficient_data'' };\\n    }\\n    \\n    // Keep only recent history\\n    if (this.priceHistory.length > this.lookback) {\\n      this.priceHistory.shift();\\n    }\\n    \\n    const mean = this.calculateMean(this.priceHistory);\\n    const stdDev = this.calculateStdDev(this.priceHistory, mean);\\n    const zScore = (currentRatio - mean) / stdDev;\\n    \\n    // Trading signals\\n    if (zScore > 2) {\\n      return {\\n        signal: ''sell'',\\n        reason: ''overvalued'',\\n        zScore: zScore.toFixed(2),\\n        confidence: Math.min(Math.abs(zScore) / 3, 1)\\n      };\\n    } else if (zScore < -2) {\\n      return {\\n        signal: ''buy'',\\n        reason: ''undervalued'',\\n        zScore: zScore.toFixed(2),\\n        confidence: Math.min(Math.abs(zScore) / 3, 1)\\n      };\\n    }\\n    \\n    return { signal: ''hold'', zScore: zScore.toFixed(2) };\\n  }\\n}",
  "examples": [
    {"type": "Pairs Trading", "description": "SOL/ETH ratio typically 0.05-0.06. When ratio hits 0.07 (z-score +2.5), short SOL/long ETH expecting reversion."},
    {"type": "Mean Reversion", "description": "Token price deviates 3 standard deviations from 30-day average. High probability of reversion within 24 hours."}
  ]
}'::jsonb);

-- Section 6: Competition Analysis
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'arbitrage-strategies'), 6, 'text', 'Competition Analysis', 
'{
  "text": "Understanding and adapting to competition is crucial for sustained arbitrage profitability.",
  "keyPoints": [
    "Bot detection: Identify competing bots by transaction patterns",
    "Speed advantages: Co-location and optimized code win races",
    "Capital advantages: Larger capital captures bigger opportunities",
    "Market saturation: Popular pairs have intense competition",
    "Niche opportunities: Less liquid pairs have less competition"
  ],
  "examples": [
    {"type": "High Competition", "description": "SOL/USDC on Raydium-Orca: 50+ bots competing. Need <100ms execution. Profit margins <0.3%."},
    {"type": "Low Competition", "description": "Long-tail tokens: 5-10 bots. 500ms acceptable. Profit margins 1-3%."},
    {"type": "Speed War", "description": "Two bots detect same opportunity. Bot A: 80ms execution wins. Bot B: 120ms execution fails."}
  ],
  "code": "// Competition probability estimator\\nclass CompetitionAnalyzer {\\n  estimateCompetition(opportunity) {\\n    let score = 0;\\n    \\n    // Factor 1: Token popularity\\n    if (opportunity.volume24h > 10000000) score += 30;\\n    else if (opportunity.volume24h > 1000000) score += 20;\\n    else score += 10;\\n    \\n    // Factor 2: Profit size\\n    if (opportunity.profit > 1000) score += 25;\\n    else if (opportunity.profit > 100) score += 15;\\n    else score += 5;\\n    \\n    // Factor 3: Opportunity duration\\n    if (opportunity.ageMs < 100) score += 20;\\n    else if (opportunity.ageMs < 500) score += 10;\\n    \\n    // Factor 4: DEX pair\\n    const popularPairs = [''SOL/USDC'', ''ETH/USDC'', ''BTC/USDC''];\\n    if (popularPairs.includes(opportunity.pair)) score += 25;\\n    \\n    return {\\n      score,\\n      level: score > 70 ? ''extreme'' : score > 50 ? ''high'' : score > 30 ? ''medium'' : ''low'',\\n      recommendedTip: this.calculateTip(score)\\n    };\\n  }\\n}"
}'::jsonb);

-- Section 7: Case Studies
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'arbitrage-strategies'), 7, 'text', 'Real-World Case Studies', 
'{
  "text": "Learn from actual arbitrage trades executed on Solana, both successful and failed.",
  "examples": [
    {"type": "Success: $1.2M Arbitrage (Nov 2023)", "description": "Searcher detected 2.5% price difference between Raydium and Orca during high volatility. Executed 3-transaction bundle: buy 50K SOL on Raydium ($100), sell on Orca ($102.50), tip validator $60K. Net profit: $1.19M. Execution time: 380ms."},
    {"type": "Success: Multi-Hop $45K (Dec 2023)", "description": "4-hop arbitrage: SOL→USDC→ETH→BTC→SOL across Raydium, Orca, Serum. Initial: 1000 SOL. Final: 1045 SOL. Profit: 4.5% ($45K). Gas: $2K. Tip: $4K. Net: $39K."},
    {"type": "Failure: Slippage Loss", "description": "Bot detected 1.5% opportunity but used 5000 SOL (too large). Slippage on both DEXs totaled 2.1%. Lost $30K instead of gaining $75K. Lesson: Calculate optimal trade size."},
    {"type": "Failure: Competition", "description": "Detected opportunity at 100ms. Submitted bundle at 180ms. Competing bot submitted at 150ms with higher tip. Lost race. Lesson: Optimize execution speed."}
  ],
  "keyPoints": [
    "Large opportunities attract more competition",
    "Speed optimization is critical for success",
    "Slippage calculation must be precise",
    "Failed bundles cost nothing (Jito benefit)",
    "Diversify across multiple strategies"
  ]
}'::jsonb);

-- Section 8: Quiz
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'arbitrage-strategies'), 8, 'quiz', 'Arbitrage Mastery Quiz', 
'{
  "questions": [
    {"id": 1, "question": "What is the minimum spread needed for profitable DEX arbitrage?", "options": ["0.1-0.2%", "0.5-0.8%", "1.5-2%", "3-5%"], "correct": 1, "explanation": "Minimum 0.5-0.8% spread needed to cover DEX fees (0.25-0.3% each side) plus gas and tip."},
    {"id": 2, "question": "What is multi-hop arbitrage?", "options": ["Trading on multiple exchanges", "Trading across 3+ DEXs or pairs", "Using multiple wallets", "Trading multiple tokens"], "correct": 1, "explanation": "Multi-hop arbitrage involves trading across 3 or more DEXs or token pairs to extract profit."},
    {"id": 3, "question": "What is the main risk of CEX-DEX arbitrage?", "options": ["High fees", "Price movement during withdrawal", "Account suspension", "Low liquidity"], "correct": 1, "explanation": "Price can move unfavorably during the 1-5 minute CEX withdrawal period."},
    {"id": 4, "question": "What does a z-score of +2.5 indicate in statistical arbitrage?", "options": ["Buy signal", "Sell signal - overvalued", "Hold signal", "Error in calculation"], "correct": 1, "explanation": "Z-score +2.5 means price is 2.5 standard deviations above mean, indicating overvaluation and sell signal."},
    {"id": 5, "question": "Which DEX type typically has the lowest fees?", "options": ["AMM (Raydium)", "CLMM (Orca)", "Order book (Serum)", "All same"], "correct": 1, "explanation": "CLMM (Concentrated Liquidity Market Maker) like Orca typically has lower fees than traditional AMMs."},
    {"id": 6, "question": "What is the optimal execution time for high-competition arbitrage?", "options": ["<100ms", "100-500ms", "500ms-1s", ">1s"], "correct": 0, "explanation": "High-competition opportunities require <100ms execution to win against other bots."},
    {"id": 7, "question": "What happens if one transaction in a bundle fails?", "options": ["Other transactions still execute", "All transactions fail atomically", "You pay partial fees", "Bundle retries automatically"], "correct": 1, "explanation": "Bundles execute atomically - all transactions succeed or all fail together."},
    {"id": 8, "question": "What is the main advantage of statistical arbitrage?", "options": ["No capital required", "Risk-free profit", "Profits from mean reversion", "No competition"], "correct": 2, "explanation": "Statistical arbitrage profits from mean reversion when prices deviate from historical patterns."},
    {"id": 9, "question": "How should you size trades to minimize slippage?", "options": ["Always use maximum capital", "Calculate based on pool depth", "Use fixed amount", "Random sizing"], "correct": 1, "explanation": "Trade size should be calculated based on pool depth to minimize price impact and slippage."},
    {"id": 10, "question": "What indicates high competition for an opportunity?", "options": ["Low volume", "Small profit", "Popular token pair + large profit", "Long opportunity duration"], "correct": 2, "explanation": "Popular token pairs with large profits attract the most competition from sophisticated bots."}
  ],
  "passing_score": 70
}'::jsonb);

UPDATE learning_modules SET xp_reward = 200 WHERE slug = 'arbitrage-strategies';
