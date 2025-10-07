-- Enhance "Risk Management" module with 6 comprehensive sections

DELETE FROM module_content WHERE module_id = (SELECT id FROM learning_modules WHERE slug = 'risk-management');

UPDATE learning_modules 
SET 
  estimated_time = 70,
  description = 'Master risk management: position sizing, stop-loss strategies, portfolio diversification, and risk metrics'
WHERE slug = 'risk-management';

-- Section 1: Risk Fundamentals
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'risk-management'), 1, 'text', 'Risk Management Fundamentals', 
'{
  "text": "Effective risk management is the difference between sustainable MEV profits and catastrophic losses.",
  "keyPoints": [
    "Risk vs Reward: Higher returns require higher risk tolerance",
    "Capital preservation: Protect principal above all",
    "Diversification: Spread risk across strategies",
    "Position sizing: Never risk more than you can afford to lose",
    "Emotional control: Stick to strategy, avoid panic decisions"
  ],
  "examples": [
    {"type": "Conservative", "description": "Risk 1-2% per trade. Target 3-5% returns. Win rate: 70%. Sustainable long-term."},
    {"type": "Moderate", "description": "Risk 3-5% per trade. Target 10-15% returns. Win rate: 60%. Higher volatility."},
    {"type": "Aggressive", "description": "Risk 10%+ per trade. Target 50%+ returns. Win rate: 40%. High risk of ruin."}
  ],
  "code": "// Risk calculator\\nclass RiskCalculator {\\n  calculateRisk(capital, riskPercent, winRate, avgWin, avgLoss) {\\n    const riskAmount = capital * (riskPercent / 100);\\n    const expectedValue = (winRate * avgWin) - ((1 - winRate) * avgLoss);\\n    const riskOfRuin = this.calculateRiskOfRuin(capital, riskAmount, winRate);\\n    \\n    return {\\n      riskAmount,\\n      expectedValue,\\n      riskOfRuin,\\n      recommendation: this.getRecommendation(riskOfRuin)\\n    };\\n  }\\n  \\n  calculateRiskOfRuin(capital, riskPerTrade, winRate) {\\n    const a = (1 - winRate) / winRate;\\n    const n = capital / riskPerTrade;\\n    return Math.pow(a, n) * 100;\\n  }\\n}"
}'::jsonb);

-- Section 2: Position Sizing
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'risk-management'), 2, 'text', 'Position Sizing Strategies', 
'{
  "text": "Position sizing determines how much capital to allocate to each opportunity. Proper sizing prevents catastrophic losses.",
  "keyPoints": [
    "Fixed percentage: Risk same % of capital each trade",
    "Kelly Criterion: Mathematically optimal sizing",
    "Volatility-based: Adjust size based on market conditions",
    "Opportunity-based: Larger positions for higher confidence",
    "Maximum position: Never exceed 10-20% of capital"
  ],
  "code": "// Position sizing calculator\\nclass PositionSizer {\\n  // Fixed percentage method\\n  fixedPercentage(capital, riskPercent = 2) {\\n    return capital * (riskPercent / 100);\\n  }\\n  \\n  // Kelly Criterion\\n  kellyCriterion(capital, winRate, avgWin, avgLoss) {\\n    const p = winRate;\\n    const b = avgWin / avgLoss;\\n    const kelly = (p * b - (1 - p)) / b;\\n    \\n    // Use half-Kelly for safety\\n    const halfKelly = kelly / 2;\\n    \\n    return {\\n      fullKelly: capital * kelly,\\n      halfKelly: capital * halfKelly,\\n      recommended: capital * Math.max(0, Math.min(halfKelly, 0.10))\\n    };\\n  }\\n  \\n  // Volatility-adjusted sizing\\n  volatilityAdjusted(capital, baseSize, volatility) {\\n    const avgVolatility = 0.02; // 2% average\\n    const adjustment = avgVolatility / volatility;\\n    \\n    return baseSize * adjustment;\\n  }\\n  \\n  // Confidence-based sizing\\n  confidenceBased(capital, confidence, maxSize = 0.10) {\\n    // confidence: 0-1 scale\\n    return capital * maxSize * confidence;\\n  }\\n}",
  "examples": [
    {"type": "Fixed 2%", "description": "$10K capital → $200 per trade. Simple, consistent, safe."},
    {"type": "Kelly", "description": "60% win rate, 2:1 reward:risk → 10% Kelly → 5% half-Kelly → $500 position"},
    {"type": "Volatility", "description": "High volatility (4%) → Reduce position by 50% → $100 instead of $200"}
  ]
}'::jsonb);

-- Section 3: Stop-Loss Strategies
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'risk-management'), 3, 'text', 'Stop-Loss Strategies', 
'{
  "text": "Stop-losses limit downside risk by automatically exiting losing positions. Essential for capital preservation.",
  "keyPoints": [
    "Fixed stop: Exit at predetermined loss level",
    "Trailing stop: Lock in profits as position moves favorably",
    "Time-based stop: Exit after maximum time elapsed",
    "Volatility stop: Adjust based on market conditions",
    "Never move stops against you: Discipline is critical"
  ],
  "code": "// Stop-loss manager\\nclass StopLossManager {\\n  // Fixed stop-loss\\n  fixedStop(entryPrice, stopPercent = 5) {\\n    return {\\n      stopPrice: entryPrice * (1 - stopPercent / 100),\\n      maxLoss: stopPercent\\n    };\\n  }\\n  \\n  // Trailing stop\\n  trailingStop(entryPrice, currentPrice, trailPercent = 3) {\\n    const highestPrice = Math.max(entryPrice, currentPrice);\\n    const stopPrice = highestPrice * (1 - trailPercent / 100);\\n    const profit = ((currentPrice - entryPrice) / entryPrice) * 100;\\n    \\n    return {\\n      stopPrice,\\n      highestPrice,\\n      currentProfit: profit,\\n      locked: profit > 0\\n    };\\n  }\\n  \\n  // Time-based stop\\n  timeBasedStop(startTime, maxDurationMs = 300000) {\\n    const elapsed = Date.now() - startTime;\\n    const shouldExit = elapsed > maxDurationMs;\\n    \\n    return {\\n      elapsed,\\n      maxDuration: maxDurationMs,\\n      shouldExit,\\n      reason: shouldExit ? ''max_time_exceeded'' : ''within_limit''\\n    };\\n  }\\n  \\n  // ATR-based stop (volatility)\\n  atrStop(entryPrice, atr, multiplier = 2) {\\n    return {\\n      stopPrice: entryPrice - (atr * multiplier),\\n      stopDistance: atr * multiplier,\\n      volatilityAdjusted: true\\n    };\\n  }\\n}",
  "examples": [
    {"type": "Fixed Stop", "description": "Entry: $100, Stop: $95 (5%). Max loss: $5 per unit."},
    {"type": "Trailing Stop", "description": "Entry: $100, High: $110, Trail: 3% → Stop: $106.70. Locks $6.70 profit."},
    {"type": "Time Stop", "description": "Max hold: 5 minutes. Exit regardless of P&L if time exceeded."}
  ]
}'::jsonb);

-- Section 4: Portfolio Diversification
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'risk-management'), 4, 'text', 'Portfolio Diversification', 
'{
  "text": "Diversification reduces risk by spreading capital across multiple strategies, tokens, and protocols.",
  "keyPoints": [
    "Strategy diversification: Arbitrage, liquidations, JIT liquidity",
    "Token diversification: Multiple token pairs",
    "Protocol diversification: Multiple DEXs and lending platforms",
    "Time diversification: Different market conditions",
    "Correlation: Avoid highly correlated positions"
  ],
  "code": "// Portfolio diversifier\\nclass PortfolioDiversifier {\\n  analyzePortfolio(positions) {\\n    const byStrategy = this.groupBy(positions, ''strategy'');\\n    const byToken = this.groupBy(positions, ''token'');\\n    const byProtocol = this.groupBy(positions, ''protocol'');\\n    \\n    return {\\n      strategyConcentration: this.calculateConcentration(byStrategy),\\n      tokenConcentration: this.calculateConcentration(byToken),\\n      protocolConcentration: this.calculateConcentration(byProtocol),\\n      diversificationScore: this.calculateDiversificationScore(positions),\\n      recommendations: this.getRecommendations(positions)\\n    };\\n  }\\n  \\n  calculateConcentration(groups) {\\n    const total = Object.values(groups).reduce((sum, g) => sum + g.value, 0);\\n    const herfindahl = Object.values(groups).reduce((sum, g) => {\\n      const share = g.value / total;\\n      return sum + (share * share);\\n    }, 0);\\n    \\n    return {\\n      herfindahl,\\n      level: herfindahl > 0.5 ? ''high'' : herfindahl > 0.25 ? ''medium'' : ''low''\\n    };\\n  }\\n  \\n  calculateDiversificationScore(positions) {\\n    const strategies = new Set(positions.map(p => p.strategy)).size;\\n    const tokens = new Set(positions.map(p => p.token)).size;\\n    const protocols = new Set(positions.map(p => p.protocol)).size;\\n    \\n    return Math.min((strategies * 30 + tokens * 20 + protocols * 20) / 70, 100);\\n  }\\n}",
  "examples": [
    {"type": "Well Diversified", "description": "40% arbitrage, 30% liquidations, 30% JIT. 5 tokens, 4 protocols. Score: 85/100"},
    {"type": "Concentrated", "description": "90% arbitrage, 1 token (SOL), 1 protocol. Score: 25/100. High risk."},
    {"type": "Optimal", "description": "3 strategies, 6 tokens, 5 protocols. No position >20%. Score: 95/100"}
  ]
}'::jsonb);

-- Section 5: Risk Metrics
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'risk-management'), 5, 'text', 'Risk Metrics & Monitoring', 
'{
  "text": "Track key risk metrics to ensure your MEV operations remain within acceptable risk parameters.",
  "keyPoints": [
    "Sharpe Ratio: Risk-adjusted returns",
    "Maximum Drawdown: Largest peak-to-trough decline",
    "Win Rate: Percentage of profitable trades",
    "Profit Factor: Gross profit / Gross loss",
    "Value at Risk (VaR): Maximum expected loss"
  ],
  "code": "// Risk metrics calculator\\nclass RiskMetrics {\\n  calculateSharpeRatio(returns, riskFreeRate = 0.02) {\\n    const avgReturn = returns.reduce((a, b) => a + b) / returns.length;\\n    const stdDev = this.calculateStdDev(returns);\\n    \\n    return (avgReturn - riskFreeRate) / stdDev;\\n  }\\n  \\n  calculateMaxDrawdown(equity) {\\n    let maxDrawdown = 0;\\n    let peak = equity[0];\\n    \\n    for (const value of equity) {\\n      if (value > peak) peak = value;\\n      const drawdown = ((peak - value) / peak) * 100;\\n      if (drawdown > maxDrawdown) maxDrawdown = drawdown;\\n    }\\n    \\n    return maxDrawdown;\\n  }\\n  \\n  calculateProfitFactor(trades) {\\n    const wins = trades.filter(t => t.profit > 0);\\n    const losses = trades.filter(t => t.profit < 0);\\n    \\n    const grossProfit = wins.reduce((sum, t) => sum + t.profit, 0);\\n    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));\\n    \\n    return grossProfit / grossLoss;\\n  }\\n  \\n  calculateVaR(returns, confidence = 0.95) {\\n    const sorted = returns.sort((a, b) => a - b);\\n    const index = Math.floor((1 - confidence) * sorted.length);\\n    \\n    return Math.abs(sorted[index]);\\n  }\\n}",
  "comparison": [
    {"aspect": "Sharpe Ratio", "ethereum": ">1.0 Good", "solana": ">2.0 Excellent", "impact": "Risk-adjusted performance"},
    {"aspect": "Max Drawdown", "ethereum": "<20% Good", "solana": "<10% Excellent", "impact": "Capital preservation"},
    {"aspect": "Win Rate", "ethereum": ">50%", "solana": ">60%", "impact": "Consistency"},
    {"aspect": "Profit Factor", "ethereum": ">1.5", "solana": ">2.0", "impact": "Profitability"}
  ]
}'::jsonb);

-- Section 6: Quiz
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'risk-management'), 6, 'quiz', 'Risk Management Quiz', 
'{
  "questions": [
    {"id": 1, "question": "What is a safe risk percentage per trade?", "options": ["10-20%", "5-10%", "1-5%", "<1%"], "correct": 2, "explanation": "Risking 1-5% per trade is generally safe and sustainable for most strategies."},
    {"id": 2, "question": "What is the Kelly Criterion used for?", "options": ["Stop-loss placement", "Optimal position sizing", "Profit targets", "Time management"], "correct": 1, "explanation": "Kelly Criterion calculates mathematically optimal position size based on win rate and payoff ratio."},
    {"id": 3, "question": "What is a trailing stop-loss?", "options": ["Fixed stop price", "Stop that moves with profit", "Time-based exit", "Volatility stop"], "correct": 1, "explanation": "Trailing stop moves up with price to lock in profits while limiting downside."},
    {"id": 4, "question": "What is portfolio diversification?", "options": ["Using one strategy", "Spreading risk across multiple positions", "Maximizing leverage", "Trading one token"], "correct": 1, "explanation": "Diversification spreads risk across strategies, tokens, and protocols to reduce overall portfolio risk."},
    {"id": 5, "question": "What does Sharpe Ratio measure?", "options": ["Total returns", "Risk-adjusted returns", "Win rate", "Maximum loss"], "correct": 1, "explanation": "Sharpe Ratio measures returns relative to risk taken, with higher values indicating better risk-adjusted performance."},
    {"id": 6, "question": "What is maximum drawdown?", "options": ["Largest single loss", "Peak-to-trough decline", "Average loss", "Total losses"], "correct": 1, "explanation": "Maximum drawdown is the largest peak-to-trough decline in portfolio value."},
    {"id": 7, "question": "What is a good profit factor?", "options": [">0.5", ">1.0", ">1.5", ">3.0"], "correct": 2, "explanation": "Profit factor >1.5 indicates gross profits are at least 1.5x gross losses, showing good profitability."},
    {"id": 8, "question": "When should you move a stop-loss?", "options": ["Never against you", "When losing", "Randomly", "Every hour"], "correct": 0, "explanation": "Never move stops against you (wider). Only tighten stops to lock in profits."},
    {"id": 9, "question": "What is Value at Risk (VaR)?", "options": ["Average profit", "Maximum expected loss at confidence level", "Total capital", "Win rate"], "correct": 1, "explanation": "VaR estimates maximum expected loss over a time period at a given confidence level (e.g., 95%)."},
    {"id": 10, "question": "What is optimal portfolio concentration?", "options": ["100% in one position", "No position >20%", "Equal weight all positions", "50% in top position"], "correct": 1, "explanation": "No single position should exceed 20% of portfolio to maintain proper diversification."}
  ],
  "passing_score": 70
}'::jsonb);

UPDATE learning_modules SET xp_reward = 200 WHERE slug = 'risk-management';
