-- Additional database indexes for Phase 6 optimization

-- User authentication indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address) WHERE wallet_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- Refresh tokens index
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Token blacklist index
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Analytics time tracking indexes
CREATE INDEX IF NOT EXISTS idx_time_tracking_session ON learning_time_tracking(session_start DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_perf_user_quiz ON quiz_performance(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_code_sub_user_tutorial ON code_submissions(user_id, tutorial_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_learning_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_achievements_earned ON user_achievements(user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_composite ON practice_sessions(user_id, content_type, content_id);

-- Certification indexes
CREATE INDEX IF NOT EXISTS idx_user_certs_passed ON user_certifications(user_id, passed) WHERE passed = true;
CREATE INDEX IF NOT EXISTS idx_user_certs_issued ON user_certifications(issued_at DESC) WHERE issued_at IS NOT NULL;

-- Learning path indexes
CREATE INDEX IF NOT EXISTS idx_learning_paths_skill ON learning_paths(skill_level);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_user_type ON skill_assessments(user_id, assessment_type);
