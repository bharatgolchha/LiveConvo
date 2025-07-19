#!/usr/bin/env node

// Alternative approach: Create an API endpoint to invoke the edge function

const PRODUCTION_URL = 'https://xkxjycccifwyxgtvflxz.supabase.co';
const PRODUCTION_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrYWp5Y2NjaWZ3eXhndHZmbHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0Mzk3NjUsImV4cCI6MjA1MzAxNTc2NX0.a0YCXM-V5t9iImT4V8DlnNJHxVVl-gfAa7xQOXQ-2m4';

async function invokeFunctionDirectly() {
  try {
    console.log('🚀 Attempting to invoke edge function directly...');
    
    // First, we need to authenticate
    const authResponse = await fetch(`${PRODUCTION_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': PRODUCTION_ANON_KEY
      },
      body: JSON.stringify({
        email: 'your-email@example.com', // Replace with your actual email
        password: 'your-password' // Replace with your actual password
      })
    });

    if (!authResponse.ok) {
      throw new Error('Authentication failed - please update email/password in the script');
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    console.log('✅ Authenticated successfully');

    // Now invoke the edge function
    const response = await fetch(`${PRODUCTION_URL}/functions/v1/process-embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ batchSize: 5 })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Edge function response:', result);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Alternative: Just check the embedding queue status
async function checkEmbeddingQueueStatus() {
  console.log('\n📊 Checking embedding queue status...');
  
  try {
    // This is a simple approach - we'll create a test endpoint
    console.log('To check the embedding queue status, you can:');
    console.log('1. Go to Supabase SQL Editor');
    console.log('2. Run this query:');
    console.log(`
SELECT 
  status, 
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM embedding_queue
GROUP BY status
ORDER BY status;
    `);
    console.log('\n3. To see details of pending items:');
    console.log(`
SELECT 
  id,
  table_name,
  record_id,
  content_length,
  created_at,
  error_message
FROM embedding_queue
WHERE status = 'pending'
ORDER BY created_at
LIMIT 10;
    `);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run both approaches
console.log('⚠️  NOTE: You need to either:');
console.log('1. Get the production service_role key from Supabase dashboard');
console.log('2. Update the email/password in this script to use authentication');
console.log('');

checkEmbeddingQueueStatus();