-- Bundle submission tracking tables

CREATE TABLE IF NOT EXISTS jito_bundle_submissions (
    id SERIAL PRIMARY KEY,
    bundle_id VARCHAR(255) UNIQUE NOT NULL,
    success_probability DECIMAL(5,4),
    estimated_profit DECIMAL(20,10),
    tip_amount BIGINT,
    priority VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jito_batch_submissions (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(255) UNIQUE NOT NULL,
    total_bundles INTEGER,
    success_count INTEGER,
    total_expected_profit DECIMAL(20,10),
    average_success_rate DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundle_submissions_bundle_id ON jito_bundle_submissions(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_submissions_created_at ON jito_bundle_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_batch_submissions_batch_id ON jito_batch_submissions(batch_id);
