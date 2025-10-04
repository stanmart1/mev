const express = require('express');
const router = express.Router();
const educationService = require('../services/educationService');
const { optionalAuth } = require('../middleware/auth');
const authenticationService = require('../services/authenticationService');
const { cacheMiddleware } = require('../middleware/cache');
const { rateLimitMiddleware } = require('../middleware/rateLimiter');

// Apply rate limiting to all education routes
router.use(rateLimitMiddleware({ limit: 100, window: 60 }));

// Input validation helpers
const validateProgressData = (data) => {
  const errors = [];
  
  if (data.progress_percentage !== undefined) {
    const progress = parseInt(data.progress_percentage);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      errors.push('progress_percentage must be between 0 and 100');
    }
  }
  
  if (data.last_section !== undefined) {
    const section = parseInt(data.last_section);
    if (isNaN(section) || section < 0) {
      errors.push('last_section must be a non-negative integer');
    }
  }
  
  if (data.status && !['not_started', 'in_progress', 'quiz', 'completed'].includes(data.status)) {
    errors.push('status must be one of: not_started, in_progress, quiz, completed');
  }
  
  return errors;
};

const validateQuizScore = (score) => {
  const numScore = parseInt(score);
  if (isNaN(numScore) || numScore < 0 || numScore > 100) {
    return 'quiz_score must be between 0 and 100';
  }
  return null;
};

// Get all modules (cached for 1 hour)
router.get('/modules', cacheMiddleware(3600), optionalAuth(authenticationService), async (req, res) => {
  try {
    const modules = await educationService.getAllModules();
    res.json({ success: true, data: modules });
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch modules' });
  }
});

// Get module by slug (cached for 1 hour)
router.get('/modules/:slug', cacheMiddleware(3600), optionalAuth(authenticationService), async (req, res) => {
  try {
    const module = await educationService.getModuleBySlug(req.params.slug);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }
    res.json({ success: true, data: module });
  } catch (error) {
    console.error('Error fetching module:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch module' });
  }
});

// Get user progress (cached for 5 minutes)
router.get('/progress', cacheMiddleware(300), optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: { progress: [], totalXP: 0 } });
    }
    const progress = await educationService.getUserProgress(req.user.userId);
    const totalXP = await educationService.getTotalXP(req.user.userId);
    res.json({ success: true, data: { progress, totalXP } });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch progress' });
  }
});

// Update progress
router.post('/progress/:moduleId', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: null });
    }
    
    // Validate module ID
    const moduleId = parseInt(req.params.moduleId);
    if (isNaN(moduleId)) {
      return res.status(400).json({ success: false, message: 'Invalid module ID' });
    }
    
    // Validate progress data
    const validationErrors = validateProgressData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: validationErrors });
    }
    
    const progress = await educationService.updateProgress(
      req.user.userId,
      moduleId,
      req.body
    );
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ success: false, message: 'Failed to update progress' });
  }
});

// Mark module complete
router.post('/complete/:moduleId', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    // Validate module ID
    const moduleId = parseInt(req.params.moduleId);
    if (isNaN(moduleId)) {
      return res.status(400).json({ success: false, message: 'Invalid module ID' });
    }
    
    // Validate quiz score
    const { quiz_score, quizScore } = req.body;
    const score = quiz_score || quizScore;
    const scoreError = validateQuizScore(score);
    if (scoreError) {
      return res.status(400).json({ success: false, message: scoreError });
    }
    
    const progress = await educationService.markComplete(
      req.user.userId,
      moduleId,
      parseInt(score)
    );
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error marking complete:', error);
    res.status(500).json({ success: false, message: 'Failed to mark complete' });
  }
});

// Get achievements
router.get('/achievements', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const achievements = await educationService.getUserAchievements(req.user.userId);
    res.json({ success: true, data: achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch achievements' });
  }
});

// Get all tutorials (cached for 1 hour)
router.get('/tutorials', cacheMiddleware(3600), async (req, res) => {
  try {
    const tutorials = await educationService.getAllTutorials();
    res.json({ success: true, data: tutorials });
  } catch (error) {
    console.error('Error fetching tutorials:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tutorials' });
  }
});

// Get tutorial by slug (cached for 1 hour)
router.get('/tutorials/:slug', cacheMiddleware(3600), async (req, res) => {
  try {
    const tutorial = await educationService.getTutorialBySlug(req.params.slug);
    if (!tutorial) {
      return res.status(404).json({ success: false, message: 'Tutorial not found' });
    }
    res.json({ success: true, data: tutorial });
  } catch (error) {
    console.error('Error fetching tutorial:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tutorial' });
  }
});

// Get practice challenges (cached for 1 hour)
router.get('/challenges', cacheMiddleware(3600), async (req, res) => {
  try {
    const challenges = await educationService.getChallenges();
    res.json({ success: true, data: challenges });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch challenges' });
  }
});

// Record practice session
router.post('/practice/:challengeId', optionalAuth(authenticationService), async (req, res) => {
  try {
    const { score, timeSpent } = req.body;
    const userId = req.user?.userId || null;
    
    const session = await educationService.recordPracticeSession(
      userId,
      'challenge',
      parseInt(req.params.challengeId),
      score,
      timeSpent
    );
    
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error recording practice:', error);
    res.status(500).json({ success: false, message: 'Failed to record practice' });
  }
});

// Get all certifications (cached for 1 hour)
router.get('/certifications', cacheMiddleware(3600), async (req, res) => {
  try {
    const certifications = await educationService.getCertifications();
    res.json({ success: true, data: certifications });
  } catch (error) {
    console.error('Error fetching certifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certifications' });
  }
});

// Get user certifications
router.get('/my-certifications', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: [] });
    }
    const certs = await educationService.getUserCertifications(req.user.userId);
    res.json({ success: true, data: certs });
  } catch (error) {
    console.error('Error fetching user certifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certifications' });
  }
});

// Get certification exam
router.get('/certifications/:id/exam', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const exam = await educationService.getCertificationExam(parseInt(req.params.id));
    res.json({ success: true, data: exam });
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch exam' });
  }
});

// Submit certification exam
router.post('/certifications/:id/submit', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const result = await educationService.submitCertificationExam(
      req.user.userId,
      parseInt(req.params.id),
      req.body.answers
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({ success: false, message: 'Failed to submit exam' });
  }
});

// Get skill assessment
router.get('/skill-assessment', async (req, res) => {
  try {
    const assessment = await educationService.getSkillAssessment();
    res.json({ success: true, data: assessment });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assessment' });
  }
});

// Submit skill assessment
router.post('/skill-assessment/submit', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const result = await educationService.submitSkillAssessment(req.user.userId, req.body.answers);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    res.status(500).json({ success: false, message: 'Failed to submit assessment' });
  }
});

// Get learning path
router.get('/learning-path', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: null });
    }
    const path = await educationService.getLearningPath(req.user.userId);
    res.json({ success: true, data: path });
  } catch (error) {
    console.error('Error fetching learning path:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch learning path' });
  }
});

// Get module recommendations
router.get('/recommendations', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: [] });
    }
    const recommendations = await educationService.getRecommendations(req.user.userId);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recommendations' });
  }
});

// Analytics Routes

// Start time tracking session
router.post('/analytics/time/start', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: { sessionId: null } });
    }
    const { moduleId, sectionId, tutorialId } = req.body;
    const sessionId = await educationService.startTimeTracking(req.user.userId, moduleId, sectionId, tutorialId);
    res.json({ success: true, data: { sessionId } });
  } catch (error) {
    console.error('Error starting time tracking:', error);
    res.status(500).json({ success: false, message: 'Failed to start time tracking' });
  }
});

// End time tracking session
router.post('/analytics/time/end/:sessionId', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const session = await educationService.endTimeTracking(parseInt(req.params.sessionId));
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error ending time tracking:', error);
    res.status(500).json({ success: false, message: 'Failed to end time tracking' });
  }
});

// Record quiz performance
router.post('/analytics/quiz', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { quizId, questionId, selectedAnswer, isCorrect, timeTaken, attemptNumber } = req.body;
    const result = await educationService.recordQuizPerformance(
      req.user.userId, quizId, questionId, selectedAnswer, isCorrect, timeTaken, attemptNumber
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error recording quiz performance:', error);
    res.status(500).json({ success: false, message: 'Failed to record quiz performance' });
  }
});

// Record code submission
router.post('/analytics/code', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { tutorialId, stepId, code, passed, testResults, attemptNumber } = req.body;
    const result = await educationService.recordCodeSubmission(
      req.user.userId, tutorialId, stepId, code, passed, testResults, attemptNumber
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error recording code submission:', error);
    res.status(500).json({ success: false, message: 'Failed to record code submission' });
  }
});

// Submit feedback
router.post('/analytics/feedback', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { moduleId, tutorialId, rating, difficultyRating, feedbackText, wouldRecommend } = req.body;
    const result = await educationService.submitFeedback(
      req.user.userId, moduleId, tutorialId, rating, difficultyRating, feedbackText, wouldRecommend
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
});

// Get user analytics dashboard
router.get('/analytics/dashboard', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const analytics = await educationService.getUserAnalytics(req.user.userId);
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// Get admin analytics (requires admin role)
router.get('/analytics/admin', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const analytics = await educationService.getAdminAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin analytics' });
  }
});

// Get content analytics (requires admin role)
router.get('/analytics/content', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const analytics = await educationService.getContentAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching content analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch content analytics' });
  }
});

// Gamification Routes

// Get all badges (cached for 1 hour)
router.get('/badges', cacheMiddleware(3600), async (req, res) => {
  try {
    const includeHidden = req.query.includeHidden === 'true';
    const badges = await educationService.getAllBadges(includeHidden);
    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch badges' });
  }
});

// Get user badges
router.get('/my-badges', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: [] });
    }
    const badges = await educationService.getUserBadges(req.user.userId);
    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch badges' });
  }
});

// Check and award badges
router.post('/badges/check', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const awarded = await educationService.checkAndAwardBadges(req.user.userId);
    res.json({ success: true, data: awarded });
  } catch (error) {
    console.error('Error checking badges:', error);
    res.status(500).json({ success: false, message: 'Failed to check badges' });
  }
});

// Get leaderboard (cached for 5 minutes)
router.get('/leaderboard', cacheMiddleware(300), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const category = req.query.category || 'overall';
    const leaderboard = await educationService.getLeaderboard(limit, category);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
});

// Get user rank
router.get('/my-rank', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: { rank: null, total_xp: 0, level: 1 } });
    }
    const rank = await educationService.getUserRank(req.user.userId);
    res.json({ success: true, data: rank });
  } catch (error) {
    console.error('Error fetching user rank:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rank' });
  }
});

// Record daily activity
router.post('/activity/daily', optionalAuth(authenticationService), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { xpEarned, modulesCompleted, tutorialsCompleted } = req.body;
    await educationService.recordDailyActivity(
      req.user.userId,
      xpEarned || 0,
      modulesCompleted || 0,
      tutorialsCompleted || 0
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording daily activity:', error);
    res.status(500).json({ success: false, message: 'Failed to record activity' });
  }
});

// Glossary routes
router.get('/glossary', cacheMiddleware(3600), async (req, res) => {
  try {
    const terms = await educationService.getAllGlossaryTerms();
    res.json({ success: true, data: terms });
  } catch (error) {
    console.error('Error fetching glossary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch glossary' });
  }
});

router.get('/glossary/:term', cacheMiddleware(3600), async (req, res) => {
  try {
    const term = await educationService.getGlossaryTerm(req.params.term);
    if (!term) {
      return res.status(404).json({ success: false, message: 'Term not found' });
    }
    res.json({ success: true, data: term });
  } catch (error) {
    console.error('Error fetching glossary term:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch term' });
  }
});

module.exports = router;
