# MEV Education Hub - Complete Implementation Plan

## Overview
Build an interactive learning journey with theory modules, hands-on tutorials, code playgrounds, live data integration, quizzes, and gamification.

---

## Database Schema

### Core Tables

**1. `learning_modules`**
```sql
CREATE TABLE learning_modules (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50),
  estimated_time INTEGER,
  order_index INTEGER,
  prerequisites JSONB,
  xp_reward INTEGER,
  badge_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**2. `module_content`**
```sql
CREATE TABLE module_content (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES learning_modules(id),
  section_order INTEGER,
  section_type VARCHAR(50),
  title VARCHAR(255),
  content JSONB
);
```

**3. `quizzes`**
```sql
CREATE TABLE quizzes (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES learning_modules(id),
  title VARCHAR(255),
  passing_score INTEGER,
  questions JSONB
);
```

**4. `interactive_tutorials`**
```sql
CREATE TABLE interactive_tutorials (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50),
  estimated_time INTEGER,
  total_steps INTEGER,
  category VARCHAR(100),
  prerequisites JSONB,
  xp_reward INTEGER,
  badge_id VARCHAR(100),
  order_index INTEGER
);
```

**5. `tutorial_steps`**
```sql
CREATE TABLE tutorial_steps (
  id SERIAL PRIMARY KEY,
  tutorial_id INTEGER REFERENCES interactive_tutorials(id),
  step_number INTEGER,
  step_type VARCHAR(50),
  title VARCHAR(255),
  content JSONB,
  validation_rules JSONB,
  hints JSONB
);
```

**6. `user_learning_progress`**
```sql
CREATE TABLE user_learning_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  module_id INTEGER REFERENCES learning_modules(id),
  status VARCHAR(50),
  progress_percentage INTEGER,
  quiz_score INTEGER,
  quiz_attempts INTEGER,
  time_spent INTEGER,
  last_section INTEGER,
  completed_at TIMESTAMP,
  started_at TIMESTAMP DEFAULT NOW()
);
```

**7. `user_tutorial_progress`**
```sql
CREATE TABLE user_tutorial_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  tutorial_id INTEGER REFERENCES interactive_tutorials(id),
  current_step INTEGER,
  completed_steps JSONB,
  code_submissions JSONB,
  quiz_scores JSONB,
  status VARCHAR(50),
  time_spent INTEGER,
  completed_at TIMESTAMP,
  started_at TIMESTAMP DEFAULT NOW()
);
```

**8. `user_achievements`**
```sql
CREATE TABLE user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  achievement_type VARCHAR(50),
  achievement_id VARCHAR(100),
  earned_at TIMESTAMP DEFAULT NOW(),
  xp_earned INTEGER
);
```

**9. `interactive_exercises`**
```sql
CREATE TABLE interactive_exercises (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES learning_modules(id),
  exercise_type VARCHAR(50),
  title VARCHAR(255),
  instructions TEXT,
  starter_code TEXT,
  solution TEXT,
  test_cases JSONB
);
```

---

## Learning Structure

### 7 Learning Modules (Theory + Quizzes)

**🎯 Beginner Path**
1. **What is MEV?** (8 min, 100 XP, Badge: "MEV Novice")
   - 4 sections + 5 question quiz
   - Interactive: MEV type identifier

2. **Understanding Jito** (10 min, 150 XP, Badge: "Jito Explorer")
   - 5 sections + 6 question quiz
   - Interactive: Validator comparison

**⚡ Intermediate Path**
3. **Arbitrage Strategies** (12 min, 200 XP, Badge: "Arbitrage Hunter")
   - 6 sections + 8 question quiz
   - Interactive: Arbitrage calculator
   - Code challenge: Profit calculation

4. **Liquidation Hunting** (12 min, 200 XP, Badge: "Liquidation Expert")
   - 6 sections + 7 question quiz
   - Interactive: Health factor calculator
   - Code challenge: Opportunity detection

**🚀 Advanced Path**
5. **Validator Selection** (10 min, 150 XP, Badge: "Validator Analyst")
   - 5 sections + 6 question quiz
   - Interactive: Comparison matrix

6. **Bundle Construction** (15 min, 250 XP, Badge: "Bundle Master")
   - 7 sections + 10 question quiz
   - Interactive: Bundle simulator
   - Code challenge: Transaction ordering

7. **Risk Management** (10 min, 250 XP, Badge: "Risk Manager")
   - 6 sections + 8 question quiz
   - Interactive: Risk calculator
   - Code challenge: Risk-adjusted returns

### 4 Interactive Tutorials (Hands-on Practice)

**Tutorial 1: Detecting Arbitrage Opportunities** (25 min, 200 XP, Badge: "Arbitrage Detective")
- 8 steps with code playground, live data, quizzes

**Tutorial 2: Building Your First Bundle** (30 min, 250 XP, Badge: "Bundle Builder")
- 10 steps with interactive exercises

**Tutorial 3: Choosing Validators** (20 min, 150 XP, Badge: "Validator Expert")
- 6 steps with live data analysis

**Tutorial 4: Analyzing MEV Performance** (25 min, 200 XP, Badge: "Analytics Pro")
- 7 steps with performance tools

**Total XP Available: 2,100**

---

## Tutorial Step Types

### 1. Instruction Step
```javascript
{
  type: 'instruction',
  title: 'Understanding Price Differences',
  content: {
    text: 'Learn how to identify arbitrage opportunities...',
    image: '/assets/arbitrage-diagram.png',
    keyPoints: ['Point 1', 'Point 2', 'Point 3']
  }
}
```

### 2. Code Playground Step
```javascript
{
  type: 'code_playground',
  title: 'Calculate Arbitrage Profit',
  content: {
    instructions: 'Write a function to calculate profit...',
    starterCode: 'function calculateProfit(buyPrice, sellPrice) {\n  // Your code here\n}',
    solution: 'function calculateProfit(buyPrice, sellPrice) {\n  return sellPrice - buyPrice;\n}',
    testCases: [
      { input: [100, 105], expected: 5 },
      { input: [50, 48], expected: -2 }
    ]
  },
  validation: {
    type: 'code_execution',
    passingTests: 2
  },
  hints: [
    'Remember to subtract buy price from sell price',
    'Consider negative values for losses'
  ]
}
```

### 3. Live Data Step
```javascript
{
  type: 'live_data',
  title: 'Analyze Real Opportunities',
  content: {
    instructions: 'Examine live MEV opportunities and identify the most profitable',
    dataSource: '/api/opportunities?limit=10',
    task: 'Select the opportunity with highest profit',
    expectedAnswer: 'opportunity_id'
  }
}
```

### 4. Quiz Checkpoint
```javascript
{
  type: 'quiz_checkpoint',
  title: 'Knowledge Check',
  questions: [
    {
      question: 'What is the minimum profit threshold?',
      options: ['0.01 SOL', '0.1 SOL', '1 SOL'],
      correct: 0,
      explanation: 'Minimum threshold is 0.01 SOL to cover gas costs'
    }
  ]
}
```

### 5. Interactive Exercise
```javascript
{
  type: 'interactive_exercise',
  title: 'Build a Bundle',
  component: 'BundleBuilder',
  task: 'Create a bundle with 3 transactions',
  validation: {
    minTransactions: 3,
    minProfit: 0.1
  }
}
```

---

## Tutorial Breakdown

### Tutorial 1: Detecting Arbitrage Opportunities (8 Steps)

**Step 1: Introduction** (Instruction)
- What is arbitrage
- Why it exists on Solana
- Key concepts to understand

**Step 2: Price Comparison** (Code Playground)
```javascript
// Task: Compare prices across DEXs
function findPriceDifference(raydiumPrice, orcaPrice) {
  // Calculate percentage difference
  // Return the difference
}
```

**Step 3: Live Data Analysis** (Live Data)
- Fetch real DEX prices from API
- Identify arbitrage opportunities
- Calculate potential profit

**Step 4: Profit Calculator** (Interactive Exercise)
- Input: Buy/Sell prices, Amount, Gas
- Calculate net profit
- Validation: Must show positive profit

**Step 5: Gas Cost Consideration** (Code Playground)
```javascript
// Task: Calculate net profit after gas
function calculateNetProfit(grossProfit, gasCost) {
  // Subtract gas from gross profit
  // Return net profit
}
```

**Step 6: Risk Assessment** (Quiz Checkpoint)
- 3 questions about arbitrage risks
- Must score 100% to proceed

**Step 7: Real Opportunity Detection** (Live Data)
- Use live API data
- Filter profitable opportunities
- Rank by profit margin

**Step 8: Final Challenge** (Code Playground)
```javascript
// Complete arbitrage detector
function detectArbitrage(dexPrices, gasEstimate) {
  // Implement full logic
  // Must pass 5 test cases
}
```

### Tutorial 2: Building Your First Bundle (10 Steps)

**Step 1: Bundle Basics** (Instruction)
**Step 2: Transaction Selection** (Interactive Exercise)
**Step 3: Order Optimization** (Code Playground)
**Step 4: Gas Estimation** (Live Data)
**Step 5: Bundle Simulator** (Interactive Exercise)
**Step 6: Risk Scoring** (Code Playground)
**Step 7: Knowledge Check** (Quiz Checkpoint)
**Step 8: Jito Submission** (Instruction)
**Step 9: Live Bundle Creation** (Interactive Exercise)
**Step 10: Final Assessment** (Code Playground)

### Tutorial 3: Choosing Validators (6 Steps)

**Step 1: Validator Metrics** (Instruction)
**Step 2: Data Analysis** (Live Data)
**Step 3: Comparison Tool** (Interactive Exercise)
**Step 4: Score Calculator** (Code Playground)
**Step 5: Knowledge Check** (Quiz Checkpoint)
**Step 6: Final Selection** (Interactive Exercise)

### Tutorial 4: Analyzing MEV Performance (7 Steps)

**Step 1: Metrics Overview** (Instruction)
**Step 2: Data Fetching** (Code Playground)
**Step 3: Live Analysis** (Live Data)
**Step 4: Profit Calculator** (Interactive Exercise)
**Step 5: Trend Analysis** (Code Playground)
**Step 6: Knowledge Check** (Quiz Checkpoint)
**Step 7: Performance Report** (Interactive Exercise)

---

## Frontend Structure

```
frontend/src/pages/education/
├── LearningJourney.jsx           # Main hub with path visualization
├── ModuleView.jsx                # Module reader
├── TutorialView.jsx              # Tutorial framework
├── QuizView.jsx                  # Quiz interface
├── AchievementsView.jsx          # Badges & progress
├── components/
│   ├── PathMap.jsx               # Visual learning path
│   ├── ModuleCard.jsx            # Module preview
│   ├── ProgressRing.jsx          # Circular progress
│   ├── QuizQuestion.jsx          # Question component
│   ├── BadgeDisplay.jsx          # Achievement badge
│   ├── XPBar.jsx                 # Experience bar
│   ├── tutorial/
│   │   ├── TutorialProgress.jsx  # Step progress bar
│   │   ├── StepNavigation.jsx    # Prev/Next buttons
│   │   ├── InstructionStep.jsx   # Text content
│   │   ├── CodePlayground.jsx    # Code editor
│   │   ├── LiveDataStep.jsx      # Real data
│   │   ├── QuizCheckpoint.jsx    # Mid-tutorial quiz
│   │   ├── InteractiveStep.jsx   # Exercise container
│   │   └── CompletionScreen.jsx  # Success screen
│   ├── code/
│   │   ├── CodeEditor.jsx        # Monaco editor
│   │   ├── TestRunner.jsx        # Run tests
│   │   ├── Console.jsx           # Output display
│   │   └── HintPanel.jsx         # Hints system
│   └── exercises/
│       ├── ArbitrageDetector.jsx
│       ├── BundleBuilder.jsx
│       ├── ValidatorComparison.jsx
│       └── PerformanceAnalyzer.jsx
└── data/
    ├── modules.js                # Module definitions
    ├── tutorials.js              # Tutorial definitions
    ├── quizzes.js                # Quiz questions
    └── achievements.js           # Badge definitions
```

---

## Backend API Endpoints

### Learning Modules
```
GET    /api/education/journey              # Get user's learning journey
GET    /api/education/modules              # List all modules
GET    /api/education/modules/:slug        # Get module content
POST   /api/education/progress/:moduleId   # Update progress
POST   /api/education/complete/:moduleId   # Mark complete
```

### Quizzes
```
GET    /api/education/quiz/:moduleId       # Get quiz questions
POST   /api/education/quiz/:moduleId/submit # Submit answers
GET    /api/education/quiz/:moduleId/results # Get results
```

### Interactive Tutorials
```
GET    /api/education/tutorials            # List all tutorials
GET    /api/education/tutorials/:slug      # Get tutorial details
GET    /api/education/tutorials/:id/steps/:stepNumber # Get step
POST   /api/education/tutorials/:id/steps/:stepNumber/validate # Validate code
POST   /api/education/tutorials/:id/progress # Update progress
POST   /api/education/tutorials/:id/complete # Complete tutorial
GET    /api/education/tutorials/live-data/:dataType # Get live data
```

### Achievements
```
GET    /api/education/achievements         # Get user achievements
GET    /api/education/leaderboard          # Get XP leaderboard
POST   /api/education/claim-badge/:badgeId # Claim badge
```

### Interactive Exercises
```
POST   /api/education/exercise/:exerciseId/validate # Validate solution
GET    /api/education/exercise/:exerciseId/hint # Get hint
```

---

## Gamification System

### XP Levels
```javascript
const XP_LEVELS = {
  1: 0,      // Beginner
  2: 300,    // Learner
  3: 700,    // Practitioner
  4: 1200,   // Expert
  5: 2100    // Master
};
```

### Achievement Badges
```javascript
const BADGES = {
  // Module Badges
  mev_novice: { name: 'MEV Novice', icon: '🎓', xp: 100 },
  jito_explorer: { name: 'Jito Explorer', icon: '🔍', xp: 150 },
  arbitrage_hunter: { name: 'Arbitrage Hunter', icon: '💰', xp: 200 },
  liquidation_expert: { name: 'Liquidation Expert', icon: '⚡', xp: 200 },
  validator_analyst: { name: 'Validator Analyst', icon: '📊', xp: 150 },
  bundle_master: { name: 'Bundle Master', icon: '📦', xp: 250 },
  risk_manager: { name: 'Risk Manager', icon: '🛡️', xp: 250 },
  
  // Tutorial Badges
  arbitrage_detective: { name: 'Arbitrage Detective', icon: '🔎', xp: 200 },
  bundle_builder: { name: 'Bundle Builder', icon: '🏗️', xp: 250 },
  validator_expert: { name: 'Validator Expert', icon: '✅', xp: 150 },
  analytics_pro: { name: 'Analytics Pro', icon: '📈', xp: 200 },
  
  // Special Badges
  perfect_score: { name: 'Perfect Score', icon: '💯', xp: 50 },
  speed_learner: { name: 'Speed Learner', icon: '⚡', xp: 50 },
  code_ninja: { name: 'Code Ninja', icon: '🥷', xp: 100 },
  completionist: { name: 'Completionist', icon: '🏆', xp: 300 }
};
```

---

## UI Layouts

### Learning Journey Hub
```
┌─────────────────────────────────────────┐
│  Your Learning Journey                  │
│  Level 3 | 700/2100 XP                 │
│  ████████████░░░░░░░░░░░░░░ 33%       │
├─────────────────────────────────────────┤
│  Learning Path                          │
│                                         │
│  ┌─────┐    ┌─────┐    ┌─────┐       │
│  │  1  │───▶│  2  │───▶│  3  │       │
│  │ ✓   │    │ ✓   │    │ →   │       │
│  └─────┘    └─────┘    └─────┘       │
│   MEV      Jito     Arbitrage         │
│                                         │
│  Interactive Tutorials                  │
│  ┌─────────────────────────────────┐  │
│  │ 🎮 Detecting Arbitrage          │  │
│  │    8 steps | 25 min | 200 XP    │  │
│  │    [Start Tutorial →]            │  │
│  └─────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  Recent Achievements                    │
│  🏆 MEV Novice | 🎯 Jito Explorer     │
└─────────────────────────────────────────┘
```

### Tutorial View
```
┌─────────────────────────────────────────┐
│  Tutorial: Detecting Arbitrage          │
│  Step 3 of 8 | ●●●○○○○○ | 15 min      │
├─────────────────────────────────────────┤
│  Code Playground: Calculate Profit      │
│                                         │
│  Instructions:                          │
│  Write a function to calculate profit   │
│  from price differences.                │
│                                         │
│  ┌─────────────────┬─────────────────┐ │
│  │ Code Editor     │ Test Results    │ │
│  │                 │                 │ │
│  │ function calc() │ ✓ Test 1: Pass │ │
│  │ {               │ ✗ Test 2: Fail │ │
│  │   // code       │ ○ Test 3: ...  │ │
│  │ }               │                 │ │
│  │                 │ Console:        │ │
│  │ [Run Tests]     │ > Output...     │ │
│  │ [Get Hint]      │                 │ │
│  └─────────────────┴─────────────────┘ │
│                                         │
│  [← Previous] [Next Step →]            │
└─────────────────────────────────────────┘
```

---

## Implementation Timeline

### Phase 1: Database Setup (1.5 hours)
- [ ] Create 9 tables with migrations
- [ ] Seed 7 modules with content
- [ ] Seed 4 tutorials with 31 steps
- [ ] Create indexes for performance

### Phase 2: Backend API (2.5 hours)
- [ ] Education service (15 methods)
- [ ] Quiz service (5 methods)
- [ ] Tutorial service (10 methods)
- [ ] Achievement service (5 methods)
- [ ] Code validation service
- [ ] Create all API routes

### Phase 3: Frontend Core (4 hours)
- [ ] LearningJourney.jsx
- [ ] ModuleView.jsx
- [ ] TutorialView.jsx
- [ ] QuizView.jsx
- [ ] AchievementsView.jsx
- [ ] Shared components (10 components)

### Phase 4: Code Playground (3 hours)
- [ ] Monaco Editor integration
- [ ] Test runner implementation
- [ ] Console output display
- [ ] Hint system
- [ ] Code validation

### Phase 5: Tutorial Steps (3 hours)
- [ ] InstructionStep.jsx
- [ ] CodePlayground.jsx
- [ ] LiveDataStep.jsx
- [ ] QuizCheckpoint.jsx
- [ ] InteractiveStep.jsx
- [ ] CompletionScreen.jsx

### Phase 6: Interactive Exercises (3 hours)
- [ ] ArbitrageDetector.jsx
- [ ] BundleBuilder.jsx
- [ ] ValidatorComparison.jsx
- [ ] PerformanceAnalyzer.jsx

### Phase 7: Content Creation (4 hours)
- [ ] Write 7 module contents
- [ ] Create 50 quiz questions
- [ ] Write 31 tutorial steps
- [ ] Add code examples

### Phase 8: Integration & Testing (2 hours)
- [ ] Connect frontend to backend
- [ ] Test all step types
- [ ] Test progress tracking
- [ ] Test achievement unlocking
- [ ] Test code validation

**Total Estimated Time: ~23 hours**

---

## Technology Stack

**Frontend:**
- React 18
- Monaco Editor (code playground)
- Recharts (progress visualization)
- Tailwind CSS
- React Router

**Backend:**
- Express.js
- PostgreSQL
- Node.js code execution (sandboxed)

**Libraries:**
- `@monaco-editor/react` - Code editor
- `react-syntax-highlighter` - Code display
- `vm2` - Safe code execution (backend)

---

## Success Criteria

✅ **Learning Modules**
- 7 modules accessible
- Progress tracking works
- Quizzes functional
- XP awarded correctly

✅ **Interactive Tutorials**
- 4 tutorials with 31 steps
- Code playground functional
- Live data integration works
- Step navigation smooth

✅ **Gamification**
- XP system operational
- 14 badges unlockable
- Leaderboard displays
- Progress visualization

✅ **Assessment**
- Quizzes grade correctly
- Code validation works
- Instant feedback provided
- Achievements unlock

---

## Next Steps

1. Review and approve plan
2. Set up database schema
3. Implement backend APIs
4. Build frontend components
5. Create content
6. Test and iterate
7. Deploy to production

**Ready to begin implementation!**
