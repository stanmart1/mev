-- Enhance "Bundle Construction" module with 7 comprehensive sections

DELETE FROM module_content WHERE module_id = (SELECT id FROM learning_modules WHERE slug = 'bundle-construction');

UPDATE learning_modules 
SET 
  estimated_time = 65,
  description = 'Master bundle construction: transaction ordering, gas optimization, atomic execution, and success rate maximization'
WHERE slug = 'bundle-construction';

-- Section 1: Bundle Basics
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'bundle-construction'), 1, 'text', 'Bundle Basics', 
'{
  "text": "Bundles are groups of transactions that execute atomically in a guaranteed order. They are the foundation of MEV extraction on Solana.",
  "keyPoints": [
    "Atomic execution: All transactions succeed or all fail",
    "Guaranteed ordering: Transactions execute in specified sequence",
    "No partial execution: Protects against failed intermediate steps",
    "1-5 transactions per bundle maximum",
    "Failed bundles cost nothing (Jito benefit)"
  ],
  "code": "// Basic bundle structure\\nimport { Bundle } from ''@jito-foundation/sdk'';\\nimport { Transaction } from ''@solana/web3.js'';\\n\\nclass BundleBuilder {\\n  constructor() {\\n    this.bundle = new Bundle([]);\\n  }\\n  \\n  addTransaction(tx) {\\n    if (this.bundle.transactions.length >= 5) {\\n      throw new Error(''Bundle limit: 5 transactions'');\\n    }\\n    this.bundle.addTransaction(tx);\\n    return this;\\n  }\\n  \\n  build() {\\n    if (this.bundle.transactions.length === 0) {\\n      throw new Error(''Bundle must contain at least 1 transaction'');\\n    }\\n    return this.bundle;\\n  }\\n}\\n\\n// Example usage\\nconst builder = new BundleBuilder();\\nbuilder\\n  .addTransaction(buyTx)\\n  .addTransaction(sellTx)\\n  .addTransaction(tipTx);\\nconst bundle = builder.build();",
  "examples": [
    {"type": "Simple Arbitrage", "description": "2 transactions: Buy on DEX A, Sell on DEX B"},
    {"type": "With Tip", "description": "3 transactions: Buy, Sell, Tip to validator"},
    {"type": "Complex", "description": "5 transactions: Setup, Buy, Swap, Sell, Tip"}
  ]
}'::jsonb);

-- Section 2: Transaction Ordering
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'bundle-construction'), 2, 'text', 'Transaction Ordering', 
'{
  "text": "Transaction order within bundles is critical. Wrong order causes failures, right order maximizes profit.",
  "keyPoints": [
    "Dependencies: Later transactions depend on earlier ones",
    "Account state: Each transaction modifies account state",
    "Failure propagation: Early failure stops entire bundle",
    "Optimization: Order affects gas and execution time",
    "Testing: Simulate to verify correct ordering"
  ],
  "code": "// Transaction ordering optimizer\\nclass OrderOptimizer {\\n  optimizeOrder(transactions) {\\n    // Build dependency graph\\n    const graph = this.buildDependencyGraph(transactions);\\n    \\n    // Topological sort for correct order\\n    const ordered = this.topologicalSort(graph);\\n    \\n    return ordered;\\n  }\\n  \\n  buildDependencyGraph(txs) {\\n    const graph = new Map();\\n    \\n    txs.forEach(tx => {\\n      const deps = this.findDependencies(tx, txs);\\n      graph.set(tx.id, deps);\\n    });\\n    \\n    return graph;\\n  }\\n  \\n  findDependencies(tx, allTxs) {\\n    // Transaction depends on others that write to accounts it reads\\n    const readAccounts = tx.keys.filter(k => !k.isWritable);\\n    const deps = [];\\n    \\n    allTxs.forEach(otherTx => {\\n      if (otherTx.id === tx.id) return;\\n      \\n      const writesTo = otherTx.keys.filter(k => k.isWritable);\\n      const hasOverlap = readAccounts.some(read => \\n        writesTo.some(write => write.pubkey.equals(read.pubkey))\\n      );\\n      \\n      if (hasOverlap) deps.push(otherTx.id);\\n    });\\n    \\n    return deps;\\n  }\\n}",
  "examples": [
    {"type": "Correct Order", "description": "1. Buy SOL → 2. Sell SOL → 3. Tip. Each step uses output of previous."},
    {"type": "Wrong Order", "description": "1. Sell SOL → 2. Buy SOL. Fails because no SOL to sell initially."},
    {"type": "Parallel Safe", "description": "1. Buy SOL, 2. Buy ETH (parallel) → 3. Tip. Independent operations can be any order."}
  ]
}'::jsonb);

-- Section 3: Gas Optimization
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'bundle-construction'), 3, 'text', 'Gas Optimization', 
'{
  "text": "Minimizing compute units (gas) increases profitability and reduces failure risk from compute limits.",
  "keyPoints": [
    "Compute units: Solana limit is 1.4M per transaction",
    "Bundle limit: 5 transactions × 1.4M = 7M max compute",
    "Optimization: Remove unnecessary instructions",
    "Batching: Combine operations when possible",
    "Priority fees: Higher fees for faster inclusion"
  ],
  "code": "// Gas optimizer\\nclass GasOptimizer {\\n  async estimateBundle(bundle) {\\n    let totalCompute = 0;\\n    const estimates = [];\\n    \\n    for (const tx of bundle.transactions) {\\n      const compute = await this.estimateTransaction(tx);\\n      totalCompute += compute;\\n      estimates.push({ tx: tx.id, compute });\\n    }\\n    \\n    return {\\n      totalCompute,\\n      perTransaction: estimates,\\n      withinLimit: totalCompute < 7000000,\\n      efficiency: this.calculateEfficiency(totalCompute, bundle)\\n    };\\n  }\\n  \\n  optimizeTransaction(tx) {\\n    // Remove unnecessary instructions\\n    const optimized = tx.instructions.filter(ix => \\n      this.isNecessary(ix)\\n    );\\n    \\n    // Combine similar operations\\n    const combined = this.combineInstructions(optimized);\\n    \\n    // Set compute budget\\n    const withBudget = this.setComputeBudget(combined);\\n    \\n    return withBudget;\\n  }\\n  \\n  setComputeBudget(tx, units = 200000) {\\n    // Add compute budget instruction\\n    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({\\n      units\\n    });\\n    \\n    tx.instructions.unshift(computeBudgetIx);\\n    return tx;\\n  }\\n}",
  "examples": [
    {"type": "Unoptimized", "description": "5 transactions, 1.2M compute each = 6M total. Works but inefficient."},
    {"type": "Optimized", "description": "4 transactions, 800K compute each = 3.2M total. 47% reduction, faster execution."},
    {"type": "Over Limit", "description": "5 transactions, 1.5M compute each = 7.5M total. Exceeds limit, bundle fails."}
  ]
}'::jsonb);

-- Section 4: Atomic Execution
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'bundle-construction'), 4, 'text', 'Atomic Execution Guarantees', 
'{
  "text": "Atomicity ensures all transactions in a bundle succeed together or fail together, eliminating partial execution risk.",
  "keyPoints": [
    "All-or-nothing: No partial execution possible",
    "State consistency: Account state remains valid",
    "No fees on failure: Failed bundles cost nothing",
    "Revert protection: Intermediate failures revert all changes",
    "Testing critical: Simulate before submission"
  ],
  "code": "// Atomic execution validator\\nclass AtomicValidator {\\n  async validateBundle(bundle) {\\n    const issues = [];\\n    \\n    // Check each transaction can execute\\n    for (let i = 0; i < bundle.transactions.length; i++) {\\n      const tx = bundle.transactions[i];\\n      const state = await this.simulateUpToIndex(bundle, i);\\n      \\n      const canExecute = await this.canTransactionExecute(tx, state);\\n      if (!canExecute.success) {\\n        issues.push({\\n          transaction: i,\\n          reason: canExecute.error,\\n          impact: ''Bundle will fail at this step''\\n        });\\n      }\\n    }\\n    \\n    return {\\n      valid: issues.length === 0,\\n      issues,\\n      recommendation: this.getRecommendation(issues)\\n    };\\n  }\\n  \\n  async simulateUpToIndex(bundle, index) {\\n    // Simulate transactions 0 to index-1\\n    let state = await this.getCurrentState();\\n    \\n    for (let i = 0; i < index; i++) {\\n      state = await this.applyTransaction(bundle.transactions[i], state);\\n    }\\n    \\n    return state;\\n  }\\n}",
  "examples": [
    {"type": "Success Case", "description": "All 3 transactions execute successfully. User receives profit, validator receives tip."},
    {"type": "Failure Case", "description": "Transaction 2 fails due to slippage. All transactions revert, no fees charged."},
    {"type": "Partial Risk", "description": "Without atomicity: Tx1 succeeds, Tx2 fails. User loses money on Tx1 with no profit."}
  ]
}'::jsonb);

-- Section 5: Bundle Simulation
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'bundle-construction'), 5, 'text', 'Bundle Simulation', 
'{
  "text": "Simulating bundles before submission prevents costly failures and validates profitability.",
  "keyPoints": [
    "Pre-flight check: Test execution without fees",
    "Profit validation: Confirm expected profit",
    "Error detection: Catch issues before submission",
    "State verification: Ensure correct final state",
    "Performance testing: Measure execution time"
  ],
  "code": "// Bundle simulator\\nclass BundleSimulator {\\n  async simulate(bundle) {\\n    const startTime = Date.now();\\n    const results = [];\\n    let cumulativeState = await this.getInitialState();\\n    \\n    for (const tx of bundle.transactions) {\\n      const result = await this.simulateTransaction(tx, cumulativeState);\\n      \\n      if (!result.success) {\\n        return {\\n          success: false,\\n          failedAt: results.length,\\n          error: result.error,\\n          results\\n        };\\n      }\\n      \\n      results.push(result);\\n      cumulativeState = result.newState;\\n    }\\n    \\n    const profit = this.calculateProfit(cumulativeState);\\n    const executionTime = Date.now() - startTime;\\n    \\n    return {\\n      success: true,\\n      profit,\\n      executionTime,\\n      results,\\n      recommendation: profit > 10 ? ''submit'' : ''skip''\\n    };\\n  }\\n  \\n  async simulateTransaction(tx, state) {\\n    try {\\n      const simulation = await connection.simulateTransaction(tx);\\n      \\n      return {\\n        success: !simulation.value.err,\\n        logs: simulation.value.logs,\\n        computeUnits: simulation.value.unitsConsumed,\\n        newState: this.applyChanges(state, simulation)\\n      };\\n    } catch (error) {\\n      return { success: false, error: error.message };\\n    }\\n  }\\n}",
  "examples": [
    {"type": "Profitable", "description": "Simulation shows $50 profit. Submit bundle with 10% tip ($5)."},
    {"type": "Unprofitable", "description": "Simulation shows $2 profit. Skip - not worth gas and tip."},
    {"type": "Error Detected", "description": "Simulation fails at Tx2 due to insufficient balance. Fix before submission."}
  ]
}'::jsonb);

-- Section 6: Success Rate Optimization
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'bundle-construction'), 6, 'text', 'Success Rate Optimization', 
'{
  "text": "Maximizing bundle inclusion rate requires optimal tips, timing, and validator selection.",
  "keyPoints": [
    "Tip optimization: Balance profitability vs inclusion rate",
    "Timing: Submit at optimal slot times",
    "Validator selection: Target high-performance validators",
    "Retry strategy: Resubmit failed bundles intelligently",
    "Competition analysis: Adjust strategy based on competition"
  ],
  "code": "// Success rate optimizer\\nclass SuccessOptimizer {\\n  calculateOptimalTip(profit, competition) {\\n    // Base tip: 5%\\n    let tipPercent = 0.05;\\n    \\n    // Adjust for competition (0-1 scale)\\n    if (competition > 0.7) tipPercent = 0.15;\\n    else if (competition > 0.4) tipPercent = 0.10;\\n    \\n    // Adjust for profit size\\n    if (profit > 1000) tipPercent += 0.02;\\n    \\n    const tip = profit * tipPercent;\\n    const netProfit = profit - tip;\\n    \\n    return {\\n      tip,\\n      tipPercent: tipPercent * 100,\\n      netProfit,\\n      expectedSuccessRate: this.estimateSuccessRate(tipPercent, competition)\\n    };\\n  }\\n  \\n  estimateSuccessRate(tipPercent, competition) {\\n    // Higher tip = higher success rate\\n    const tipFactor = Math.min(tipPercent / 0.20, 1);\\n    \\n    // Lower competition = higher success rate\\n    const competitionFactor = 1 - competition;\\n    \\n    return (tipFactor * 0.6 + competitionFactor * 0.4) * 100;\\n  }\\n  \\n  shouldRetry(bundle, attempt) {\\n    if (attempt > 3) return false;\\n    \\n    // Increase tip by 20% each retry\\n    const newTip = bundle.tip * 1.2;\\n    const newProfit = bundle.profit - newTip;\\n    \\n    return newProfit > 5; // Minimum $5 profit\\n  }\\n}",
  "examples": [
    {"type": "Low Competition", "description": "5% tip, 90% success rate, $95 net profit"},
    {"type": "High Competition", "description": "15% tip, 95% success rate, $85 net profit"},
    {"type": "Retry Strategy", "description": "Failed at 10% tip. Retry at 12% tip. Success on 2nd attempt."}
  ]
}'::jsonb);

-- Section 7: Quiz
INSERT INTO module_content (module_id, section_order, section_type, title, content) VALUES
((SELECT id FROM learning_modules WHERE slug = 'bundle-construction'), 7, 'quiz', 'Bundle Construction Quiz', 
'{
  "questions": [
    {"id": 1, "question": "What is the maximum number of transactions in a Jito bundle?", "options": ["3", "5", "10", "Unlimited"], "correct": 1, "explanation": "Jito bundles can contain a maximum of 5 transactions."},
    {"id": 2, "question": "What happens if one transaction in a bundle fails?", "options": ["Other transactions execute", "All transactions fail atomically", "Partial execution occurs", "Bundle retries automatically"], "correct": 1, "explanation": "Bundles execute atomically - all transactions succeed or all fail together."},
    {"id": 3, "question": "What is the Solana compute unit limit per transaction?", "options": ["200K", "1.4M", "5M", "10M"], "correct": 1, "explanation": "Solana has a 1.4M compute unit limit per transaction."},
    {"id": 4, "question": "Why is transaction ordering important?", "options": ["For aesthetics", "Later transactions depend on earlier ones", "To reduce fees", "Required by Jito"], "correct": 1, "explanation": "Transaction order matters because later transactions often depend on state changes from earlier ones."},
    {"id": 5, "question": "What is the benefit of bundle simulation?", "options": ["Faster execution", "Test without paying fees", "Guaranteed success", "Higher tips"], "correct": 1, "explanation": "Simulation allows testing bundle execution without paying fees, catching errors early."},
    {"id": 6, "question": "What happens to fees if a bundle fails?", "options": ["Full fees charged", "Partial fees charged", "No fees charged", "Double fees charged"], "correct": 2, "explanation": "Failed bundles do not consume any fees on Jito, making it risk-free to try."},
    {"id": 7, "question": "How should you optimize gas usage?", "options": ["Use maximum compute", "Remove unnecessary instructions", "Add more transactions", "Ignore compute limits"], "correct": 1, "explanation": "Optimize gas by removing unnecessary instructions and combining operations."},
    {"id": 8, "question": "What tip percentage is typical for high competition?", "options": ["1-3%", "5-7%", "10-15%", "25-30%"], "correct": 2, "explanation": "High competition scenarios typically require 10-15% tips for good inclusion rates."},
    {"id": 9, "question": "When should you retry a failed bundle?", "options": ["Never", "Always", "If profit still viable with higher tip", "After 1 hour"], "correct": 2, "explanation": "Retry if increasing the tip still leaves viable profit after the adjustment."},
    {"id": 10, "question": "What is atomicity in bundle execution?", "options": ["Fast execution", "All-or-nothing execution", "Parallel execution", "Sequential execution"], "correct": 1, "explanation": "Atomicity means all transactions execute together or none execute - all-or-nothing."}
  ],
  "passing_score": 70
}'::jsonb);

UPDATE learning_modules SET xp_reward = 180 WHERE slug = 'bundle-construction';
