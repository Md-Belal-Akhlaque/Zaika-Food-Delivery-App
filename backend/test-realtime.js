/**
 * Test script for Socket.io and BullMQ setup
 * Run this to verify everything is working correctly
 * 
 * Usage: node test-realtime.js
 */

import { createClient } from 'redis';

console.log('🧪 Testing Real-time Features Setup\n');

// Test 1: Redis Connection
async function testRedis() {
  console.log('📌 Test 1: Redis Connection');
  
  try {
    const client = createClient({
      url: 'redis://localhost:6379'
    });

    client.on('error', err => console.error('Redis Client Error:', err));

    await client.connect();
    console.log('✅ Redis connected successfully');

    // Test PING
    await client.set('test_key', 'test_value');
    const value = await client.get('test_key');
    
    if (value === 'test_value') {
      console.log('✅ Redis read/write successful');
    } else {
      console.log('❌ Redis read/write failed');
    }

    await client.del('test_key');
    await client.quit();
    
    console.log('✅ Redis test PASSED\n');
    return true;
  } catch (error) {
    console.log('❌ Redis test FAILED');
    console.log('   Error:', error.message);
    console.log('   Solution: Make sure Redis is running on localhost:6379\n');
    return false;
  }
}

// Test 2: BullMQ Queue Creation
async function testBullMQ() {
  console.log('📌 Test 2: BullMQ Queue Setup');
  
  try {
    const { Queue } = await import('bullmq');
    
    const connection = {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null
    };

    const testQueue = new Queue('test-queue', { connection });
    
    // Add a test job
    await testQueue.add('test-job', { message: 'Hello BullMQ' }, { delay: 1000 });
    console.log('✅ BullMQ job created successfully');

    // Check queue stats
    const jobs = await testQueue.getJobs(['waiting']);
    console.log(`✅ Found ${jobs.length} waiting job(s)`);

    // Clean up
    await testQueue.obliterate({ force: true });
    await testQueue.close();

    console.log('✅ BullMQ test PASSED\n');
    return true;
  } catch (error) {
    console.log('❌ BullMQ test FAILED');
    console.log('   Error:', error.message);
    console.log('   Solution: Redis must be running for BullMQ to work\n');
    return false;
  }
}

// Test 3: Socket.io Server Import
async function testSocketIO() {
  console.log('📌 Test 3: Socket.io Module');
  
  try {
    const { initSocket, emitToUser, emitToShop, emitToDeliveryPartner } = await import('./socket.js');
    
    if (typeof initSocket === 'function') {
      console.log('✅ Socket.io module imported successfully');
    } else {
      console.log('❌ Socket.io initSocket not a function');
      return false;
    }

    if (typeof emitToUser === 'function') {
      console.log('✅ emitToUser function available');
    } else {
      console.log('❌ emitToUser not available');
      return false;
    }

    if (typeof emitToShop === 'function') {
      console.log('✅ emitToShop function available');
    } else {
      console.log('❌ emitToShop not available');
      return false;
    }

    if (typeof emitToDeliveryPartner === 'function') {
      console.log('✅ emitToDeliveryPartner function available');
    } else {
      console.log('❌ emitToDeliveryPartner not available');
      return false;
    }

    console.log('✅ Socket.io module test PASSED\n');
    return true;
  } catch (error) {
    console.log('❌ Socket.io module test FAILED');
    console.log('   Error:', error.message);
    console.log('   Check that socket.js file exists and has correct exports\n');
    return false;
  }
}

// Test 4: Worker Module Import
async function testWorker() {
  console.log('📌 Test 4: Delivery Worker Module');
  
  try {
    const { startDeliveryWorker } = await import('./workers/deliveryWorker.js');
    
    if (typeof startDeliveryWorker === 'function') {
      console.log('✅ Delivery worker module imported successfully');
      console.log('✅ Worker test PASSED\n');
      return true;
    } else {
      console.log('❌ startDeliveryWorker not a function');
      return false;
    }
  } catch (error) {
    console.log('❌ Delivery worker module test FAILED');
    console.log('   Error:', error.message);
    console.log('   Check that workers/deliveryWorker.js exists\n');
    return false;
  }
}

// Main Test Runner
async function runTests() {
  console.log('═══════════════════════════════════════════\n');
  
  const results = {
    redis: await testRedis(),
    bullmq: await testBullMQ(),
    socket: await testSocketIO(),
    worker: await testWorker()
  };

  console.log('═══════════════════════════════════════════');
  console.log('📊 Test Summary:');
  console.log('═══════════════════════════════════════════');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;
  
  console.log(`Redis:    ${results.redis ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`BullMQ:   ${results.bullmq ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Socket.io:${results.socket ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Worker:   ${results.worker ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('───────────────────────────────────────────');
  console.log(`Total: ${passed}/${total} tests passed`);
  console.log('═══════════════════════════════════════════\n');

  if (passed === total) {
    console.log('🎉 All tests passed! Your real-time setup is ready.');
    console.log('\nNext steps:');
    console.log('1. Start the backend: npm run dev');
    console.log('2. Start the frontend: npm run dev');
    console.log('3. Test real-time features in the app');
  } else {
    console.log('⚠️  Some tests failed. Please fix the issues above.');
    console.log('\nCommon fixes:');
    console.log('- Install Redis: See REDIS_INSTALL.md');
    console.log('- Start Redis service: redis-server --service-start');
    console.log('- Check .env configuration');
    console.log('- Verify all dependencies are installed: npm install');
  }

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

