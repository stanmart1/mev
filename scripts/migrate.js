const pool = require('../src/config/database');
const fs = require('fs');
const path = require('path');
const logger = require('../src/config/logger');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    logger.info('Running database migration...');
    await client.query(schema);
    
    await client.query('COMMIT');
    logger.info('Database migration completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = runMigration;