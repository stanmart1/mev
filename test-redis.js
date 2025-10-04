require('dotenv').config();
const cache = require('./src/services/redisCacheService');
const { limiter } = require('./src/services/redisRateLimiter');

async function testRedis() {
  console.log('Testing Redis connection...\n');

  // Wait for connection
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test Cache
  console.log('1. Testing Cache Service:');
  console.log('   Connection status:', cache.isConnected ? '✅ Connected' : '❌ Not connected');
  
  if (cache.isConnected) {
    await cache.set('test-key', { message: 'Hello Redis!' }, 60);
    const value = await cache.get('test-key');
    console.log('   Set/Get test:', value ? '✅ Working' : '❌ Failed');
    console.log('   Retrieved value:', value);
    
    const stats = await cache.getStats();
    console.log('   Cache stats:', `${stats.size} keys`);
  }

  console.log('\n2. Testing Rate Limiter:');
  console.log('   Connection status:', limiter.isConnected ? '✅ Connected' : '❌ Not connected');
  
  if (limiter.isConnected) {
    const result = await limiter.check('test-user', 5, 60);
    console.log('   Rate limit test:', result.allowed ? '✅ Working' : '❌ Failed');
    console.log('   Remaining requests:', result.remaining);
  }

  console.log('\n✅ Redis test complete!');
  
  // Cleanup
  await cache.disconnect();
  await limiter.disconnect();
  process.exit(0);
}

testRedis().catch(err => {
  console.error('❌ Redis test failed:', err.message);
  process.exit(1);
});
