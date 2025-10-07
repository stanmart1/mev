-- Enhance "Validator Selection" module with 6 comprehensive sections

DELETE FROM module_content WHERE module_id = (SELECT id FROM learning_modules WHERE slug = 'validator-selection');

UPDATE learning_modules 
SET 
  estimated_time = 55,
  description = 'Master validator selection: performance metrics, Jito comparison, selection strategies, and monitoring'
WHERE slug = 'validator-selection';

-- Section 1: Validator Metrics
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'validator-selection'), 1, 'text', 'Understanding Validator Metrics', 
'{
  "text": "Selecting the right validators is crucial for MEV success. Key metrics determine bundle inclusion rates and profitability.",
  "keyPoints": [
    "Commission Rate: Validator fee (0-10%)",
    "Skip Rate: Percentage of missed blocks (<5% good)",
    "MEV Rewards: Additional earnings from tips",
    "Uptime: Percentage of time online (>99% required)",
    "Vote Success: Successful consensus participation"
  ],
  "comparison": [
    {"aspect": "Commission", "ethereum": "5-10%", "solana": "0-5%", "impact": "Lower is better for stakers"},
    {"aspect": "Skip Rate", "ethereum": "<2%", "solana": "<5%", "impact": "Affects bundle inclusion"},
    {"aspect": "MEV Rewards", "ethereum": "High", "solana": "Variable", "impact": "Jito validators earn more"},
    {"aspect": "Uptime", "ethereum": ">99%", "solana": ">99.5%", "impact": "Critical for reliability"}
  ],
  "code": "// Validator metrics fetcher\\nclass ValidatorMetrics {\\n  async getMetrics(validatorAddress) {\\n    const info = await connection.getVoteAccounts();\\n    const validator = info.current.find(v => v.nodePubkey === validatorAddress);\\n    \\n    return {\\n      commission: validator.commission,\\n      activatedStake: validator.activatedStake,\\n      lastVote: validator.lastVote,\\n      rootSlot: validator.rootSlot,\\n      epochCredits: validator.epochCredits,\\n      skipRate: this.calculateSkipRate(validator),\\n      uptime: this.calculateUptime(validator)\\n    };\\n  }\\n  \\n  calculateSkipRate(validator) {\\n    const totalSlots = validator.epochCredits.reduce((sum, [_, credits]) => sum + credits, 0);\\n    const skipped = validator.epochCredits.reduce((sum, [_, credits, prev]) => {\\n      return sum + Math.max(0, (credits - prev) - 1);\\n    }, 0);\\n    return (skipped / totalSlots) * 100;\\n  }\\n}"
}'::jsonb);

-- Section 2: Jito-Enabled Validators
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'validator-selection'), 2, 'text', 'Jito-Enabled Validators', 
'{
  "text": "Jito-enabled validators process MEV bundles and distribute rewards. They significantly outperform regular validators for MEV operations.",
  "keyPoints": [
    "MEV Processing: Accept and execute bundles",
    "Tip Distribution: 50% to validator, 50% to stakers",
    "Higher APY: 30-50% more than regular validators",
    "Bundle Priority: Process bundles before regular transactions",
    "Network Share: Process 50%+ of Solana blocks"
  ],
  "examples": [
    {"type": "Top Jito Validator", "description": "Commission: 5% | Skip Rate: 1.2% | MEV Rewards: $50K/month | Total APY: 9.5%"},
    {"type": "Regular Validator", "description": "Commission: 5% | Skip Rate: 2.5% | MEV Rewards: $0 | Total APY: 6.8%"},
    {"type": "Difference", "description": "Jito validator earns 40% more APY and has better performance metrics"}
  ],
  "code": "// Jito validator checker\\nclass JitoValidator {\\n  async isJitoEnabled(validatorAddress) {\\n    const jitoValidators = await this.fetchJitoValidators();\\n    return jitoValidators.includes(validatorAddress);\\n  }\\n  \\n  async fetchJitoValidators() {\\n    const response = await fetch(''https://kobe.mainnet.jito.network/api/v1/validators'');\\n    const data = await response.json();\\n    return data.validators.map(v => v.vote_account);\\n  }\\n  \\n  async getMEVRewards(validatorAddress, days = 30) {\\n    const rewards = await this.fetchMEVRewards(validatorAddress, days);\\n    const total = rewards.reduce((sum, r) => sum + r.amount, 0);\\n    const daily = total / days;\\n    \\n    return {\\n      total,\\n      daily,\\n      monthly: daily * 30,\\n      count: rewards.length\\n    };\\n  }\\n}"
}'::jsonb);

-- Section 3: Performance Analysis
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'validator-selection'), 3, 'text', 'Performance Analysis', 
'{
  "text": "Analyzing validator performance over time reveals reliability and profitability patterns.",
  "keyPoints": [
    "Historical Skip Rate: Trend over 30-90 days",
    "MEV Consistency: Regular vs sporadic rewards",
    "Uptime Patterns: Maintenance windows and outages",
    "Commission Changes: Stability of fee structure",
    "Stake Growth: Indicator of community trust"
  ],
  "code": "// Performance analyzer\\nclass PerformanceAnalyzer {\\n  async analyzeValidator(address, days = 90) {\\n    const history = await this.fetchHistory(address, days);\\n    \\n    return {\\n      avgSkipRate: this.calculateAverage(history.map(h => h.skipRate)),\\n      skipRateTrend: this.calculateTrend(history.map(h => h.skipRate)),\\n      avgMEVRewards: this.calculateAverage(history.map(h => h.mevRewards)),\\n      mevConsistency: this.calculateConsistency(history.map(h => h.mevRewards)),\\n      uptime: this.calculateUptime(history),\\n      score: this.calculateScore(history),\\n      recommendation: this.getRecommendation(history)\\n    };\\n  }\\n  \\n  calculateScore(history) {\\n    const skipScore = (5 - history.avgSkipRate) * 20; // Max 100\\n    const mevScore = Math.min(history.avgMEVRewards / 1000, 1) * 100;\\n    const uptimeScore = history.uptime;\\n    \\n    return (skipScore * 0.3 + mevScore * 0.4 + uptimeScore * 0.3);\\n  }\\n  \\n  getRecommendation(history) {\\n    const score = this.calculateScore(history);\\n    if (score > 80) return ''excellent'';\\n    if (score > 60) return ''good'';\\n    if (score > 40) return ''average'';\\n    return ''avoid'';\\n  }\\n}",
  "examples": [
    {"type": "Excellent (Score: 85)", "description": "Skip: 1.5% | MEV: $45K/mo | Uptime: 99.8% | Recommendation: Primary choice"},
    {"type": "Good (Score: 65)", "description": "Skip: 3.2% | MEV: $25K/mo | Uptime: 99.2% | Recommendation: Secondary choice"},
    {"type": "Avoid (Score: 35)", "description": "Skip: 6.5% | MEV: $5K/mo | Uptime: 97.5% | Recommendation: Do not use"}
  ]
}'::jsonb);

-- Section 4: Selection Strategy
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'validator-selection'), 4, 'text', 'Validator Selection Strategy', 
'{
  "text": "Strategic validator selection maximizes bundle inclusion rates and profitability.",
  "keyPoints": [
    "Multi-Validator: Submit to 3-5 top validators",
    "Diversification: Mix high and medium performers",
    "Dynamic Rotation: Adjust based on performance",
    "Geographic Distribution: Reduce latency",
    "Backup Validators: Fallback options ready"
  ],
  "code": "// Validator selector\\nclass ValidatorSelector {\\n  async selectValidators(count = 5) {\\n    const allValidators = await this.fetchAllValidators();\\n    const jitoValidators = allValidators.filter(v => v.isJito);\\n    \\n    // Score each validator\\n    const scored = await Promise.all(\\n      jitoValidators.map(async v => ({\\n        ...v,\\n        score: await this.scoreValidator(v)\\n      }))\\n    );\\n    \\n    // Sort by score\\n    scored.sort((a, b) => b.score - a.score);\\n    \\n    // Select top performers with diversification\\n    const selected = [];\\n    const regions = new Set();\\n    \\n    for (const validator of scored) {\\n      if (selected.length >= count) break;\\n      \\n      // Prefer geographic diversity\\n      if (!regions.has(validator.region) || selected.length < 3) {\\n        selected.push(validator);\\n        regions.add(validator.region);\\n      }\\n    }\\n    \\n    return selected;\\n  }\\n  \\n  async scoreValidator(validator) {\\n    const skipScore = (5 - validator.skipRate) * 20;\\n    const mevScore = Math.min(validator.mevRewards / 50000, 1) * 30;\\n    const uptimeScore = validator.uptime * 0.3;\\n    const stakeScore = Math.min(validator.stake / 1000000, 1) * 20;\\n    \\n    return skipScore + mevScore + uptimeScore + stakeScore;\\n  }\\n}",
  "examples": [
    {"type": "Primary Strategy", "description": "Top 3 validators by score. Submit all bundles to these first."},
    {"type": "Backup Strategy", "description": "Next 2 validators. Use if primary validators fail or are congested."},
    {"type": "Rotation Strategy", "description": "Re-evaluate weekly. Replace underperformers with better options."}
  ]
}'::jsonb);

-- Section 5: Monitoring & Alerts
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'validator-selection'), 5, 'text', 'Monitoring & Alerts', 
'{
  "text": "Continuous monitoring ensures validators maintain performance standards and alerts you to issues.",
  "keyPoints": [
    "Real-time Monitoring: Track skip rate, uptime, MEV rewards",
    "Performance Alerts: Notify when metrics degrade",
    "Automatic Rotation: Switch to backup validators",
    "Daily Reports: Summary of validator performance",
    "Trend Analysis: Identify long-term patterns"
  ],
  "code": "// Validator monitor\\nclass ValidatorMonitor {\\n  constructor(validators) {\\n    this.validators = validators;\\n    this.alerts = [];\\n  }\\n  \\n  async monitor() {\\n    for (const validator of this.validators) {\\n      const metrics = await this.getMetrics(validator.address);\\n      \\n      // Check skip rate\\n      if (metrics.skipRate > 5) {\\n        this.alerts.push({\\n          validator: validator.address,\\n          type: ''high_skip_rate'',\\n          value: metrics.skipRate,\\n          severity: ''high'',\\n          action: ''Consider replacing''\\n        });\\n      }\\n      \\n      // Check uptime\\n      if (metrics.uptime < 99) {\\n        this.alerts.push({\\n          validator: validator.address,\\n          type: ''low_uptime'',\\n          value: metrics.uptime,\\n          severity: ''medium'',\\n          action: ''Monitor closely''\\n        });\\n      }\\n      \\n      // Check MEV rewards trend\\n      const mevTrend = await this.getMEVTrend(validator.address);\\n      if (mevTrend < -20) {\\n        this.alerts.push({\\n          validator: validator.address,\\n          type: ''declining_mev'',\\n          value: mevTrend,\\n          severity: ''low'',\\n          action: ''Review performance''\\n        });\\n      }\\n    }\\n    \\n    return this.alerts;\\n  }\\n}",
  "examples": [
    {"type": "Alert: High Skip Rate", "description": "Validator skip rate increased to 7%. Action: Switch to backup validator."},
    {"type": "Alert: Low Uptime", "description": "Validator uptime dropped to 98.5%. Action: Monitor for 24 hours."},
    {"type": "Alert: Declining MEV", "description": "MEV rewards down 30% this week. Action: Investigate or replace."}
  ]
}'::jsonb);

-- Section 6: Quiz
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'validator-selection'), 6, 'quiz', 'Validator Selection Quiz', 
'{
  "questions": [
    {"id": 1, "question": "What is a good skip rate for validators?", "options": ["<2%", "<5%", "<10%", "<15%"], "correct": 1, "explanation": "Skip rate below 5% is considered good, with <2% being excellent."},
    {"id": 2, "question": "How much more do Jito validators typically earn?", "options": ["10-20%", "30-50%", "70-90%", "100%+"], "correct": 1, "explanation": "Jito validators typically earn 30-50% more than regular validators due to MEV rewards."},
    {"id": 3, "question": "How are MEV tips distributed?", "options": ["100% to validator", "100% to stakers", "50% validator, 50% stakers", "70% validator, 30% stakers"], "correct": 2, "explanation": "MEV tips are split 50/50 between validators and their stakers."},
    {"id": 4, "question": "What percentage of Solana blocks do Jito validators process?", "options": ["10-20%", "30-40%", "50%+", "80%+"], "correct": 2, "explanation": "Jito validators process over 50% of Solana blocks."},
    {"id": 5, "question": "How many validators should you submit bundles to?", "options": ["1", "2-3", "3-5", "10+"], "correct": 2, "explanation": "Submitting to 3-5 top validators provides good coverage and redundancy."},
    {"id": 6, "question": "What is minimum acceptable uptime?", "options": [">95%", ">97%", ">99%", ">99.9%"], "correct": 2, "explanation": "Validators should maintain >99% uptime for reliable bundle processing."},
    {"id": 7, "question": "How often should you re-evaluate validator selection?", "options": ["Daily", "Weekly", "Monthly", "Yearly"], "correct": 1, "explanation": "Weekly re-evaluation allows you to replace underperformers while maintaining stability."},
    {"id": 8, "question": "What indicates validator reliability?", "options": ["High commission", "Low skip rate + high uptime", "Large stake only", "Recent launch"], "correct": 1, "explanation": "Low skip rate combined with high uptime indicates reliable validator performance."},
    {"id": 9, "question": "Why diversify across validators?", "options": ["Lower fees", "Reduce single point of failure", "Higher MEV", "Faster execution"], "correct": 1, "explanation": "Diversification reduces risk of bundle failures if one validator has issues."},
    {"id": 10, "question": "What should trigger a validator replacement?", "options": ["Skip rate >5% sustained", "One missed block", "Commission increase", "New validator available"], "correct": 0, "explanation": "Sustained skip rate above 5% indicates performance issues requiring replacement."}
  ],
  "passing_score": 70
}'::jsonb);

UPDATE learning_modules SET xp_reward = 150 WHERE slug = 'validator-selection';
