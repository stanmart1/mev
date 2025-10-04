-- Phase 5: Analytics & Insights Database Schema

-- Track time spent on modules and sections
CREATE TABLE IF NOT EXISTS learning_time_tracking (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES module_content(id) ON DELETE CASCADE,
    tutorial_id INTEGER REFERENCES interactive_tutorials(id) ON DELETE CASCADE,
    session_start TIMESTAMP NOT NULL DEFAULT NOW(),
    session_end TIMESTAMP,
    duration_seconds INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Track quiz performance details
CREATE TABLE IF NOT EXISTS quiz_performance (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id INTEGER,
    selected_answer INTEGER,
    is_correct BOOLEAN,
    time_taken_seconds INTEGER,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Track code submissions
CREATE TABLE IF NOT EXISTS code_submissions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tutorial_id INTEGER REFERENCES interactive_tutorials(id) ON DELETE CASCADE,
    step_id INTEGER REFERENCES tutorial_steps(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    passed BOOLEAN DEFAULT FALSE,
    test_results JSONB,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User feedback on modules
CREATE TABLE IF NOT EXISTS module_feedback (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
    tutorial_id INTEGER REFERENCES interactive_tutorials(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    feedback_text TEXT,
    would_recommend BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics snapshots for admin dashboard
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,
    total_users INTEGER,
    active_users INTEGER,
    modules_completed INTEGER,
    avg_completion_time_minutes INTEGER,
    total_quiz_attempts INTEGER,
    avg_quiz_score DECIMAL(5,2),
    total_code_submissions INTEGER,
    avg_code_success_rate DECIMAL(5,2),
    metrics JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_time_tracking_user ON learning_time_tracking(user_id);
CREATE INDEX idx_time_tracking_module ON learning_time_tracking(module_id);
CREATE INDEX idx_time_tracking_dates ON learning_time_tracking(session_start, session_end);
CREATE INDEX idx_quiz_perf_user ON quiz_performance(user_id);
CREATE INDEX idx_quiz_perf_quiz ON quiz_performance(quiz_id);
CREATE INDEX idx_code_sub_user ON code_submissions(user_id);
CREATE INDEX idx_code_sub_tutorial ON code_submissions(tutorial_id);
CREATE INDEX idx_feedback_module ON module_feedback(module_id);
CREATE INDEX idx_feedback_rating ON module_feedback(rating);
CREATE INDEX idx_analytics_date ON analytics_snapshots(snapshot_date);

-- Seed initial analytics snapshot
INSERT INTO analytics_snapshots (snapshot_date, total_users, active_users, modules_completed, avg_completion_time_minutes, total_quiz_attempts, avg_quiz_score, total_code_submissions, avg_code_success_rate, metrics)
VALUES (CURRENT_DATE, 0, 0, 0, 0, 0, 0.0, 0, 0.0, '{}');
