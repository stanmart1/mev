-- Add username field to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- Create unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
