const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: false
});

async function createAdminUser() {
  try {
    console.log('Connecting to remote database...');
    console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating users table...');
      await pool.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
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
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_users_email ON users(email);
        CREATE INDEX idx_users_wallet ON users(wallet_address);
      `);
    }
    
    // Check if admin user exists
    const adminCheck = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      ['admin@mev.com']
    );
    
    if (adminCheck.rows.length > 0) {
      console.log('✅ Admin user already exists:');
      console.log('Email: admin@mev.com');
      console.log('Role:', adminCheck.rows[0].role);
      console.log('User ID:', adminCheck.rows[0].id);
    } else {
      // Create admin user
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      const result = await pool.query(`
        INSERT INTO users (email, password_hash, role, is_active, email_verified)
        VALUES ($1, $2, $3, true, true)
        RETURNING id, email, role;
      `, ['admin@mev.com', passwordHash, 'admin']);
      
      console.log('✅ Admin user created successfully:');
      console.log('Email: admin@mev.com');
      console.log('Password: admin123');
      console.log('Role:', result.rows[0].role);
      console.log('User ID:', result.rows[0].id);
    }
    
    // Create refresh_tokens table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    `);
    
    // Create token_blacklist table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist(token_hash);
    `);
    
    console.log('✅ All authentication tables verified');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

createAdminUser();
