const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: '149.102.159.118',
  port: 54327,
  user: 'postgres',
  password: 'blqLo6a8hLaqLsUa5iTxScYNuauQ5lLnigwNeRWkCjLQgxl2s099OwG7vEZjH6uf',
  database: 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: false,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;