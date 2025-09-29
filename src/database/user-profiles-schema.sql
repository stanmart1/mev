-- User Profiles and Preferences Database Schema Extensions
-- This script extends the existing user management schema with profile and preference features

-- User profiles table for storing user preferences and settings
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Alert and notification preferences
    alert_thresholds JSONB DEFAULT '{
        "mev_opportunity": {"min_profit_sol": 0.1, "max_risk_score": 5},
        "validator_performance": {"min_mev_earnings": 1.0, "uptime_threshold": 95},
        "price_change": {"percentage_threshold": 5.0},
        "liquidation_risk": {"health_factor_threshold": 1.2}
    }'::jsonb,
    
    -- Favorite validators list
    favorite_validators TEXT[] DEFAULT '{}',
    
    -- Dashboard and UI preferences
    dashboard_preferences JSONB DEFAULT '{
        "theme": "dark",
        "default_timeframe": "24h",
        "charts_auto_refresh": true,
        "notifications_enabled": true,
        "show_risk_warnings": true,
        "preferred_currency": "SOL"
    }'::jsonb,
    
    -- Notification preferences
    notification_preferences JSONB DEFAULT '{
        "email_enabled": true,
        "push_enabled": false,
        "sms_enabled": false,
        "webhook_url": null,
        "frequency": "immediate"
    }'::jsonb,
    
    -- Trading and analysis preferences
    trading_preferences JSONB DEFAULT '{
        "default_slippage": 0.5,
        "max_gas_fee": 0.01,
        "auto_compound": false,
        "risk_tolerance": "medium"
    }'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Saved simulations table for storing user's simulation scenarios
CREATE TABLE IF NOT EXISTS saved_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Simulation metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    simulation_type VARCHAR(50) NOT NULL, -- 'arbitrage', 'liquidation', 'bundle', 'validator_delegation'
    
    -- Simulation parameters and configuration
    parameters JSONB NOT NULL,
    
    -- Results from last run (if any)
    results JSONB,
    last_run_at TIMESTAMP WITH TIME ZONE,
    
    -- Sharing and collaboration
    is_public BOOLEAN DEFAULT false,
    shared_with TEXT[] DEFAULT '{}', -- User IDs who have access
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User alert settings table for granular alert management
CREATE TABLE IF NOT EXISTS user_alert_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Alert configuration
    alert_type VARCHAR(50) NOT NULL, -- 'mev_opportunity', 'validator_performance', 'price_alert', etc.
    alert_name VARCHAR(255) NOT NULL,
    
    -- Threshold and conditions
    threshold_value DECIMAL(20,8),
    threshold_operator VARCHAR(10) DEFAULT '>=', -- '>=', '<=', '=', '>', '<'
    conditions JSONB DEFAULT '{}',
    
    -- Alert behavior
    is_enabled BOOLEAN DEFAULT true,
    cooldown_minutes INTEGER DEFAULT 15, -- Minimum time between alerts
    
    -- Notification channels
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT false,
    webhook_enabled BOOLEAN DEFAULT false,
    
    -- Tracking
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, alert_type, alert_name)
);

-- Password recovery tokens table for secure password reset flows
CREATE TABLE IF NOT EXISTS password_recovery_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token data
    token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of the actual token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Security tracking
    ip_address INET,
    user_agent TEXT,
    
    -- Usage tracking
    used_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(token_hash)
);

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token data
    token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of the actual token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Email being verified
    email VARCHAR(255) NOT NULL,
    
    -- Usage tracking
    verified_at TIMESTAMP WITH TIME ZONE,
    is_verified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(token_hash)
);

-- User activity log for security and audit purposes
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    endpoint VARCHAR(255),
    
    -- Additional data
    metadata JSONB DEFAULT '{}',
    
    -- Security flags
    is_suspicious BOOLEAN DEFAULT false,
    risk_score INTEGER DEFAULT 0, -- 0-100
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User watchlists for tracking specific validators, tokens, or opportunities
CREATE TABLE IF NOT EXISTS user_watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Watchlist metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    watchlist_type VARCHAR(50) NOT NULL, -- 'validators', 'tokens', 'opportunities'
    
    -- Items being watched
    items JSONB NOT NULL DEFAULT '[]',
    
    -- Configuration
    alert_enabled BOOLEAN DEFAULT true,
    auto_refresh BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Account security settings
CREATE TABLE IF NOT EXISTS user_security_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Two-factor authentication
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(32), -- Base32 encoded secret
    backup_codes TEXT[], -- Encrypted backup codes
    
    -- Login security
    login_alerts_enabled BOOLEAN DEFAULT true,
    allowed_ips INET[] DEFAULT '{}', -- IP whitelist (empty = all allowed)
    
    -- Session management
    max_concurrent_sessions INTEGER DEFAULT 5,
    session_timeout_minutes INTEGER DEFAULT 1440, -- 24 hours
    
    -- Password policy
    password_expires_days INTEGER DEFAULT 0, -- 0 = never expires
    last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_simulations_user_id ON saved_simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_simulations_type ON saved_simulations(simulation_type);
CREATE INDEX IF NOT EXISTS idx_saved_simulations_public ON saved_simulations(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_user_alert_settings_user_id ON user_alert_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alert_settings_enabled ON user_alert_settings(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_password_recovery_tokens_hash ON password_recovery_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_recovery_tokens_expires ON password_recovery_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_suspicious ON user_activity_log(is_suspicious) WHERE is_suspicious = true;
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON user_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlists_type ON user_watchlists(watchlist_type);
CREATE INDEX IF NOT EXISTS idx_user_security_settings_user_id ON user_security_settings(user_id);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_simulations_updated_at 
    BEFORE UPDATE ON saved_simulations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_alert_settings_updated_at 
    BEFORE UPDATE ON user_alert_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_watchlists_updated_at 
    BEFORE UPDATE ON user_watchlists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_security_settings_updated_at 
    BEFORE UPDATE ON user_security_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default profile for existing users
INSERT INTO user_profiles (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Insert default security settings for existing users
INSERT INTO user_security_settings (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM user_security_settings)
ON CONFLICT (user_id) DO NOTHING;