const pool = require('../src/config/database.js');
const bcrypt = require('bcrypt');

async function fixAuthTables() {
  try {
    // Drop existing users table and recreate with proper schema
    await pool.query('DROP TABLE IF EXISTS api_keys CASCADE;');
    await pool.query('DROP TABLE IF EXISTS refresh_tokens CASCADE;');
    await pool.query('DROP TABLE IF EXISTS token_blacklist CASCADE;');
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');

    // Create users table with all required fields
    await pool.query(`
      CREATE TABLE users (
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
      CREATE TABLE refresh_tokens (
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
      CREATE TABLE token_blacklist (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create API keys table
    await pool.query(`
      CREATE TABLE api_keys (
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
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_wallet ON users(wallet_address);
      CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
      CREATE INDEX idx_token_blacklist_hash ON token_blacklist(token_hash);
      CREATE INDEX idx_api_keys_user ON api_keys(user_id);
    `);

    // Hash password for admin user
    const adminPassword = 'admin123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Insert admin user
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, email, role;
    `, ['admin@mev.com', passwordHash, 'admin']);

    console.log('✅ Authentication tables created successfully');
    console.log('✅ Admin user created:');
    console.log('Email: admin@mev.com');
    console.log('Password: admin123');
    console.log('Role:', result.rows[0].role);
    console.log('User ID:', result.rows[0].id);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixAuthTables();