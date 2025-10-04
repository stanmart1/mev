-- Add indexes for education system performance optimization

-- User progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress ON user_learning_progress(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_learning_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON user_learning_progress(user_id, completed_at) WHERE completed_at IS NOT NULL;

-- User tutorial progress indexes
CREATE INDEX IF NOT EXISTS idx_user_tutorial_progress ON user_tutorial_progress(user_id, tutorial_id);
CREATE INDEX IF NOT EXISTS idx_user_tutorial_status ON user_tutorial_progress(user_id, status);

-- Achievements indexes
CREATE INDEX IF NOT EXISTS idx_achievements ON user_achievements(user_id, achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievements_earned ON user_achievements(user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_xp ON user_achievements(user_id, xp_earned);

-- Module and tutorial lookup indexes
CREATE INDEX IF NOT EXISTS idx_module_slug ON learning_modules(slug);
CREATE INDEX IF NOT EXISTS idx_module_category ON learning_modules(category, order_index);
CREATE INDEX IF NOT EXISTS idx_tutorial_slug ON interactive_tutorials(slug);
CREATE INDEX IF NOT EXISTS idx_tutorial_category ON interactive_tutorials(category, order_index);

-- Content lookup indexes
CREATE INDEX IF NOT EXISTS idx_module_content ON module_content(module_id, section_order);
CREATE INDEX IF NOT EXISTS idx_tutorial_steps ON tutorial_steps(tutorial_id, step_number);
CREATE INDEX IF NOT EXISTS idx_quizzes ON quizzes(module_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_progress_module_user ON user_learning_progress(module_id, user_id, status);
