// Test script to verify unlimited plan fix
const fetch = require('node-fetch');

async function testUnlimitedPlan() {
  // You'll need to provide a valid token for testing
  const token = process.env.TEST_TOKEN || 'YOUR_TOKEN_HERE';
  
  try {
    const response = await fetch('http://localhost:3001/api/usage/bot-minutes', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('❌ API request failed:', response.status, response.statusText);
      return;
    }
    
    const result = await response.json();
    const summary = result.data?.summary;
    
    console.log('📊 Bot Usage Summary:');
    console.log('- Plan Limit:', summary.monthlyBotMinutesLimit);
    console.log('- Remaining Minutes:', summary.remainingMinutes);
    console.log('- Is Unlimited?', summary.remainingMinutes === Number.MAX_SAFE_INTEGER);
    console.log('- Minutes Used:', summary.totalBillableMinutes);
    
    if (summary.remainingMinutes === Number.MAX_SAFE_INTEGER) {
      console.log('✅ Unlimited plan correctly detected!');
    } else if (summary.remainingMinutes === 0) {
      console.log('❌ Bug still present - showing 0 minutes for unlimited plan');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

console.log('🔍 Testing unlimited plan fix...');
console.log('Note: You need to set TEST_TOKEN environment variable with a valid auth token');
testUnlimitedPlan();