-- Add content versioning to education system

-- Add version column to learning_modules
ALTER TABLE learning_modules ADD COLUMN IF NOT EXISTS content_version INTEGER DEFAULT 1;
ALTER TABLE learning_modules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add version column to interactive_tutorials
ALTER TABLE interactive_tutorials ADD COLUMN IF NOT EXISTS content_version INTEGER DEFAULT 1;
ALTER TABLE interactive_tutorials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Track which version user completed
ALTER TABLE user_learning_progress ADD COLUMN IF NOT EXISTS completed_version INTEGER;
ALTER TABLE user_tutorial_progress ADD COLUMN IF NOT EXISTS completed_version INTEGER;

-- Create content version history table
CREATE TABLE IF NOT EXISTS content_version_history (
  id SERIAL PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL, -- 'module' or 'tutorial'
  content_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  changes_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Create index for version history
CREATE INDEX IF NOT EXISTS idx_version_history ON content_version_history(content_type, content_id, version DESC);

-- Function to increment version
CREATE OR REPLACE FUNCTION increment_content_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_version = OLD.content_version + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-versioning (optional, can be manual)
-- CREATE TRIGGER module_version_trigger
-- BEFORE UPDATE ON learning_modules
-- FOR EACH ROW
-- WHEN (OLD.* IS DISTINCT FROM NEW.*)
-- EXECUTE FUNCTION increment_content_version();
