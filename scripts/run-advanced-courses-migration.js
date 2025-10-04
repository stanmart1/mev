const pool = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const migrationPath = path.join(__dirname, 'migrations/024_add_advanced_courses.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Adding 7 advanced courses...');
    await client.query(migration);
    
    await client.query('COMMIT');
    console.log('✅ Advanced courses added successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
