const pool = require('../config/database');

class EducationService {
  async getAllModules() {
    const query = `
      SELECT * FROM learning_modules 
      ORDER BY order_index ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getModuleBySlug(slug) {
    const moduleQuery = `SELECT * FROM learning_modules WHERE slug = $1`;
    const contentQuery = `
      SELECT * FROM module_content 
      WHERE module_id = $1 
      ORDER BY section_order ASC
    `;
    const quizQuery = `SELECT * FROM quizzes WHERE module_id = $1`;

    const moduleResult = await pool.query(moduleQuery, [slug]);
    if (moduleResult.rows.length === 0) return null;

    const module = moduleResult.rows[0];
    const contentResult = await pool.query(contentQuery, [module.id]);
    const quizResult = await pool.query(quizQuery, [module.id]);

    return {
      ...module,
      sections: contentResult.rows,
      quiz: quizResult.rows[0] || null
    };
  }

  async getUserProgress(userId) {
    const query = `
      SELECT ulp.*, lm.title, lm.category, lm.xp_reward, lm.badge_id
      FROM user_learning_progress ulp
      JOIN learning_modules lm ON ulp.module_id = lm.id
      WHERE ulp.user_id = $1
      ORDER BY lm.order_index ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async updateProgress(userId, moduleId, data) {
    const query = `
      INSERT INTO user_learning_progress 
        (user_id, module_id, progress_percentage, last_section, time_spent, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, module_id) 
      DO UPDATE SET 
        progress_percentage = $3,
        last_section = $4,
        time_spent = user_learning_progress.time_spent + $5,
        status = $6
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId,
      moduleId,
      data.progress_percentage,
      data.last_section,
      data.time_spent || 0,
      data.status || 'in_progress'
    ]);
    return result.rows[0];
  }

  async markComplete(userId, moduleId, quizScore) {
    const query = `
      UPDATE user_learning_progress 
      SET status = 'completed', 
          progress_percentage = 100,
          quiz_score = $3,
          completed_at = NOW()
      WHERE user_id = $1 AND module_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [userId, moduleId, quizScore]);
    
    if (result.rows.length > 0) {
      const moduleQuery = `SELECT xp_reward, badge_id FROM learning_modules WHERE id = $1`;
      const moduleResult = await pool.query(moduleQuery, [moduleId]);
      
      if (moduleResult.rows.length > 0) {
        const { xp_reward, badge_id } = moduleResult.rows[0];
        await this.awardAchievement(userId, 'module_completion', badge_id, xp_reward);
      }
    }
    
    return result.rows[0];
  }

  async awardAchievement(userId, type, achievementId, xp) {
    const query = `
      INSERT INTO user_achievements (user_id, achievement_type, achievement_id, xp_earned)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [userId, type, achievementId, xp]);
    return result.rows[0];
  }

  async getUserAchievements(userId) {
    const query = `
      SELECT * FROM user_achievements 
      WHERE user_id = $1 
      ORDER BY earned_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getTotalXP(userId) {
    const query = `
      SELECT COALESCE(SUM(xp_earned), 0) as total_xp 
      FROM user_achievements 
      WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].total_xp);
  }

  async getAllTutorials() {
    const query = `SELECT * FROM interactive_tutorials ORDER BY order_index ASC`;
    const result = await pool.query(query);
    return result.rows;
  }

  async getTutorialBySlug(slug) {
    const tutorialQuery = `SELECT * FROM interactive_tutorials WHERE slug = $1`;
    const stepsQuery = `SELECT * FROM tutorial_steps WHERE tutorial_id = $1 ORDER BY step_number ASC`;

    const tutorialResult = await pool.query(tutorialQuery, [slug]);
    if (tutorialResult.rows.length === 0) return null;

    const tutorial = tutorialResult.rows[0];
    const stepsResult = await pool.query(stepsQuery, [tutorial.id]);

    return { ...tutorial, steps: stepsResult.rows };
  }

  async getChallenges() {
    const query = `SELECT * FROM code_challenges ORDER BY difficulty, created_at`;
    const result = await pool.query(query);
    return result.rows;
  }

  async recordPracticeSession(userId, contentType, contentId, score, timeSpent) {
    if (!userId) return null;
    
    const query = `
      INSERT INTO practice_sessions (user_id, content_type, content_id, attempts, best_score, total_time_spent)
      VALUES ($1, $2, $3, 1, $4, $5)
      ON CONFLICT (user_id, content_type, content_id) 
      DO UPDATE SET 
        attempts = practice_sessions.attempts + 1,
        best_score = GREATEST(practice_sessions.best_score, $4),
        total_time_spent = practice_sessions.total_time_spent + $5,
        last_attempt_at = NOW()
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, contentType, contentId, score, timeSpent]);
    return result.rows[0];
  }

  async getCertifications() {
    const query = `SELECT * FROM certifications ORDER BY xp_reward ASC`;
    const result = await pool.query(query);
    return result.rows;
  }

  async getUserCertifications(userId) {
    const query = `SELECT * FROM user_certifications WHERE user_id = $1`;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getCertificationExam(certId) {
    const query = `SELECT questions FROM certification_exams WHERE certification_id = $1`;
    const result = await pool.query(query, [certId]);
    return result.rows[0] || { questions: [] };
  }

  async submitCertificationExam(userId, certId, answers) {
    const examQuery = `SELECT questions FROM certification_exams WHERE certification_id = $1`;
    const certQuery = `SELECT * FROM certifications WHERE id = $1`;
    
    const [examResult, certResult] = await Promise.all([
      pool.query(examQuery, [certId]),
      pool.query(certQuery, [certId])
    ]);
    
    const questions = examResult.rows[0]?.questions || [];
    const cert = certResult.rows[0];
    
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct) correct++;
    });
    
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= cert.passing_score;
    
    const upsertQuery = `
      INSERT INTO user_certifications (user_id, certification_id, exam_score, passed, attempts, issued_at)
      VALUES ($1, $2, $3, $4, 1, ${passed ? 'NOW()' : 'NULL'})
      ON CONFLICT (user_id, certification_id)
      DO UPDATE SET
        exam_score = GREATEST(user_certifications.exam_score, $3),
        passed = user_certifications.passed OR $4,
        attempts = user_certifications.attempts + 1,
        issued_at = CASE WHEN $4 AND NOT user_certifications.passed THEN NOW() ELSE user_certifications.issued_at END
      RETURNING *
    `;
    
    const result = await pool.query(upsertQuery, [userId, certId, score, passed]);
    
    if (passed) {
      await this.awardAchievement(userId, 'certification', cert.badge_icon, cert.xp_reward);
    }
    
    return { score, passed, correct, total: questions.length };
  }

  async getSkillAssessment() {
    const query = `SELECT questions FROM skill_assessments WHERE user_id = 0 AND assessment_type = 'template'`;
    const result = await pool.query(query);
    return result.rows[0] || { questions: [] };
  }

  async submitSkillAssessment(userId, answers) {
    const assessmentQuery = `SELECT questions FROM skill_assessments WHERE user_id = 0 AND assessment_type = 'template'`;
    const result = await pool.query(assessmentQuery);
    const questions = result.rows[0]?.questions || [];
    
    let totalScore = 0;
    let maxScore = 0;
    const categoryScores = {};
    
    questions.forEach(q => {
      const answer = answers[q.id] || 0;
      const score = answer * q.weight;
      totalScore += score;
      maxScore += (q.options.length - 1) * q.weight;
      
      if (!categoryScores[q.category]) categoryScores[q.category] = { score: 0, max: 0 };
      categoryScores[q.category].score += score;
      categoryScores[q.category].max += (q.options.length - 1) * q.weight;
    });
    
    const percentage = (totalScore / maxScore) * 100;
    let skillLevel = 'beginner';
    if (percentage >= 70) skillLevel = 'advanced';
    else if (percentage >= 40) skillLevel = 'intermediate';
    
    const weakAreas = [];
    const strongAreas = [];
    Object.entries(categoryScores).forEach(([cat, scores]) => {
      const catPercent = (scores.score / scores.max) * 100;
      if (catPercent < 40) weakAreas.push(cat);
      else if (catPercent > 70) strongAreas.push(cat);
    });
    
    const insertQuery = `
      INSERT INTO skill_assessments (user_id, assessment_type, questions, answers, score, skill_level, weak_areas, strong_areas)
      VALUES ($1, 'initial', $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    await pool.query(insertQuery, [userId, JSON.stringify(questions), JSON.stringify(answers), Math.round(percentage), skillLevel, JSON.stringify(weakAreas), JSON.stringify(strongAreas)]);
    
    const recommendedModules = skillLevel === 'beginner' ? [1, 2] : skillLevel === 'intermediate' ? [3, 4, 5] : [6, 7];
    const pathQuery = `
      INSERT INTO learning_paths (user_id, skill_level, recommended_modules, learning_style)
      VALUES ($1, $2, $3, 'hands-on')
      ON CONFLICT (user_id) DO UPDATE SET
        skill_level = $2,
        recommended_modules = $3,
        updated_at = NOW()
    `;
    await pool.query(pathQuery, [userId, skillLevel, JSON.stringify(recommendedModules)]);
    
    return { skillLevel, weakAreas, strongAreas, score: Math.round(percentage) };
  }

  async getLearningPath(userId) {
    const query = `SELECT * FROM learning_paths WHERE user_id = $1`;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  async getRecommendations(userId) {
    const pathQuery = `SELECT * FROM learning_paths WHERE user_id = $1`;
    const pathResult = await pool.query(pathQuery, [userId]);
    
    if (!pathResult.rows.length) return [];
    
    const path = pathResult.rows[0];
    const recommendedIds = path.recommended_modules || [];
    
    if (recommendedIds.length === 0) return [];
    
    const modulesQuery = `SELECT * FROM learning_modules WHERE id = ANY($1) ORDER BY order_index`;
    const modulesResult = await pool.query(modulesQuery, [recommendedIds]);
    
    return modulesResult.rows.map((m, i) => ({
      ...m,
      reason: i === 0 ? 'Start here based on your skill level' : 'Next in your learning path',
      priority: recommendedIds.length - i
    }));
  }

  // Analytics Methods
  async startTimeTracking(userId, moduleId, sectionId, tutorialId) {
    const query = `
      INSERT INTO learning_time_tracking (user_id, module_id, section_id, tutorial_id, session_start)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `;
    const result = await pool.query(query, [userId, moduleId, sectionId, tutorialId]);
    return result.rows[0].id;
  }

  async endTimeTracking(sessionId) {
    const query = `
      UPDATE learning_time_tracking 
      SET session_end = NOW(), 
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [sessionId]);
    return result.rows[0];
  }

  async recordQuizPerformance(userId, quizId, questionId, selectedAnswer, isCorrect, timeTaken, attemptNumber) {
    const query = `
      INSERT INTO quiz_performance (user_id, quiz_id, question_id, selected_answer, is_correct, time_taken_seconds, attempt_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, quizId, questionId, selectedAnswer, isCorrect, timeTaken, attemptNumber]);
    return result.rows[0];
  }

  async recordCodeSubmission(userId, tutorialId, stepId, code, passed, testResults, attemptNumber) {
    const query = `
      INSERT INTO code_submissions (user_id, tutorial_id, step_id, code, passed, test_results, attempt_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, tutorialId, stepId, code, passed, JSON.stringify(testResults), attemptNumber]);
    return result.rows[0];
  }

  async submitFeedback(userId, moduleId, tutorialId, rating, difficultyRating, feedbackText, wouldRecommend) {
    const query = `
      INSERT INTO module_feedback (user_id, module_id, tutorial_id, rating, difficulty_rating, feedback_text, would_recommend)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, moduleId, tutorialId, rating, difficultyRating, feedbackText, wouldRecommend]);
    return result.rows[0];
  }

  async getUserAnalytics(userId) {
    const timeQuery = `
      SELECT 
        COALESCE(SUM(duration_seconds), 0) as total_time,
        COUNT(DISTINCT module_id) as modules_visited,
        COUNT(DISTINCT tutorial_id) as tutorials_visited
      FROM learning_time_tracking
      WHERE user_id = $1 AND duration_seconds IS NOT NULL
    `;
    
    const quizQuery = `
      SELECT 
        COUNT(*) as total_attempts,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
        AVG(time_taken_seconds) as avg_time_per_question
      FROM quiz_performance
      WHERE user_id = $1
    `;
    
    const codeQuery = `
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed_submissions
      FROM code_submissions
      WHERE user_id = $1
    `;
    
    const progressQuery = `
      SELECT 
        COUNT(*) as modules_started,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as modules_completed,
        AVG(progress_percentage) as avg_progress
      FROM user_learning_progress
      WHERE user_id = $1
    `;
    
    const [timeResult, quizResult, codeResult, progressResult] = await Promise.all([
      pool.query(timeQuery, [userId]),
      pool.query(quizQuery, [userId]),
      pool.query(codeQuery, [userId]),
      pool.query(progressQuery, [userId])
    ]);
    
    return {
      timeSpent: parseInt(timeResult.rows[0].total_time),
      modulesVisited: parseInt(timeResult.rows[0].modules_visited),
      tutorialsVisited: parseInt(timeResult.rows[0].tutorials_visited),
      quizAttempts: parseInt(quizResult.rows[0].total_attempts),
      quizAccuracy: quizResult.rows[0].total_attempts > 0 
        ? Math.round((quizResult.rows[0].correct_answers / quizResult.rows[0].total_attempts) * 100) 
        : 0,
      avgQuizTime: Math.round(quizResult.rows[0].avg_time_per_question || 0),
      codeSubmissions: parseInt(codeResult.rows[0].total_submissions),
      codeSuccessRate: codeResult.rows[0].total_submissions > 0
        ? Math.round((codeResult.rows[0].passed_submissions / codeResult.rows[0].total_submissions) * 100)
        : 0,
      modulesStarted: parseInt(progressResult.rows[0].modules_started),
      modulesCompleted: parseInt(progressResult.rows[0].modules_completed),
      avgProgress: Math.round(progressResult.rows[0].avg_progress || 0)
    };
  }

  async getAdminAnalytics() {
    const query = `
      SELECT 
        (SELECT COUNT(DISTINCT user_id) FROM user_learning_progress) as total_users,
        (SELECT COUNT(DISTINCT user_id) FROM user_learning_progress WHERE updated_at > NOW() - INTERVAL '7 days') as active_users,
        (SELECT COUNT(*) FROM user_learning_progress WHERE status = 'completed') as modules_completed,
        (SELECT AVG(time_spent) FROM user_learning_progress WHERE status = 'completed') as avg_completion_time,
        (SELECT COUNT(*) FROM quiz_performance) as total_quiz_attempts,
        (SELECT AVG(CASE WHEN is_correct THEN 100 ELSE 0 END) FROM quiz_performance) as avg_quiz_score,
        (SELECT COUNT(*) FROM code_submissions) as total_code_submissions,
        (SELECT AVG(CASE WHEN passed THEN 100 ELSE 0 END) FROM code_submissions) as avg_code_success_rate
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
  }

  async getContentAnalytics() {
    const query = `
      SELECT 
        lm.id,
        lm.title,
        lm.category,
        COUNT(DISTINCT ulp.user_id) as total_users,
        SUM(CASE WHEN ulp.status = 'completed' THEN 1 ELSE 0 END) as completions,
        AVG(ulp.time_spent) as avg_time_spent,
        AVG(ulp.quiz_score) as avg_quiz_score,
        AVG(mf.rating) as avg_rating,
        AVG(mf.difficulty_rating) as avg_difficulty
      FROM learning_modules lm
      LEFT JOIN user_learning_progress ulp ON lm.id = ulp.module_id
      LEFT JOIN module_feedback mf ON lm.id = mf.module_id
      GROUP BY lm.id, lm.title, lm.category
      ORDER BY lm.order_index
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => ({
      ...row,
      completion_rate: row.total_users > 0 ? Math.round((row.completions / row.total_users) * 100) : 0,
      avg_time_spent: Math.round(row.avg_time_spent || 0),
      avg_quiz_score: Math.round(row.avg_quiz_score || 0),
      avg_rating: parseFloat((row.avg_rating || 0).toFixed(1)),
      avg_difficulty: parseFloat((row.avg_difficulty || 0).toFixed(1))
    }));
  }

  // Gamification Methods
  async getAllBadges(includeHidden = false) {
    const query = includeHidden 
      ? `SELECT * FROM badge_definitions ORDER BY rarity, name`
      : `SELECT * FROM badge_definitions WHERE is_hidden = FALSE ORDER BY rarity, name`;
    const result = await pool.query(query);
    return result.rows;
  }

  async checkAndAwardBadges(userId) {
    const badges = await this.getAllBadges(true);
    const awarded = [];

    for (const badge of badges) {
      const criteria = badge.unlock_criteria;
      const earned = await this.checkBadgeCriteria(userId, criteria);
      
      if (earned) {
        const result = await this.awardBadge(userId, badge.badge_id, badge.rarity, badge.xp_reward);
        if (result) awarded.push({ ...badge, justEarned: true });
      }
    }

    return awarded;
  }

  async checkBadgeCriteria(userId, criteria) {
    const { type, count, module_id, score, days, hours, categories } = criteria;

    if (type === 'module_complete') {
      if (module_id) {
        const query = `SELECT COUNT(*) FROM user_learning_progress WHERE user_id = $1 AND status = 'completed' AND module_id = (SELECT id FROM learning_modules WHERE slug = $2)`;
        const result = await pool.query(query, [userId, module_id]);
        return parseInt(result.rows[0].count) > 0;
      } else if (count) {
        const query = `SELECT COUNT(*) FROM user_learning_progress WHERE user_id = $1 AND status = 'completed'`;
        const result = await pool.query(query, [userId]);
        return parseInt(result.rows[0].count) >= count;
      }
    }

    if (type === 'quiz_score' && score) {
      const query = `SELECT COUNT(*) FROM user_learning_progress WHERE user_id = $1 AND quiz_score >= $2`;
      const result = await pool.query(query, [userId, score]);
      return parseInt(result.rows[0].count) > 0;
    }

    if (type === 'streak' && days) {
      const query = `SELECT streak_days FROM leaderboards WHERE user_id = $1`;
      const result = await pool.query(query, [userId]);
      return result.rows.length > 0 && result.rows[0].streak_days >= days;
    }

    if (type === 'tutorial_complete' && count) {
      const query = `SELECT COUNT(*) FROM user_tutorial_progress WHERE user_id = $1 AND status = 'completed'`;
      const result = await pool.query(query, [userId]);
      return parseInt(result.rows[0].count) >= count;
    }

    if (type === 'certification_complete' && count) {
      const query = `SELECT COUNT(*) FROM user_certifications WHERE user_id = $1 AND passed = TRUE`;
      const result = await pool.query(query, [userId]);
      return parseInt(result.rows[0].count) >= count;
    }

    if (type === 'perfect_quizzes' && count) {
      const query = `SELECT COUNT(*) FROM user_learning_progress WHERE user_id = $1 AND quiz_score = 100`;
      const result = await pool.query(query, [userId]);
      return parseInt(result.rows[0].count) >= count;
    }

    if (type === 'time_based' && hours) {
      const currentHour = new Date().getHours();
      return hours.includes(currentHour);
    }

    return false;
  }

  async awardBadge(userId, badgeId, rarity, xpReward) {
    const query = `
      INSERT INTO user_achievements (user_id, achievement_type, achievement_id, rarity, xp_earned)
      VALUES ($1, 'badge', $2, $3, $4)
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [userId, badgeId, rarity, xpReward]);
    
    if (result.rows.length > 0) {
      await this.updateLeaderboard(userId);
    }
    
    return result.rows[0];
  }

  async getUserBadges(userId) {
    const query = `
      SELECT ua.*, bd.name, bd.description, bd.icon, bd.category, bd.is_hidden
      FROM user_achievements ua
      JOIN badge_definitions bd ON ua.achievement_id = bd.badge_id
      WHERE ua.user_id = $1 AND ua.achievement_type = 'badge'
      ORDER BY 
        CASE bd.rarity
          WHEN 'legendary' THEN 1
          WHEN 'epic' THEN 2
          WHEN 'rare' THEN 3
          WHEN 'uncommon' THEN 4
          WHEN 'common' THEN 5
        END,
        ua.earned_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async updateLeaderboard(userId) {
    const xpQuery = `SELECT COALESCE(SUM(xp_earned), 0) as total_xp FROM user_achievements WHERE user_id = $1`;
    const progressQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as modules_completed
      FROM user_learning_progress WHERE user_id = $1
    `;
    const tutorialQuery = `
      SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END) as tutorials_completed
      FROM user_tutorial_progress WHERE user_id = $1
    `;
    const badgeQuery = `
      SELECT 
        COUNT(*) as total_badges,
        COUNT(CASE WHEN rarity = 'rare' THEN 1 END) as rare_badges,
        COUNT(CASE WHEN rarity = 'epic' THEN 1 END) as epic_badges,
        COUNT(CASE WHEN rarity = 'legendary' THEN 1 END) as legendary_badges
      FROM user_achievements WHERE user_id = $1 AND achievement_type = 'badge'
    `;
    const userQuery = `SELECT username FROM users WHERE id = $1`;

    const [xpResult, progressResult, tutorialResult, badgeResult, userResult] = await Promise.all([
      pool.query(xpQuery, [userId]),
      pool.query(progressQuery, [userId]),
      pool.query(tutorialQuery, [userId]),
      pool.query(badgeQuery, [userId]),
      pool.query(userQuery, [userId])
    ]);

    const totalXp = parseInt(xpResult.rows[0].total_xp);
    const level = this.calculateLevel(totalXp);
    const streakDays = await this.calculateStreak(userId);

    const upsertQuery = `
      INSERT INTO leaderboards (
        user_id, username, total_xp, level, modules_completed, tutorials_completed,
        badges_earned, rare_badges, epic_badges, legendary_badges, streak_days, last_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        username = $2,
        total_xp = $3,
        level = $4,
        modules_completed = $5,
        tutorials_completed = $6,
        badges_earned = $7,
        rare_badges = $8,
        epic_badges = $9,
        legendary_badges = $10,
        streak_days = $11,
        last_active = NOW(),
        updated_at = NOW()
    `;

    await pool.query(upsertQuery, [
      userId,
      userResult.rows[0]?.username || 'Anonymous',
      totalXp,
      level,
      parseInt(progressResult.rows[0].modules_completed),
      parseInt(tutorialResult.rows[0].tutorials_completed),
      parseInt(badgeResult.rows[0].total_badges),
      parseInt(badgeResult.rows[0].rare_badges),
      parseInt(badgeResult.rows[0].epic_badges),
      parseInt(badgeResult.rows[0].legendary_badges),
      streakDays
    ]);

    await this.updateRankings();
  }

  calculateLevel(xp) {
    if (xp >= 2100) return 5;
    if (xp >= 1200) return 4;
    if (xp >= 700) return 3;
    if (xp >= 300) return 2;
    return 1;
  }

  async calculateStreak(userId) {
    const query = `
      SELECT activity_date 
      FROM user_daily_activity 
      WHERE user_id = $1 
      ORDER BY activity_date DESC
    `;
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < result.rows.length; i++) {
      const activityDate = new Date(result.rows[i].activity_date);
      activityDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (activityDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  async recordDailyActivity(userId, xpEarned, modulesCompleted, tutorialsCompleted) {
    const query = `
      INSERT INTO user_daily_activity (user_id, activity_date, xp_earned, modules_completed, tutorials_completed)
      VALUES ($1, CURRENT_DATE, $2, $3, $4)
      ON CONFLICT (user_id, activity_date) DO UPDATE SET
        xp_earned = user_daily_activity.xp_earned + $2,
        modules_completed = user_daily_activity.modules_completed + $3,
        tutorials_completed = user_daily_activity.tutorials_completed + $4
    `;
    await pool.query(query, [userId, xpEarned, modulesCompleted, tutorialsCompleted]);
    await this.updateLeaderboard(userId);
  }

  async updateRankings() {
    const query = `
      UPDATE leaderboards
      SET rank = subquery.rank
      FROM (
        SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_xp DESC, level DESC, badges_earned DESC) as rank
        FROM leaderboards
      ) AS subquery
      WHERE leaderboards.user_id = subquery.user_id
    `;
    await pool.query(query);
  }

  async getLeaderboard(limit = 100, category = 'overall') {
    let orderBy = 'total_xp DESC, level DESC, badges_earned DESC';
    
    if (category === 'badges') orderBy = 'badges_earned DESC, legendary_badges DESC, epic_badges DESC';
    else if (category === 'streak') orderBy = 'streak_days DESC, total_xp DESC';
    else if (category === 'modules') orderBy = 'modules_completed DESC, total_xp DESC';

    const query = `
      SELECT * FROM leaderboards
      ORDER BY ${orderBy}
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  async getUserRank(userId) {
    const query = `SELECT rank, total_xp, level FROM leaderboards WHERE user_id = $1`;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || { rank: null, total_xp: 0, level: 1 };
  }

  async getGlossaryTerm(term) {
    const query = `SELECT * FROM education_glossary WHERE LOWER(term) = LOWER($1)`;
    const result = await pool.query(query, [term]);
    return result.rows[0] || null;
  }

  async getGlossaryTerms(terms) {
    if (!terms || terms.length === 0) return [];
    const query = `SELECT * FROM education_glossary WHERE LOWER(term) = ANY($1::text[])`;
    const lowerTerms = terms.map(t => t.toLowerCase());
    const result = await pool.query(query, [lowerTerms]);
    return result.rows;
  }

  async getAllGlossaryTerms() {
    const query = `SELECT * FROM education_glossary ORDER BY term ASC`;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = new EducationService();
