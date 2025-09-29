-- MEV Analytics Database Schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- MEV Opportunities Table
CREATE TABLE mev_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_type VARCHAR(50) NOT NULL, -- 'arbitrage', 'liquidation', 'sandwich'
    detection_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    block_slot BIGINT NOT NULL,
    signature VARCHAR(88), -- Solana transaction signature
    
    -- DEX information
    primary_dex VARCHAR(50) NOT NULL, -- 'raydium', 'orca', 'serum'
    secondary_dex VARCHAR(50), -- for arbitrage opportunities
    
    -- Token information
    token_mint_a VARCHAR(44) NOT NULL, -- base token mint
    token_mint_b VARCHAR(44) NOT NULL, -- quote token mint
    token_symbol_a VARCHAR(20),
    token_symbol_b VARCHAR(20),
    
    -- Price and volume data
    price_a DECIMAL(20, 8), -- price on primary DEX
    price_b DECIMAL(20, 8), -- price on secondary DEX (for arbitrage)
    volume_usd DECIMAL(20, 2),
    
    -- Profit calculations
    estimated_profit_sol DECIMAL(20, 8),
    estimated_profit_usd DECIMAL(20, 2),
    gas_cost_sol DECIMAL(20, 8),
    net_profit_sol DECIMAL(20, 8),
    profit_percentage DECIMAL(8, 4),
    
    -- Risk metrics
    slippage_estimate DECIMAL(8, 4),
    execution_risk_score INTEGER CHECK (execution_risk_score >= 1 AND execution_risk_score <= 10),
    competition_probability DECIMAL(4, 3), -- 0.000 to 1.000
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'detected', -- 'detected', 'executed', 'failed', 'expired'
    executed_at TIMESTAMP WITH TIME ZONE,
    actual_profit_sol DECIMAL(20, 8),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Validator Performance Table
CREATE TABLE validator_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validator_pubkey VARCHAR(44) NOT NULL,
    validator_name VARCHAR(100),
    
    -- Epoch information
    epoch BIGINT NOT NULL,
    epoch_start_time TIMESTAMP WITH TIME ZONE,
    epoch_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Stake information
    total_stake_sol DECIMAL(20, 8),
    stake_rank INTEGER,
    commission_rate DECIMAL(5, 4), -- 0.0000 to 1.0000
    
    -- Performance metrics
    blocks_produced INTEGER DEFAULT 0,
    blocks_expected INTEGER DEFAULT 0,
    skip_rate DECIMAL(5, 4), -- percentage of skipped blocks
    
    -- MEV metrics
    mev_rewards_sol DECIMAL(20, 8) DEFAULT 0,
    regular_rewards_sol DECIMAL(20, 8) DEFAULT 0,
    total_rewards_sol DECIMAL(20, 8) DEFAULT 0,
    mev_efficiency_score DECIMAL(5, 2), -- 0.00 to 100.00
    
    -- Jito integration
    is_jito_enabled BOOLEAN DEFAULT FALSE,
    jito_bundle_count INTEGER DEFAULT 0,
    jito_success_rate DECIMAL(5, 4),
    
    -- Rankings
    performance_rank INTEGER,
    mev_rank INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(validator_pubkey, epoch)
);

-- Searcher Analytics Table
CREATE TABLE searcher_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    searcher_pubkey VARCHAR(44) NOT NULL,
    searcher_name VARCHAR(100),
    
    -- Time period
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
    
    -- Activity metrics
    opportunities_detected INTEGER DEFAULT 0,
    opportunities_attempted INTEGER DEFAULT 0,
    opportunities_successful INTEGER DEFAULT 0,
    success_rate DECIMAL(5, 4), -- 0.0000 to 1.0000
    
    -- Profit metrics
    total_profit_sol DECIMAL(20, 8) DEFAULT 0,
    total_profit_usd DECIMAL(20, 2) DEFAULT 0,
    average_profit_per_trade_sol DECIMAL(20, 8),
    best_trade_profit_sol DECIMAL(20, 8),
    worst_trade_profit_sol DECIMAL(20, 8),
    
    -- Strategy breakdown
    arbitrage_count INTEGER DEFAULT 0,
    arbitrage_profit_sol DECIMAL(20, 8) DEFAULT 0,
    liquidation_count INTEGER DEFAULT 0,
    liquidation_profit_sol DECIMAL(20, 8) DEFAULT 0,
    sandwich_count INTEGER DEFAULT 0,
    sandwich_profit_sol DECIMAL(20, 8) DEFAULT 0,
    
    -- Gas and costs
    total_gas_cost_sol DECIMAL(20, 8) DEFAULT 0,
    net_profit_sol DECIMAL(20, 8) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(searcher_pubkey, period_start, period_end, period_type)
);

-- MEV Bundles Table
CREATE TABLE mev_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_id VARCHAR(100) NOT NULL UNIQUE,
    transaction_count INTEGER NOT NULL,
    
    -- Bundle composition
    bundle_strategy VARCHAR(50), -- 'greedy', 'balanced', 'risk_averse', 'diversified', 'synergistic'
    composition_algorithm VARCHAR(50),
    optimization_passes INTEGER DEFAULT 1,
    
    -- Financial metrics
    estimated_profit_sol DECIMAL(20, 8) NOT NULL,
    estimated_gas_cost_sol DECIMAL(20, 8) NOT NULL,
    net_profit_sol DECIMAL(20, 8) GENERATED ALWAYS AS (estimated_profit_sol - estimated_gas_cost_sol) STORED,
    gas_efficiency DECIMAL(10, 4), -- profit to gas ratio
    
    -- Risk metrics
    average_risk_score DECIMAL(4, 2) CHECK (average_risk_score >= 1.0 AND average_risk_score <= 10.0),
    confidence_level DECIMAL(4, 3) CHECK (confidence_level >= 0.0 AND confidence_level <= 1.0),
    overall_risk_level VARCHAR(20), -- 'LOW', 'MODERATE', 'HIGH', 'EXTREME'
    
    -- Bundle execution plan
    execution_plan JSONB, -- JSON containing step-by-step execution details
    estimated_execution_time_ms INTEGER,
    
    -- Status and timestamps
    bundle_status VARCHAR(20) DEFAULT 'constructed', -- 'constructed', 'optimized', 'executed', 'failed', 'cancelled'
    construction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Actual execution results (populated after execution)
    actual_profit_sol DECIMAL(20, 8),
    actual_gas_cost_sol DECIMAL(20, 8),
    actual_execution_time_ms INTEGER,
    execution_success_rate DECIMAL(4, 3), -- percentage of transactions that succeeded
    
    -- Bundle composition metadata
    unique_dex_count INTEGER, -- number of different DEXs used
    unique_strategy_count INTEGER, -- number of different MEV strategies
    token_diversity_score DECIMAL(4, 3), -- measure of token diversity
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bundle Transactions Table (details of individual transactions in bundles)
CREATE TABLE bundle_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_id UUID NOT NULL REFERENCES mev_bundles(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_index INTEGER NOT NULL, -- order within bundle
    opportunity_id UUID REFERENCES mev_opportunities(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'arbitrage', 'liquidation', 'sandwich', 'flashloan'
    
    -- DEX and token information
    primary_dex VARCHAR(50) NOT NULL,
    secondary_dex VARCHAR(50),
    token_mint_a VARCHAR(44) NOT NULL,
    token_mint_b VARCHAR(44) NOT NULL,
    
    -- Financial details
    individual_profit_sol DECIMAL(20, 8),
    individual_gas_cost_sol DECIMAL(20, 8),
    transaction_value_usd DECIMAL(20, 2),
    
    -- Risk and execution
    risk_score DECIMAL(4, 2),
    estimated_slippage DECIMAL(8, 4),
    priority_fee_sol DECIMAL(20, 8),
    
    -- Dependencies
    depends_on_transaction_index INTEGER[], -- array of transaction indexes this depends on
    
    -- Execution results
    execution_signature VARCHAR(88), -- actual transaction signature after execution
    execution_status VARCHAR(20), -- 'pending', 'success', 'failed'
    actual_profit_sol DECIMAL(20, 8),
    actual_gas_used_sol DECIMAL(20, 8),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(bundle_id, transaction_index)
);

-- Historical Bundle Data Table
CREATE TABLE bundle_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_id VARCHAR(100), -- Jito bundle ID
    block_slot BIGINT NOT NULL,
    block_hash VARCHAR(44),
    
    -- Bundle information
    transaction_count INTEGER NOT NULL,
    total_compute_units BIGINT,
    bundle_fee_sol DECIMAL(20, 8),
    tip_amount_sol DECIMAL(20, 8),
    
    -- MEV information
    mev_type VARCHAR(50), -- primary MEV strategy in bundle
    estimated_mev_value_sol DECIMAL(20, 8),
    actual_mev_value_sol DECIMAL(20, 8),
    
    -- Execution details
    submission_time TIMESTAMP WITH TIME ZONE,
    execution_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20), -- 'pending', 'included', 'failed', 'dropped'
    
    -- Performance metrics
    execution_latency_ms INTEGER,
    confirmation_time_ms INTEGER,
    
    -- Associated searcher
    searcher_pubkey VARCHAR(44),
    validator_pubkey VARCHAR(44),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DEX Price Data Table (for historical analysis)
CREATE TABLE dex_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dex_name VARCHAR(50) NOT NULL,
    token_mint_a VARCHAR(44) NOT NULL,
    token_mint_b VARCHAR(44) NOT NULL,
    token_symbol_a VARCHAR(20),
    token_symbol_b VARCHAR(20),
    
    price DECIMAL(20, 8) NOT NULL,
    volume_24h_usd DECIMAL(20, 2),
    liquidity_usd DECIMAL(20, 2),
    
    block_slot BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    pool_address VARCHAR(44),
    program_id VARCHAR(44)
);

-- Market Metrics Table (aggregated data)
CREATE TABLE market_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE NOT NULL,
    
    -- Overall MEV metrics
    total_mev_extracted_sol DECIMAL(20, 8) DEFAULT 0,
    total_mev_extracted_usd DECIMAL(20, 2) DEFAULT 0,
    total_opportunities_detected INTEGER DEFAULT 0,
    total_opportunities_executed INTEGER DEFAULT 0,
    
    -- By strategy
    arbitrage_volume_sol DECIMAL(20, 8) DEFAULT 0,
    liquidation_volume_sol DECIMAL(20, 8) DEFAULT 0,
    sandwich_volume_sol DECIMAL(20, 8) DEFAULT 0,
    
    -- Validator metrics
    active_validators INTEGER DEFAULT 0,
    jito_enabled_validators INTEGER DEFAULT 0,
    average_mev_efficiency DECIMAL(5, 2),
    
    -- Network metrics
    total_transactions BIGINT DEFAULT 0,
    mev_transaction_percentage DECIMAL(5, 4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(metric_date)
);

-- Indexes for performance optimization
CREATE INDEX idx_mev_opportunities_timestamp ON mev_opportunities(detection_timestamp);
CREATE INDEX idx_mev_opportunities_type ON mev_opportunities(opportunity_type);
CREATE INDEX idx_mev_opportunities_status ON mev_opportunities(status);
CREATE INDEX idx_mev_opportunities_profit ON mev_opportunities(estimated_profit_sol DESC);
CREATE INDEX idx_mev_opportunities_tokens ON mev_opportunities(token_mint_a, token_mint_b);

CREATE INDEX idx_validator_performance_epoch ON validator_performance(epoch);
CREATE INDEX idx_validator_performance_pubkey ON validator_performance(validator_pubkey);
CREATE INDEX idx_validator_performance_mev_rank ON validator_performance(mev_rank);

CREATE INDEX idx_searcher_analytics_pubkey ON searcher_analytics(searcher_pubkey);
CREATE INDEX idx_searcher_analytics_period ON searcher_analytics(period_start, period_end);
CREATE INDEX idx_searcher_analytics_profit ON searcher_analytics(total_profit_sol DESC);

CREATE INDEX idx_mev_bundles_timestamp ON mev_bundles(construction_timestamp);
CREATE INDEX idx_mev_bundles_status ON mev_bundles(bundle_status);
CREATE INDEX idx_mev_bundles_strategy ON mev_bundles(bundle_strategy);
CREATE INDEX idx_mev_bundles_profit ON mev_bundles(estimated_profit_sol DESC);
CREATE INDEX idx_mev_bundles_risk ON mev_bundles(average_risk_score);
CREATE INDEX idx_mev_bundles_efficiency ON mev_bundles(gas_efficiency DESC);

CREATE INDEX idx_bundle_transactions_bundle_id ON bundle_transactions(bundle_id);
CREATE INDEX idx_bundle_transactions_index ON bundle_transactions(bundle_id, transaction_index);
CREATE INDEX idx_bundle_transactions_type ON bundle_transactions(transaction_type);
CREATE INDEX idx_bundle_transactions_dex ON bundle_transactions(primary_dex);
CREATE INDEX idx_bundle_transactions_status ON bundle_transactions(execution_status);

CREATE INDEX idx_bundle_data_slot ON bundle_data(block_slot);
CREATE INDEX idx_bundle_data_status ON bundle_data(status);
CREATE INDEX idx_bundle_data_searcher ON bundle_data(searcher_pubkey);

CREATE INDEX idx_dex_prices_timestamp ON dex_prices(timestamp);
CREATE INDEX idx_dex_prices_tokens ON dex_prices(token_mint_a, token_mint_b);
CREATE INDEX idx_dex_prices_dex ON dex_prices(dex_name);

CREATE INDEX idx_market_metrics_date ON market_metrics(metric_date);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_mev_opportunities_updated_at 
    BEFORE UPDATE ON mev_opportunities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_validator_performance_updated_at 
    BEFORE UPDATE ON validator_performance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_searcher_analytics_updated_at 
    BEFORE UPDATE ON searcher_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Jito Bundle Submissions table
CREATE TABLE IF NOT EXISTS jito_bundle_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_id VARCHAR(100) UNIQUE NOT NULL,
    success_probability DECIMAL(5,4),
    estimated_profit DECIMAL(18,9),
    tip_amount BIGINT,
    priority VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    submission_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmation_timestamp TIMESTAMP WITH TIME ZONE,
    actual_success BOOLEAN,
    actual_latency INTEGER,
    network_congestion DECIMAL(5,4),
    bundle_size INTEGER,
    validator_id VARCHAR(50),
    failure_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jito Batch Submissions table
CREATE TABLE IF NOT EXISTS jito_batch_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id VARCHAR(100) UNIQUE NOT NULL,
    total_bundles INTEGER NOT NULL,
    success_count INTEGER DEFAULT 0,
    total_expected_profit DECIMAL(18,9),
    average_success_rate DECIMAL(5,4),
    batch_optimization_strategy VARCHAR(50),
    total_execution_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jito Performance Metrics table
CREATE TABLE IF NOT EXISTS jito_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accuracy_rate DECIMAL(5,4),
    latency_accuracy DECIMAL(5,4),
    model_confidence DECIMAL(5,4),
    total_predictions INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    false_positives INTEGER DEFAULT 0,
    false_negatives INTEGER DEFAULT 0,
    simulation_success_rate DECIMAL(5,4),
    network_congestion DECIMAL(5,4),
    tip_optimization_effectiveness DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jito Model Training Data table
CREATE TABLE IF NOT EXISTS jito_model_training_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_id VARCHAR(100) NOT NULL,
    features JSONB, -- Store feature vectors for ML model
    predicted_success_rate DECIMAL(5,4),
    actual_success BOOLEAN,
    prediction_confidence DECIMAL(5,4),
    model_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for Jito tables
CREATE INDEX IF NOT EXISTS idx_jito_bundle_submissions_bundle_id ON jito_bundle_submissions(bundle_id);
CREATE INDEX IF NOT EXISTS idx_jito_bundle_submissions_status ON jito_bundle_submissions(status);
CREATE INDEX IF NOT EXISTS idx_jito_bundle_submissions_timestamp ON jito_bundle_submissions(submission_timestamp);
CREATE INDEX IF NOT EXISTS idx_jito_bundle_submissions_success ON jito_bundle_submissions(actual_success);
CREATE INDEX IF NOT EXISTS idx_jito_batch_submissions_batch_id ON jito_batch_submissions(batch_id);
CREATE INDEX IF NOT EXISTS idx_jito_batch_submissions_timestamp ON jito_batch_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_jito_performance_metrics_timestamp ON jito_performance_metrics(metric_timestamp);
CREATE INDEX IF NOT EXISTS idx_jito_model_training_bundle_id ON jito_model_training_data(bundle_id);
CREATE INDEX IF NOT EXISTS idx_jito_model_training_success ON jito_model_training_data(actual_success);

-- Profit Calculations table
CREATE TABLE IF NOT EXISTS profit_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calculation_id VARCHAR(100) UNIQUE NOT NULL,
    opportunity_id UUID,
    
    -- Base profit data
    base_profit DECIMAL(18,9) NOT NULL,
    profit_percentage DECIMAL(8,4),
    volume DECIMAL(18,9),
    
    -- Cost breakdown
    gas_costs DECIMAL(18,9),
    slippage_costs DECIMAL(18,9),
    trading_fees DECIMAL(18,9),
    total_costs DECIMAL(18,9) NOT NULL,
    
    -- Risk assessment
    execution_risk DECIMAL(4,2),
    competition_probability DECIMAL(5,4),
    market_risk DECIMAL(4,2),
    risk_score DECIMAL(4,2) NOT NULL,
    
    -- Final profit estimates
    expected_profit DECIMAL(18,9) NOT NULL,
    risk_adjusted_profit DECIMAL(18,9),
    minimum_profit DECIMAL(18,9),
    maximum_profit DECIMAL(18,9),
    
    -- Confidence intervals
    confidence_level DECIMAL(4,3) DEFAULT 0.95,
    confidence_lower DECIMAL(18,9),
    confidence_upper DECIMAL(18,9),
    confidence_median DECIMAL(18,9),
    
    -- Probabilities
    profitability_probability DECIMAL(5,4),
    success_probability DECIMAL(5,4),
    
    -- Market analysis
    volatility_short_term DECIMAL(8,6),
    volatility_long_term DECIMAL(8,6),
    network_congestion DECIMAL(5,4),
    
    -- Calculation metadata
    monte_carlo_samples INTEGER DEFAULT 10000,
    calculation_time_ms INTEGER,
    model_version VARCHAR(20) DEFAULT '1.0.0',
    
    -- DEX information
    primary_dex VARCHAR(50),
    secondary_dex VARCHAR(50),
    strategy VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profit Calculation Factors table (detailed factor breakdown)
CREATE TABLE IF NOT EXISTS profit_calculation_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calculation_id UUID REFERENCES profit_calculations(id) ON DELETE CASCADE,
    
    factor_type VARCHAR(50) NOT NULL, -- 'gas', 'slippage', 'trading_fee', 'risk', 'competition'
    factor_name VARCHAR(100) NOT NULL,
    factor_value DECIMAL(18,9),
    factor_weight DECIMAL(5,4),
    factor_impact DECIMAL(18,9),
    factor_variance DECIMAL(18,9),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for profit calculation tables
CREATE INDEX IF NOT EXISTS idx_profit_calculations_calculation_id ON profit_calculations(calculation_id);
CREATE INDEX IF NOT EXISTS idx_profit_calculations_expected_profit ON profit_calculations(expected_profit DESC);
CREATE INDEX IF NOT EXISTS idx_profit_calculations_risk_score ON profit_calculations(risk_score);
CREATE INDEX IF NOT EXISTS idx_profit_calculations_timestamp ON profit_calculations(created_at);
CREATE INDEX IF NOT EXISTS idx_profit_calculations_strategy ON profit_calculations(strategy);
CREATE INDEX IF NOT EXISTS idx_profit_calculations_dex ON profit_calculations(primary_dex, secondary_dex);
CREATE INDEX IF NOT EXISTS idx_profit_calculation_factors_calculation_id ON profit_calculation_factors(calculation_id);
CREATE INDEX IF NOT EXISTS idx_profit_calculation_factors_type ON profit_calculation_factors(factor_type);

-- Enhanced Validator Performance tracking tables
CREATE TABLE IF NOT EXISTS enhanced_validator_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validator_address VARCHAR(44) NOT NULL,
    epoch INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    epoch_rewards DECIMAL(20, 9) DEFAULT 0,
    stake_amount DECIMAL(20, 9) DEFAULT 0,
    commission_rate DECIMAL(5, 4) DEFAULT 0,
    is_jito_enabled BOOLEAN DEFAULT false,
    uptime_percentage DECIMAL(5, 2) DEFAULT 0,
    vote_credits INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(validator_address, epoch)
);

-- MEV efficiency metrics table
CREATE TABLE IF NOT EXISTS mev_efficiency_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validator_address VARCHAR(44) NOT NULL,
    epoch INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_jito_enabled BOOLEAN DEFAULT false,
    
    -- Base efficiency metrics
    avg_rewards_per_epoch DECIMAL(20, 9) DEFAULT 0,
    reward_consistency_score DECIMAL(5, 4) DEFAULT 0,
    stake_efficiency_ratio DECIMAL(15, 9) DEFAULT 0,
    commission_optimization_score DECIMAL(5, 4) DEFAULT 0,
    avg_commission_rate DECIMAL(5, 4) DEFAULT 0,
    avg_stake_amount DECIMAL(20, 9) DEFAULT 0,
    
    -- MEV-specific metrics
    mev_capture_rate DECIMAL(5, 4) DEFAULT 0,
    mev_revenue_per_epoch DECIMAL(20, 9) DEFAULT 0,
    mev_efficiency_ratio DECIMAL(10, 6) DEFAULT 0,
    bundle_success_rate DECIMAL(5, 4) DEFAULT 0,
    avg_bundle_value DECIMAL(20, 9) DEFAULT 0,
    mev_consistency_score DECIMAL(5, 4) DEFAULT 0,
    
    -- Comparative metrics
    network_performance_ratio DECIMAL(8, 4) DEFAULT 0,
    type_performance_ratio DECIMAL(8, 4) DEFAULT 0,
    network_rank INTEGER DEFAULT 0,
    type_rank INTEGER DEFAULT 0,
    percentile_rank INTEGER DEFAULT 0,
    
    -- Risk-adjusted metrics
    reward_volatility DECIMAL(15, 9) DEFAULT 0,
    sharpe_ratio DECIMAL(8, 4) DEFAULT 0,
    max_drawdown DECIMAL(5, 4) DEFAULT 0,
    value_at_risk_95 DECIMAL(20, 9) DEFAULT 0,
    risk_adjusted_return DECIMAL(15, 9) DEFAULT 0,
    
    overall_efficiency_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(validator_address, epoch)
);

-- Validator rankings table
CREATE TABLE IF NOT EXISTS validator_rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validator_address VARCHAR(44) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'overall', 'performance', 'efficiency', 'mev', 'reliability'
    rank INTEGER NOT NULL,
    percentile INTEGER DEFAULT 0,
    score DECIMAL(8, 4) DEFAULT 0,
    score_breakdown JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_jito_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(validator_address, category, DATE(timestamp))
);

-- Validator comparison results table
CREATE TABLE IF NOT EXISTS validator_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comparison_type VARCHAR(50) NOT NULL, -- 'jito_vs_regular', 'epoch_analysis', etc.
    epoch_start INTEGER NOT NULL,
    epoch_end INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Jito validator metrics
    jito_validator_count INTEGER DEFAULT 0,
    jito_avg_rewards DECIMAL(20, 9) DEFAULT 0,
    jito_total_stake DECIMAL(20, 9) DEFAULT 0,
    jito_avg_commission DECIMAL(5, 4) DEFAULT 0,
    jito_performance_variance DECIMAL(15, 9) DEFAULT 0,
    
    -- Regular validator metrics
    regular_validator_count INTEGER DEFAULT 0,
    regular_avg_rewards DECIMAL(20, 9) DEFAULT 0,
    regular_total_stake DECIMAL(20, 9) DEFAULT 0,
    regular_avg_commission DECIMAL(5, 4) DEFAULT 0,
    regular_performance_variance DECIMAL(15, 9) DEFAULT 0,
    
    -- Statistical analysis
    performance_difference DECIMAL(20, 9) DEFAULT 0,
    statistical_significance DECIMAL(8, 6) DEFAULT 0,
    correlation_coefficient DECIMAL(8, 6) DEFAULT 0,
    trend_analysis JSONB,
    confidence_interval JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced validator performance indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_validator_performance_address ON enhanced_validator_performance(validator_address);
CREATE INDEX IF NOT EXISTS idx_enhanced_validator_performance_epoch ON enhanced_validator_performance(epoch);
CREATE INDEX IF NOT EXISTS idx_enhanced_validator_performance_timestamp ON enhanced_validator_performance(timestamp);
CREATE INDEX IF NOT EXISTS idx_enhanced_validator_performance_jito ON enhanced_validator_performance(is_jito_enabled);
CREATE INDEX IF NOT EXISTS idx_mev_efficiency_address ON mev_efficiency_metrics(validator_address);
CREATE INDEX IF NOT EXISTS idx_mev_efficiency_epoch ON mev_efficiency_metrics(epoch);
CREATE INDEX IF NOT EXISTS idx_mev_efficiency_score ON mev_efficiency_metrics(overall_efficiency_score);
CREATE INDEX IF NOT EXISTS idx_validator_rankings_category ON validator_rankings(category);
CREATE INDEX IF NOT EXISTS idx_validator_rankings_rank ON validator_rankings(rank);
CREATE INDEX IF NOT EXISTS idx_validator_rankings_timestamp ON validator_rankings(timestamp);
CREATE INDEX IF NOT EXISTS idx_validator_comparisons_type ON validator_comparisons(comparison_type);
CREATE INDEX IF NOT EXISTS idx_validator_comparisons_timestamp ON validator_comparisons(timestamp);

-- MEV Reward Attribution Tables

-- MEV reward attributions table (stores detailed attribution analysis)
CREATE TABLE IF NOT EXISTS mev_reward_attributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_slot BIGINT NOT NULL,
    validator_address VARCHAR(44) NOT NULL,
    epoch INTEGER NOT NULL,
    total_rewards DECIMAL(18, 9) DEFAULT 0,
    
    -- Reward breakdown
    base_staking_rewards DECIMAL(18, 9) DEFAULT 0,
    mev_rewards DECIMAL(18, 9) DEFAULT 0,
    transaction_fees DECIMAL(18, 9) DEFAULT 0,
    priority_fees DECIMAL(18, 9) DEFAULT 0,
    
    -- Attribution metadata
    attribution_confidence DECIMAL(5, 4) DEFAULT 0,
    attribution_method VARCHAR(50),
    mev_probability DECIMAL(5, 4) DEFAULT 0,
    
    -- Analysis scores
    reward_anomaly_score DECIMAL(8, 4) DEFAULT 0,
    bundle_correlation DECIMAL(5, 4) DEFAULT 0,
    timing_pattern_score DECIMAL(5, 4) DEFAULT 0,
    
    -- Timestamps
    analysis_timestamp TIMESTAMPTZ DEFAULT NOW(),
    block_timestamp TIMESTAMPTZ,
    attribution_version VARCHAR(10) DEFAULT '1.0',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(block_slot, validator_address)
);

-- Parsed block rewards table (stores parsed block data)
CREATE TABLE IF NOT EXISTS parsed_block_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot BIGINT UNIQUE NOT NULL,
    block_hash VARCHAR(44),
    parent_slot BIGINT,
    block_time TIMESTAMPTZ,
    transaction_count INTEGER DEFAULT 0,
    
    -- Validator information
    validator_address VARCHAR(44),
    is_jito_enabled BOOLEAN DEFAULT false,
    
    -- Fee breakdown
    total_fees DECIMAL(18, 9) DEFAULT 0,
    transaction_fees DECIMAL(18, 9) DEFAULT 0,
    priority_fees DECIMAL(18, 9) DEFAULT 0,
    base_fees DECIMAL(18, 9) DEFAULT 0,
    compute_unit_fees DECIMAL(18, 9) DEFAULT 0,
    validator_rewards DECIMAL(18, 9) DEFAULT 0,
    
    -- MEV indicators
    arbitrage_count INTEGER DEFAULT 0,
    sandwich_count INTEGER DEFAULT 0,
    liquidation_count INTEGER DEFAULT 0,
    high_priority_fee_count INTEGER DEFAULT 0,
    dex_interaction_count INTEGER DEFAULT 0,
    
    -- Transaction patterns
    avg_fee DECIMAL(18, 9) DEFAULT 0,
    max_fee DECIMAL(18, 9) DEFAULT 0,
    high_fee_transactions INTEGER DEFAULT 0,
    
    -- DEX activity breakdown
    raydium_interactions INTEGER DEFAULT 0,
    orca_interactions INTEGER DEFAULT 0,
    serum_interactions INTEGER DEFAULT 0,
    jupiter_interactions INTEGER DEFAULT 0,
    
    parsed_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validator MEV earnings table (stores calculated MEV earnings)
CREATE TABLE IF NOT EXISTS validator_mev_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validator_address VARCHAR(44) NOT NULL,
    epoch_start INTEGER NOT NULL,
    epoch_end INTEGER NOT NULL,
    
    -- MEV earnings data
    total_mev_earnings DECIMAL(18, 9) DEFAULT 0,
    mev_blocks INTEGER DEFAULT 0,
    confidence_score DECIMAL(5, 4) DEFAULT 0,
    calculation_method VARCHAR(50),
    method_results JSONB,
    
    calculation_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(validator_address, epoch_start, epoch_end)
);

-- Historical MEV performance table (tracks MEV performance over time)
CREATE TABLE IF NOT EXISTS historical_mev_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validator_address VARCHAR(44) NOT NULL,
    epoch INTEGER NOT NULL,
    
    -- MEV performance metrics
    mev_revenue DECIMAL(18, 9) DEFAULT 0,
    mev_blocks INTEGER DEFAULT 0,
    total_blocks INTEGER DEFAULT 0,
    mev_block_percentage DECIMAL(5, 2) DEFAULT 0,
    
    -- Performance trends
    revenue_trend DECIMAL(8, 4) DEFAULT 0,
    block_trend DECIMAL(8, 4) DEFAULT 0,
    efficiency_trend DECIMAL(8, 4) DEFAULT 0,
    
    -- Comparative metrics
    network_mev_share DECIMAL(8, 6) DEFAULT 0,
    validator_type_rank INTEGER DEFAULT 0,
    network_rank INTEGER DEFAULT 0,
    
    -- Analysis metadata
    data_quality_score DECIMAL(5, 4) DEFAULT 0,
    analysis_confidence DECIMAL(5, 4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(validator_address, epoch)
);

-- Validator MEV profiles table (comprehensive validator MEV characteristics)
CREATE TABLE IF NOT EXISTS validator_mev_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validator_address VARCHAR(44) UNIQUE NOT NULL,
    
    -- Profile metadata
    profile_version VARCHAR(10) DEFAULT '1.0',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    data_epochs INTEGER DEFAULT 0,
    
    -- MEV capability assessment
    mev_capability_score DECIMAL(5, 2) DEFAULT 0,
    jito_optimization_score DECIMAL(5, 2) DEFAULT 0,
    bundle_success_rate DECIMAL(5, 4) DEFAULT 0,
    avg_mev_per_block DECIMAL(18, 9) DEFAULT 0,
    
    -- Performance characteristics
    consistency_score DECIMAL(5, 4) DEFAULT 0,
    volatility_score DECIMAL(5, 4) DEFAULT 0,
    growth_trend DECIMAL(8, 4) DEFAULT 0,
    seasonal_patterns JSONB,
    
    -- Attribution accuracy
    attribution_accuracy DECIMAL(5, 4) DEFAULT 0,
    confidence_intervals JSONB,
    model_performance JSONB,
    
    -- Competitive analysis
    peer_comparison JSONB,
    market_position VARCHAR(20),
    improvement_potential DECIMAL(5, 4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEV attribution indexes
CREATE INDEX IF NOT EXISTS idx_mev_reward_attributions_validator ON mev_reward_attributions(validator_address);
CREATE INDEX IF NOT EXISTS idx_mev_reward_attributions_epoch ON mev_reward_attributions(epoch);
CREATE INDEX IF NOT EXISTS idx_mev_reward_attributions_slot ON mev_reward_attributions(block_slot);
CREATE INDEX IF NOT EXISTS idx_mev_reward_attributions_timestamp ON mev_reward_attributions(analysis_timestamp);
CREATE INDEX IF NOT EXISTS idx_mev_reward_attributions_mev_rewards ON mev_reward_attributions(mev_rewards DESC);

CREATE INDEX IF NOT EXISTS idx_parsed_block_rewards_slot ON parsed_block_rewards(slot);
CREATE INDEX IF NOT EXISTS idx_parsed_block_rewards_validator ON parsed_block_rewards(validator_address);
CREATE INDEX IF NOT EXISTS idx_parsed_block_rewards_timestamp ON parsed_block_rewards(block_time);
CREATE INDEX IF NOT EXISTS idx_parsed_block_rewards_total_fees ON parsed_block_rewards(total_fees DESC);
CREATE INDEX IF NOT EXISTS idx_parsed_block_rewards_jito ON parsed_block_rewards(is_jito_enabled);

CREATE INDEX IF NOT EXISTS idx_validator_mev_earnings_validator ON validator_mev_earnings(validator_address);
CREATE INDEX IF NOT EXISTS idx_validator_mev_earnings_epoch_range ON validator_mev_earnings(epoch_start, epoch_end);
CREATE INDEX IF NOT EXISTS idx_validator_mev_earnings_total ON validator_mev_earnings(total_mev_earnings DESC);
CREATE INDEX IF NOT EXISTS idx_validator_mev_earnings_timestamp ON validator_mev_earnings(calculation_timestamp);

CREATE INDEX IF NOT EXISTS idx_historical_mev_performance_validator ON historical_mev_performance(validator_address);
CREATE INDEX IF NOT EXISTS idx_historical_mev_performance_epoch ON historical_mev_performance(epoch);
CREATE INDEX IF NOT EXISTS idx_historical_mev_performance_revenue ON historical_mev_performance(mev_revenue DESC);
CREATE INDEX IF NOT EXISTS idx_historical_mev_performance_rank ON historical_mev_performance(network_rank);

CREATE INDEX IF NOT EXISTS idx_validator_mev_profiles_capability ON validator_mev_profiles(mev_capability_score DESC);
CREATE INDEX IF NOT EXISTS idx_validator_mev_profiles_updated ON validator_mev_profiles(last_updated);