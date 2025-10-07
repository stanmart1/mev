-- Enhance "Liquidation Hunting" module with 6 comprehensive sections

DELETE FROM module_content WHERE module_id = (SELECT id FROM learning_modules WHERE slug = 'liquidation-hunting');

UPDATE learning_modules 
SET 
  estimated_time = 50,
  description = 'Master liquidation strategies: lending protocol mechanics, health factor monitoring, execution, and risk management'
WHERE slug = 'liquidation-hunting';

-- Section 1: Lending Protocol Mechanics
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'liquidation-hunting'), 1, 'text', 'Lending Protocol Mechanics', 
'{
  "text": "Lending protocols allow users to deposit collateral and borrow assets. When collateral value drops below required threshold, positions become liquidatable.",
  "keyPoints": [
    "Collateral: Assets deposited to secure loans",
    "Loan-to-Value (LTV): Maximum borrow amount vs collateral",
    "Liquidation Threshold: Point where position can be liquidated",
    "Health Factor: Ratio of collateral to debt (< 1.0 = liquidatable)",
    "Liquidation Bonus: Reward for liquidators (5-10%)"
  ],
  "examples": [
    {"type": "Healthy Position", "description": "Deposit: $10K SOL | Borrow: $5K USDC | LTV: 50% | Health: 1.6 | Status: Safe"},
    {"type": "At Risk", "description": "Deposit: $10K SOL | Borrow: $7.5K USDC | LTV: 75% | Health: 1.1 | Status: Risky"},
    {"type": "Liquidatable", "description": "Deposit: $10K SOL | Borrow: $8.5K USDC | LTV: 85% | Health: 0.95 | Status: Liquidate"}
  ],
  "comparison": [
    {"aspect": "Solend", "ethereum": "80% LTV", "solana": "5% bonus", "impact": "Most popular"},
    {"aspect": "MarginFi", "ethereum": "75% LTV", "solana": "7% bonus", "impact": "Higher rewards"},
    {"aspect": "Mango", "ethereum": "70% LTV", "solana": "10% bonus", "impact": "Best for liquidators"}
  ]
}'::jsonb);

-- Section 2: Health Factor Monitoring
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'liquidation-hunting'), 2, 'text', 'Health Factor Monitoring', 
'{
  "text": "Continuous monitoring of health factors across all positions is essential for identifying liquidation opportunities.",
  "code": "// Health factor monitor\\nclass HealthMonitor {\\n  async scanPositions(protocol) {\\n    const positions = await protocol.getAllPositions();\\n    const liquidatable = [];\\n    \\n    for (const position of positions) {\\n      const health = await this.calculateHealth(position);\\n      \\n      if (health < 1.0) {\\n        const profit = this.estimateProfit(position);\\n        liquidatable.push({\\n          user: position.owner,\\n          collateral: position.collateral,\\n          debt: position.debt,\\n          health,\\n          profit,\\n          priority: health < 0.95 ? ''high'' : ''medium''\\n        });\\n      }\\n    }\\n    \\n    return liquidatable.sort((a, b) => b.profit - a.profit);\\n  }\\n  \\n  calculateHealth(position) {\\n    const collateralValue = position.collateralAmount * position.collateralPrice;\\n    const debtValue = position.debtAmount * position.debtPrice;\\n    const liquidationThreshold = 0.85; // 85%\\n    \\n    return (collateralValue * liquidationThreshold) / debtValue;\\n  }\\n  \\n  estimateProfit(position) {\\n    const debtValue = position.debtAmount * position.debtPrice;\\n    const bonus = 0.05; // 5% liquidation bonus\\n    const gasCost = 0.5;\\n    \\n    return (debtValue * bonus) - gasCost;\\n  }\\n}",
  "keyPoints": [
    "Monitor all positions every 1-5 seconds",
    "Calculate health factor in real-time",
    "Sort by profit potential",
    "Track price feeds for collateral assets",
    "Set alerts for health < 1.05"
  ]
}'::jsonb);

-- Section 3: Liquidation Execution
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'liquidation-hunting'), 3, 'text', 'Liquidation Execution', 
'{
  "text": "Executing liquidations requires speed, proper transaction construction, and handling of received collateral.",
  "code": "// Liquidation executor\\nclass LiquidationExecutor {\\n  async executeLiquidation(opportunity) {\\n    // 1. Build liquidation transaction\\n    const liquidateTx = await this.buildLiquidateTx(\\n      opportunity.protocol,\\n      opportunity.user,\\n      opportunity.debt\\n    );\\n    \\n    // 2. Build collateral sell transaction\\n    const sellTx = await this.buildSellTx(\\n      opportunity.collateral,\\n      opportunity.collateralAmount * 1.05 // Include 5% bonus\\n    );\\n    \\n    // 3. Build tip transaction\\n    const tipAmount = opportunity.profit * 0.10; // 10% tip\\n    const tipTx = await this.buildTipTx(tipAmount);\\n    \\n    // 4. Submit as atomic bundle\\n    const bundle = new Bundle([liquidateTx, sellTx, tipTx]);\\n    \\n    try {\\n      const result = await jitoClient.sendBundle(bundle);\\n      console.log(''Liquidation successful:'', result);\\n      return { success: true, profit: opportunity.profit };\\n    } catch (error) {\\n      console.error(''Liquidation failed:'', error);\\n      return { success: false, error };\\n    }\\n  }\\n  \\n  async buildLiquidateTx(protocol, user, debtAmount) {\\n    // Protocol-specific liquidation instruction\\n    return protocol.liquidate({\\n      borrower: user,\\n      repayAmount: debtAmount,\\n      collateralAsset: ''SOL''\\n    });\\n  }\\n}",
  "keyPoints": [
    "Bundle liquidation + collateral sale atomically",
    "Repay debt to receive collateral + bonus",
    "Sell collateral immediately to lock profit",
    "Include tip for bundle inclusion",
    "Handle partial liquidations for large positions"
  ]
}'::jsonb);

-- Section 4: Risk Management
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'liquidation-hunting'), 4, 'text', 'Risk Management', 
'{
  "text": "Liquidation hunting involves several risks that must be managed to ensure profitability.",
  "keyPoints": [
    "Price Risk: Collateral price can drop while selling",
    "Competition: Other bots may liquidate first",
    "Gas Risk: Failed transactions waste gas",
    "Slippage: Large collateral sales impact price",
    "Protocol Risk: Smart contract bugs or exploits"
  ],
  "examples": [
    {"type": "Price Risk Mitigation", "description": "Set maximum slippage tolerance (2-3%). Skip liquidations if collateral is illiquid or volatile."},
    {"type": "Competition Strategy", "description": "Target less popular protocols. Use faster execution (<100ms). Offer competitive tips (10-15%)."},
    {"type": "Position Sizing", "description": "Start with small liquidations ($1K-$5K). Scale up as you gain experience and capital."}
  ],
  "code": "// Risk assessment\\nclass RiskAssessor {\\n  assessLiquidation(opportunity) {\\n    let riskScore = 0;\\n    \\n    // Collateral liquidity\\n    if (opportunity.collateralVolume24h < 100000) riskScore += 30;\\n    \\n    // Position size\\n    if (opportunity.debtValue > 50000) riskScore += 20;\\n    \\n    // Health factor\\n    if (opportunity.health > 0.98) riskScore += 25;\\n    \\n    // Competition\\n    if (opportunity.protocol === ''solend'') riskScore += 15;\\n    \\n    return {\\n      score: riskScore,\\n      level: riskScore > 60 ? ''high'' : riskScore > 40 ? ''medium'' : ''low'',\\n      recommendation: riskScore > 60 ? ''skip'' : ''execute''\\n    };\\n  }\\n}"
}'::jsonb);

-- Section 5: Protocol Comparison
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'liquidation-hunting'), 5, 'text', 'Protocol Comparison', 
'{
  "text": "Different lending protocols offer varying liquidation parameters and opportunities.",
  "comparison": [
    {"aspect": "TVL", "ethereum": "$500M", "solana": "$200M", "impact": "More opportunities on Solend"},
    {"aspect": "Liquidation Bonus", "ethereum": "5%", "solana": "7%", "impact": "Higher rewards on MarginFi"},
    {"aspect": "Competition", "ethereum": "High", "solana": "Medium", "impact": "Easier on smaller protocols"},
    {"aspect": "Close Factor", "ethereum": "50%", "solana": "100%", "impact": "Full vs partial liquidations"}
  ],
  "keyPoints": [
    "Solend: Largest TVL, most opportunities, high competition",
    "MarginFi: Higher bonuses, medium competition",
    "Mango: Best bonuses (10%), lower TVL",
    "Port Finance: Smaller protocol, less competition",
    "Monitor all protocols for best opportunities"
  ],
  "examples": [
    {"type": "Solend Strategy", "description": "Focus on large positions ($10K+). Use fastest execution. Tip 15% for inclusion."},
    {"type": "MarginFi Strategy", "description": "Target medium positions ($5K-$10K). 7% bonus provides good margins."},
    {"type": "Mango Strategy", "description": "Hunt smaller positions ($1K-$5K). 10% bonus compensates for size."}
  ]
}'::jsonb);

-- Section 6: Quiz
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'liquidation-hunting'), 6, 'quiz', 'Liquidation Mastery Quiz', 
'{
  "questions": [
    {"id": 1, "question": "What health factor indicates a liquidatable position?", "options": ["< 2.0", "< 1.5", "< 1.0", "< 0.5"], "correct": 2, "explanation": "Health factor below 1.0 means collateral value is insufficient to cover debt, making position liquidatable."},
    {"id": 2, "question": "What is a typical liquidation bonus?", "options": ["1-2%", "5-10%", "15-20%", "25-30%"], "correct": 1, "explanation": "Liquidation bonuses typically range from 5-10%, rewarding liquidators for maintaining protocol solvency."},
    {"id": 3, "question": "What is LTV (Loan-to-Value)?", "options": ["Total value locked", "Liquidation threshold value", "Maximum borrow vs collateral ratio", "Liquidity trading volume"], "correct": 2, "explanation": "LTV is the maximum amount you can borrow relative to your collateral value."},
    {"id": 4, "question": "How often should you monitor positions?", "options": ["Every hour", "Every 10 minutes", "Every 1-5 seconds", "Once per day"], "correct": 2, "explanation": "Real-time monitoring every 1-5 seconds is necessary to catch liquidation opportunities quickly."},
    {"id": 5, "question": "What is the main risk when liquidating?", "options": ["Protocol fees", "Collateral price drops while selling", "Account suspension", "High gas costs"], "correct": 1, "explanation": "Collateral price can drop between liquidation and sale, reducing or eliminating profit."},
    {"id": 6, "question": "Which protocol has the highest liquidation bonus?", "options": ["Solend (5%)", "MarginFi (7%)", "Mango (10%)", "All same"], "correct": 2, "explanation": "Mango offers the highest liquidation bonus at 10%, though it has lower TVL."},
    {"id": 7, "question": "What should be included in a liquidation bundle?", "options": ["Only liquidation tx", "Liquidation + tip", "Liquidation + collateral sale + tip", "Liquidation + multiple sales"], "correct": 2, "explanation": "Bundle should include liquidation, immediate collateral sale, and tip for atomic execution."},
    {"id": 8, "question": "What is close factor?", "options": ["Protocol closing time", "Percentage of debt that can be liquidated", "Collateral closing price", "Liquidation fee"], "correct": 1, "explanation": "Close factor determines what percentage of debt can be liquidated in one transaction (50% or 100%)."},
    {"id": 9, "question": "When is best time for liquidation hunting?", "options": ["Market hours only", "High volatility periods", "Low volume times", "Weekends only"], "correct": 1, "explanation": "High volatility periods create more liquidation opportunities as collateral prices fluctuate."},
    {"id": 10, "question": "What is the minimum profit to pursue liquidation?", "options": ["Any profit", "$10-$50 after gas and tip", "$100+", "$1000+"], "correct": 1, "explanation": "Minimum $10-$50 profit after gas and tip makes liquidation worthwhile, considering execution costs."}
  ],
  "passing_score": 70
}'::jsonb);

UPDATE learning_modules SET xp_reward = 150 WHERE slug = 'liquidation-hunting';
