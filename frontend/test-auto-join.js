// Test script for auto-join APIs
// Run with: node test-auto-join.js

// First, get your auth token from browser:
// 1. Open Chrome DevTools > Application > Local Storage
// 2. Find the key that contains 'auth-token' 
// 3. Copy the access_token value

const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace this
const BASE_URL = 'http://localhost:3000';

async function testAutoJoinAPIs() {
  console.log('Testing Auto-Join APIs...\n');

  // Test 1: Get auto-join logs
  console.log('1. Testing GET /api/calendar/auto-join/logs');
  try {
    const response = await fetch(`${BASE_URL}/api/calendar/auto-join/logs`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Get meeting status
  console.log('2. Testing GET /api/calendar/meeting-status');
  try {
    const response = await fetch(`${BASE_URL}/api/calendar/meeting-status`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Get notifications
  console.log('3. Testing GET /api/notifications');
  try {
    const response = await fetch(`${BASE_URL}/api/notifications?unread=true`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Test 4: Trigger auto-join worker (needs special auth)
  console.log('4. Testing POST /api/calendar/auto-join/worker');
  try {
    const response = await fetch(`${BASE_URL}/api/calendar/auto-join/worker`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer aj_secret_7f3d8b2c9e1a5f6d4b8c2e9a1f5d7b3c'
      }
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Helper to get auth token from localStorage
console.log(`
To get your auth token:
1. Open browser console (F12)
2. Run: 
   const authData = JSON.parse(localStorage.getItem('sb-ucvfgfbjcrxbzppwjpuu-auth-token'));
   console.log(authData.access_token);
3. Copy the token and replace AUTH_TOKEN above
`);

if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
  console.error('\n⚠️  Please set your AUTH_TOKEN first!\n');
} else {
  testAutoJoinAPIs();
}