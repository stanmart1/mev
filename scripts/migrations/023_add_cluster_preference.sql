-- Add cluster preference to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_cluster VARCHAR(20) DEFAULT 'mainnet-beta' 
CHECK (preferred_cluster IN ('mainnet-beta', 'devnet', 'testnet'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_cluster ON users(preferred_cluster);

-- Update existing users to mainnet-beta
UPDATE users SET preferred_cluster = 'mainnet-beta' WHERE preferred_cluster IS NULL;
