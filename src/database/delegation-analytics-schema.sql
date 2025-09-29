-- Delegation Analytics Database Schema
-- Schema for storing validator scores, recommendations, and user delegation preferences

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===================================================================
-- VALIDATOR SCORES AND ANALYTICS TABLES
-- ===================================================================

-- Table for storing comprehensive validator scores
CREATE TABLE IF NOT EXISTS validator_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validator_id VARCHAR(44) NOT NULL, -- Validator vote account address
    
    -- Composite scores
    composite_score DECIMAL(4,3) NOT NULL DEFAULT 0, -- Overall weighted score (0-1)
    composite_percentile DECIMAL(5,2) DEFAULT 0, -- Percentile ranking (0-100)
    
    -- Individual component scores (0-1 scale)
    mev_score DECIMAL(4,3) NOT NULL DEFAULT 0,
    reliability_score DECIMAL(4,3) NOT NULL DEFAULT 0,
    commission_score DECIMAL(4,3) NOT NULL DEFAULT 0,
    decentralization_score DECIMAL(4,3) NOT NULL DEFAULT 0,
    consistency_score DECIMAL(4,3) NOT NULL DEFAULT 0,
    
    -- Risk assessments
    risk_penalty DECIMAL(4,3) NOT NULL DEFAULT 0,
    risk_factors JSONB DEFAULT '{}', -- Detailed risk breakdown
    
    -- Score breakdowns for transparency
    mev_breakdown JSONB DEFAULT '{}',
    reliability_breakdown JSONB DEFAULT '{}',
    commission_breakdown JSONB DEFAULT '{}',
    decentralization_breakdown JSONB DEFAULT '{}',
    consistency_breakdown JSONB DEFAULT '{}',
    
    -- Data quality and confidence
    data_quality_score DECIMAL(4,3) DEFAULT 0,
    confidence_level DECIMAL(4,3) DEFAULT 0,
    epochs_analyzed INTEGER DEFAULT 0,
    
    -- Timestamps
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    calculation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(validator_id)
);

-- Indexes for validator_scores
CREATE INDEX idx_validator_scores_composite ON validator_scores(composite_score DESC);
CREATE INDEX idx_validator_scores_mev ON validator_scores(mev_score DESC);
CREATE INDEX idx_validator_scores_reliability ON validator_scores(reliability_score DESC);
CREATE INDEX idx_validator_scores_validator_id ON validator_scores(validator_id);
CREATE INDEX idx_validator_scores_updated ON validator_scores(last_updated);

-- ===================================================================
-- USER DELEGATION PREFERENCES AND HISTORY
-- ===================================================================

-- Table for storing user delegation preferences
CREATE TABLE IF NOT EXISTS user_delegation_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Strategy and risk preferences
    preferred_strategy VARCHAR(50) DEFAULT 'balanced', -- maximize_mev, maximize_safety, support_decentralization, cost_optimize, balanced
    risk_tolerance VARCHAR(20) DEFAULT 'balanced', -- conservative, balanced, aggressive
    
    -- Custom scoring weights (must sum to 1.0)
    custom_weights JSONB DEFAULT '{
        "mevPotential": 0.25,
        "reliability": 0.25,
        "commissionOptimization": 0.20,
        "stakeDecentralization": 0.15,
        "performanceConsistency": 0.15
    }',
    
    -- Filtering criteria
    custom_filters JSONB DEFAULT '{
        "maxCommission": 0.10,
        "minUptimePercentage": 95.0,
        "maxStakeConcentration": 0.03,
        "minEpochsActive": 10
    }',
    
    -- Delegation goals and preferences
    delegation_goals JSONB DEFAULT '{}', -- e.g., {"target_yield": 0.08, "max_validators": 10}
    notification_preferences JSONB DEFAULT '{
        "score_changes": true,
        "new_recommendations": true,
        "validator_alerts": true
    }',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Index for user delegation preferences
CREATE INDEX idx_user_delegation_prefs_user_id ON user_delegation_preferences(user_id);

-- ===================================================================
-- USER DELEGATIONS AND HISTORY
-- ===================================================================

-- Table for tracking user's current delegations
CREATE TABLE IF NOT EXISTS user_delegations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    validator_address VARCHAR(44) NOT NULL,
    
    -- Delegation details
    stake_amount BIGINT NOT NULL, -- Amount delegated in lamports
    delegation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Transaction details
    delegation_tx_signature VARCHAR(88), -- Solana transaction signature
    
    -- Performance tracking
    initial_validator_score DECIMAL(4,3), -- Score at time of delegation
    current_validator_score DECIMAL(4,3), -- Most recent score
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_delegations
CREATE INDEX idx_user_delegations_user_id ON user_delegations(user_id);
CREATE INDEX idx_user_delegations_validator ON user_delegations(validator_address);
CREATE INDEX idx_user_delegations_active ON user_delegations(is_active);

-- Table for historical delegation performance
CREATE TABLE IF NOT EXISTS user_delegation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    validator_address VARCHAR(44) NOT NULL,
    
    -- Time period
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    epoch_start INTEGER NOT NULL,
    epoch_end INTEGER,
    
    -- Performance metrics
    stake_amount BIGINT NOT NULL,
    total_rewards BIGINT DEFAULT 0, -- Total rewards in lamports
    mev_rewards BIGINT DEFAULT 0, -- MEV-specific rewards
    delegation_return DECIMAL(8,6) DEFAULT 0, -- Return rate (0-1)
    
    -- Validator performance during period
    avg_validator_score DECIMAL(4,3),
    commission_rate DECIMAL(4,3),
    uptime_percentage DECIMAL(5,2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for delegation history
CREATE INDEX idx_delegation_history_user_id ON user_delegation_history(user_id);
CREATE INDEX idx_delegation_history_validator ON user_delegation_history(validator_address);
CREATE INDEX idx_delegation_history_period ON user_delegation_history(start_date, end_date);

-- ===================================================================
-- VALIDATOR RECOMMENDATIONS AND TRACKING
-- ===================================================================

-- Table for storing generated recommendations
CREATE TABLE IF NOT EXISTS validator_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    validator_address VARCHAR(44) NOT NULL,
    
    -- Recommendation details
    personalized_score DECIMAL(4,3) NOT NULL,
    base_score DECIMAL(4,3) NOT NULL,
    recommendation_rank INTEGER NOT NULL,
    
    -- Scoring breakdown
    score_components JSONB NOT NULL, -- Individual score components
    personalization_factors JSONB DEFAULT '{}', -- Factors that influenced personalization
    
    -- Recommendation context
    strategy_used VARCHAR(50) NOT NULL,
    risk_tolerance VARCHAR(20) NOT NULL,
    recommendation_reason TEXT,
    
    -- Performance projections
    estimated_apy DECIMAL(5,2), -- Estimated annual percentage yield
    confidence_level DECIMAL(4,1), -- Confidence in estimate (0-100)
    risk_assessment JSONB DEFAULT '{}',
    
    -- Tracking
    is_accepted BOOLEAN DEFAULT NULL, -- NULL = not acted upon, true = delegated, false = rejected
    accepted_at TIMESTAMP WITH TIME ZONE,
    acceptance_amount BIGINT, -- Amount delegated if accepted
    
    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes for recommendations
CREATE INDEX idx_recommendations_user_id ON validator_recommendations(user_id);
CREATE INDEX idx_recommendations_validator ON validator_recommendations(validator_address);
CREATE INDEX idx_recommendations_generated ON validator_recommendations(generated_at);
CREATE INDEX idx_recommendations_score ON validator_recommendations(personalized_score DESC);
CREATE INDEX idx_recommendations_active ON validator_recommendations(expires_at) WHERE expires_at > NOW();

-- ===================================================================
-- DELEGATION ANALYTICS INSIGHTS
-- ===================================================================

-- Table for storing portfolio-level insights
CREATE TABLE IF NOT EXISTS delegation_portfolio_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Portfolio metrics
    total_delegated_amount BIGINT NOT NULL DEFAULT 0,
    validator_count INTEGER NOT NULL DEFAULT 0,
    portfolio_score DECIMAL(4,3) NOT NULL DEFAULT 0,
    
    -- Risk metrics
    portfolio_risk_score DECIMAL(4,3) DEFAULT 0,
    diversification_score DECIMAL(4,3) DEFAULT 0,
    concentration_risk DECIMAL(4,3) DEFAULT 0,
    
    -- Performance metrics
    estimated_portfolio_apy DECIMAL(5,2) DEFAULT 0,
    realized_apy DECIMAL(5,2) DEFAULT 0, -- Historical performance if available
    mev_contribution DECIMAL(5,2) DEFAULT 0,
    
    -- Insights and recommendations
    insights JSONB DEFAULT '{}', -- Portfolio analysis insights
    optimization_suggestions JSONB DEFAULT '[]', -- Suggestions for improvement
    rebalancing_recommendations JSONB DEFAULT '[]', -- Specific rebalancing actions
    
    -- Timestamps
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_analysis_due TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for portfolio insights
CREATE INDEX idx_portfolio_insights_user_id ON delegation_portfolio_insights(user_id);
CREATE INDEX idx_portfolio_insights_analysis_date ON delegation_portfolio_insights(analysis_date);

-- ===================================================================
-- NETWORK-LEVEL DELEGATION ANALYTICS
-- ===================================================================

-- Table for network-wide delegation statistics
CREATE TABLE IF NOT EXISTS network_delegation_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time period
    epoch INTEGER NOT NULL,
    analysis_date DATE NOT NULL,
    
    -- Network metrics
    total_stake_amount BIGINT NOT NULL,
    total_validators INTEGER NOT NULL,
    active_validators INTEGER NOT NULL,
    jito_enabled_validators INTEGER DEFAULT 0,
    
    -- Concentration metrics
    nakamoto_coefficient INTEGER,
    gini_coefficient DECIMAL(4,3), -- Stake distribution inequality
    top_10_stake_percentage DECIMAL(5,2), -- Percentage of stake in top 10 validators
    top_33_stake_percentage DECIMAL(5,2), -- Percentage of stake in top 33 validators
    
    -- Performance metrics
    network_avg_commission DECIMAL(4,3),
    network_avg_uptime DECIMAL(5,2),
    total_mev_rewards BIGINT DEFAULT 0,
    
    -- MEV statistics
    mev_enabled_stake_percentage DECIMAL(5,2) DEFAULT 0,
    avg_mev_yield DECIMAL(5,3) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(epoch, analysis_date)
);

-- Index for network stats
CREATE INDEX idx_network_stats_epoch ON network_delegation_stats(epoch DESC);
CREATE INDEX idx_network_stats_date ON network_delegation_stats(analysis_date DESC);

-- ===================================================================
-- VALIDATOR PERFORMANCE TRENDS
-- ===================================================================

-- Table for tracking validator performance trends
CREATE TABLE IF NOT EXISTS validator_performance_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validator_address VARCHAR(44) NOT NULL,
    
    -- Time series data
    trend_period VARCHAR(20) NOT NULL, -- '7d', '30d', '90d', '365d'
    data_points JSONB NOT NULL, -- Array of time-series data points
    
    -- Trend analysis
    score_trend DECIMAL(4,3), -- Positive = improving, negative = declining
    volatility DECIMAL(4,3), -- Score volatility measure
    consistency_rating DECIMAL(4,3), -- How consistent the validator performance is
    
    -- Performance indicators
    mev_trend DECIMAL(4,3),
    reliability_trend DECIMAL(4,3),
    commission_stability DECIMAL(4,3),
    
    -- Predictions (if available)
    predicted_next_score DECIMAL(4,3),
    prediction_confidence DECIMAL(4,3),
    
    -- Timestamps
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(validator_address, trend_period)
);

-- Indexes for performance trends
CREATE INDEX idx_performance_trends_validator ON validator_performance_trends(validator_address);
CREATE INDEX idx_performance_trends_period ON validator_performance_trends(trend_period);
CREATE INDEX idx_performance_trends_updated ON validator_performance_trends(last_updated);

-- ===================================================================
-- TRIGGERS AND FUNCTIONS
-- ===================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_user_delegation_preferences_updated_at 
    BEFORE UPDATE ON user_delegation_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_delegations_updated_at 
    BEFORE UPDATE ON user_delegations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically clean up expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM validator_recommendations 
    WHERE expires_at < NOW() - INTERVAL '30 days'
    AND is_accepted IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- VIEWS FOR COMMON QUERIES
-- ===================================================================

-- View for top validators by composite score
CREATE OR REPLACE VIEW top_validators_by_score AS
SELECT 
    vs.validator_address,
    vs.composite_score,
    vs.composite_percentile,
    vs.mev_score,
    vs.reliability_score,
    vs.commission_score,
    vs.decentralization_score,
    vs.consistency_score,
    vs.risk_penalty,
    vs.confidence_level,
    vs.last_updated
FROM validator_scores vs
WHERE vs.last_updated > NOW() - INTERVAL '24 hours'
ORDER BY vs.composite_score DESC;

-- View for user portfolio summary
CREATE OR REPLACE VIEW user_portfolio_summary AS
SELECT 
    ud.user_id,
    COUNT(ud.validator_address) as validator_count,
    SUM(ud.stake_amount) as total_stake_amount,
    AVG(ud.current_validator_score) as avg_validator_score,
    COALESCE(udp.preferred_strategy, 'balanced') as strategy,
    COALESCE(udp.risk_tolerance, 'balanced') as risk_tolerance
FROM user_delegations ud
LEFT JOIN user_delegation_preferences udp ON ud.user_id = udp.user_id
WHERE ud.is_active = true
GROUP BY ud.user_id, udp.preferred_strategy, udp.risk_tolerance;

-- View for validator recommendation summary
CREATE OR REPLACE VIEW active_recommendations_summary AS
SELECT 
    vr.user_id,
    vr.validator_address,
    vr.personalized_score,
    vr.recommendation_rank,
    vr.strategy_used,
    vr.estimated_apy,
    vr.confidence_level,
    vr.generated_at,
    vs.composite_score as current_validator_score,
    vs.reliability_score,
    vs.mev_score
FROM validator_recommendations vr
JOIN validator_scores vs ON vr.validator_address = vs.validator_id
WHERE vr.expires_at > NOW()
AND vr.is_accepted IS NULL
ORDER BY vr.user_id, vr.recommendation_rank;

-- ===================================================================
-- INITIAL DATA AND CONSTRAINTS
-- ===================================================================

-- Add constraints for data validation
ALTER TABLE validator_scores 
ADD CONSTRAINT check_scores_range 
CHECK (
    composite_score >= 0 AND composite_score <= 1 AND
    mev_score >= 0 AND mev_score <= 1 AND
    reliability_score >= 0 AND reliability_score <= 1 AND
    commission_score >= 0 AND commission_score <= 1 AND
    decentralization_score >= 0 AND decentralization_score <= 1 AND
    consistency_score >= 0 AND consistency_score <= 1 AND
    risk_penalty >= 0 AND risk_penalty <= 1 AND
    confidence_level >= 0 AND confidence_level <= 1
);

ALTER TABLE user_delegations 
ADD CONSTRAINT check_stake_amount_positive 
CHECK (stake_amount > 0);

ALTER TABLE validator_recommendations 
ADD CONSTRAINT check_recommendation_scores 
CHECK (
    personalized_score >= 0 AND personalized_score <= 1 AND
    base_score >= 0 AND base_score <= 1 AND
    recommendation_rank > 0
);

-- Add comments for documentation
COMMENT ON TABLE validator_scores IS 'Comprehensive scoring data for all validators including MEV potential, reliability, and risk assessments';
COMMENT ON TABLE user_delegation_preferences IS 'User-specific preferences for delegation strategy, risk tolerance, and custom scoring weights';
COMMENT ON TABLE user_delegations IS 'Current active delegations for each user with performance tracking';
COMMENT ON TABLE validator_recommendations IS 'Personalized validator recommendations generated for users based on their preferences';
COMMENT ON TABLE delegation_portfolio_insights IS 'Portfolio-level analysis and optimization suggestions for user delegations';

-- Create indexes for full-text search on recommendation reasons
CREATE INDEX idx_recommendations_reason_gin ON validator_recommendations USING gin(to_tsvector('english', recommendation_reason));

-- ===================================================================
-- MAINTENANCE PROCEDURES
-- ===================================================================

-- Procedure to update all validator percentiles
CREATE OR REPLACE FUNCTION update_validator_percentiles()
RETURNS VOID AS $$
BEGIN
    WITH percentile_ranks AS (
        SELECT 
            validator_id,
            PERCENT_RANK() OVER (ORDER BY composite_score) * 100 as new_percentile
        FROM validator_scores
        WHERE last_updated > NOW() - INTERVAL '24 hours'
    )
    UPDATE validator_scores vs
    SET composite_percentile = pr.new_percentile
    FROM percentile_ranks pr
    WHERE vs.validator_id = pr.validator_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure to archive old delegation history
CREATE OR REPLACE FUNCTION archive_old_delegation_history()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Archive delegation history older than 2 years to separate archive table
    INSERT INTO user_delegation_history_archive 
    SELECT * FROM user_delegation_history 
    WHERE end_date < NOW() - INTERVAL '2 years';
    
    DELETE FROM user_delegation_history 
    WHERE end_date < NOW() - INTERVAL '2 years';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- SAMPLE DATA INSERTIONS (for testing)
-- ===================================================================

-- Insert sample risk tolerance configurations
INSERT INTO user_delegation_preferences (user_id, preferred_strategy, risk_tolerance, custom_weights, custom_filters) 
VALUES 
    ('sample-user-1', 'maximize_mev', 'aggressive', 
     '{"mevPotential": 0.40, "reliability": 0.20, "commissionOptimization": 0.15, "stakeDecentralization": 0.10, "performanceConsistency": 0.15}',
     '{"maxCommission": 0.15, "minUptimePercentage": 90.0, "maxStakeConcentration": 0.05, "minEpochsActive": 5}'),
    ('sample-user-2', 'maximize_safety', 'conservative',
     '{"mevPotential": 0.15, "reliability": 0.35, "commissionOptimization": 0.25, "stakeDecentralization": 0.15, "performanceConsistency": 0.10}',
     '{"maxCommission": 0.08, "minUptimePercentage": 98.0, "maxStakeConcentration": 0.02, "minEpochsActive": 20}')
ON CONFLICT (user_id) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mev_analytics_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mev_analytics_service;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mev_analytics_service;

-- ===================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ===================================================================

-- Additional indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_validator_scores_composite_mev 
ON validator_scores(composite_score DESC, mev_score DESC) 
WHERE last_updated > NOW() - INTERVAL '24 hours';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendations_user_score 
ON validator_recommendations(user_id, personalized_score DESC) 
WHERE expires_at > NOW();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delegation_history_performance 
ON user_delegation_history(user_id, delegation_return DESC) 
WHERE end_date > NOW() - INTERVAL '12 months';

-- Vacuum and analyze for performance
VACUUM ANALYZE validator_scores;
VACUUM ANALYZE user_delegation_preferences;
VACUUM ANALYZE validator_recommendations;

-- Final verification queries
SELECT 'Delegation Analytics Schema Setup Complete' as status,
       COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%delegation%' OR table_name LIKE '%validator%';