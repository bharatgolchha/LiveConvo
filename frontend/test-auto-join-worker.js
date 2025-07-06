#!/usr/bin/env node

/**
 * Test script for the auto-join worker endpoint
 * 
 * Usage:
 * 1. Replace 'YOUR_CRON_SECRET_HERE' with your actual CRON_SECRET
 * 2. Run: node test-auto-join-worker.js
 */

const CRON_SECRET = 'YOUR_CRON_SECRET_HERE'; // Replace with your actual CRON_SECRET
const ENDPOINT_URL = 'https://www.liveprompt.ai/api/calendar/auto-join/worker';

async function testAutoJoinWorker() {
  console.log('🚀 Testing auto-join worker endpoint...');
  console.log(`📍 URL: ${ENDPOINT_URL}`);
  console.log(`🔑 Using CRON_SECRET: ${CRON_SECRET.substring(0, 10)}...`);
  console.log('-----------------------------------\n');

  try {
    const startTime = Date.now();
    
    const response = await fetch(ENDPOINT_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const elapsedTime = Date.now() - startTime;
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`⏱️  Response Time: ${elapsedTime}ms`);
    console.log(`📋 Response Headers:`);
    console.log(`   - Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   - Date: ${response.headers.get('date')}`);
    console.log('');

    const responseText = await response.text();
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('✅ Response Body (JSON):');
      console.log(JSON.stringify(responseData, null, 2));
      
      // Log specific details if available
      if (responseData.meetingsProcessed !== undefined) {
        console.log(`\n📈 Meetings Processed: ${responseData.meetingsProcessed}`);
      }
      if (responseData.errors && responseData.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered: ${responseData.errors.length}`);
        responseData.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
    } catch (parseError) {
      console.log('📄 Response Body (Text):');
      console.log(responseText);
    }

    if (response.ok) {
      console.log('\n✅ Test PASSED - Worker endpoint responded successfully');
    } else {
      console.log('\n❌ Test FAILED - Worker endpoint returned an error');
    }

  } catch (error) {
    console.error('\n❌ Test FAILED - Request error:');
    console.error(`   Error Type: ${error.name}`);
    console.error(`   Error Message: ${error.message}`);
    
    if (error.cause) {
      console.error(`   Error Cause: ${error.cause}`);
    }
    
    // Check for common issues
    if (error.message.includes('fetch is not defined')) {
      console.error('\n💡 Tip: This script requires Node.js 18+ for native fetch support.');
      console.error('   Alternatively, install node-fetch: npm install node-fetch');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Connection refused. Check if the server is running.');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Tip: Domain not found. Check the URL.');
    }
  }

  console.log('\n-----------------------------------');
  console.log('Test completed at:', new Date().toISOString());
}

// Check if CRON_SECRET was replaced
if (CRON_SECRET === 'YOUR_CRON_SECRET_HERE') {
  console.error('⚠️  ERROR: Please replace YOUR_CRON_SECRET_HERE with your actual CRON_SECRET');
  console.error('   Edit this file and update line 11');
  process.exit(1);
}

// Run the test
testAutoJoinWorker();