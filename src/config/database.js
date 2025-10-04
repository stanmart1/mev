const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: false,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000,
  application_name: 'mev-analytics'
});

let isConnected = false;

pool.on('connect', (client) => {
  if (!isConnected) {
    console.log('✅ Connected to PostgreSQL database');
    isConnected = true;
  }
  client.query('SET statement_timeout = 30000');
});

pool.on('acquire', () => {
  const activeCount = pool.totalCount - pool.idleCount;
  if (activeCount > 15) {
    console.warn(`⚠️  High connection usage: ${activeCount}/${pool.totalCount}`);
  }
});

pool.on('error', (err, client) => {
  console.error('❌ Database pool error:', err.message);
  isConnected = false;
});

pool.on('remove', () => {
  console.log('🔌 Connection removed from pool');
});

process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
});

process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

module.exports = pool;