const pool = require('./config/database');
const SolanaService = require('./services/solanaService');
const TransactionMonitor = require('./services/transactionMonitor');
const logger = require('./config/logger');

async function testConnections() {
  console.log('Testing MEV Analytics Platform connections...\n');
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully:', result.rows[0].now);
    client.release();
    
    // Test Solana connection
    console.log('\n2. Testing Solana connection...');
    const solanaService = new SolanaService();
    await solanaService.initialize();
    const slot = await solanaService.getCurrentSlot();
    console.log('✅ Solana connected successfully, current slot:', slot);
    
    // Test transaction monitor initialization
    console.log('\n3. Testing transaction monitor...');
    const monitor = new TransactionMonitor();
    console.log('✅ Transaction monitor initialized successfully');
    
    console.log('\n🎉 All systems operational! Ready to start MEV monitoring.');
    
    // Cleanup
    solanaService.disconnect();
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testConnections()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testConnections;