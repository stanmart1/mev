const pool = require('../src/config/database.js');
const bcrypt = require('bcrypt');

async function createUsersTableAndAdmin() {
  try {
    // Create users table with all required fields
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        wallet_address VARCHAR(44) UNIQUE,
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        password_reset_required BOOLEAN DEFAULT false,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT email_or_wallet_required CHECK (
          (email IS NOT NULL AND password_hash IS NOT NULL) OR 
          wallet_address IS NOT NULL
        )
      );
    `);

    // Create refresh tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `);

    // Create token blacklist table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create API keys table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        key_hash VARCHAR(255) NOT NULL,
        permissions JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_used_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist(token_hash);
      CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
    `);

    // Hash password for admin user
    const adminPassword = 'admin123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Insert admin user
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = NOW()
      RETURNING id, email, role;
    `, ['admin@mev.com', passwordHash, 'admin']);

    console.log('✅ Admin user created successfully:');
    console.log('Email: admin@mev.com');
    console.log('Password: admin123');
    console.log('Role:', result.rows[0].role);
    console.log('User ID:', result.rows[0].id);

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await pool.end();
  }
}

createUsersTableAndAdmin();