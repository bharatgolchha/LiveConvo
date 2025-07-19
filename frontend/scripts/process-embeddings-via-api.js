#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration
const LOCAL_URL = 'http://localhost:3000';
const PROD_URL = 'https://liveprompt.ai'; // Update with your actual production URL

const SUPABASE_URL = 'https://xkxjycccifwyxgtvflxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrYWp5Y2NjaWZ3eXhndHZmbHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0Mzk3NjUsImV4cCI6MjA1MzAxNTc2NX0.a0YCXM-V5t9iImT4V8DlnNJHxVVl-gfAa7xQOXQ-2m4';

async function processEmbeddings() {
  // Get email and password from command line arguments
  const email = process.argv[2];
  const password = process.argv[3];
  const useProduction = process.argv[4] === '--prod';
  
  if (!email || !password) {
    console.error('Usage: node process-embeddings-via-api.js <email> <password> [--prod]');
    console.error('Example: node process-embeddings-via-api.js user@example.com mypassword');
    console.error('Add --prod flag to use production URL instead of localhost');
    process.exit(1);
  }

  const baseUrl = useProduction ? PROD_URL : LOCAL_URL;
  console.log(`🌐 Using ${useProduction ? 'production' : 'local'} API: ${baseUrl}`);

  try {
    // Create Supabase client and authenticate
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('🔐 Authenticating...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    const token = authData.session?.access_token;
    if (!token) {
      throw new Error('No access token received');
    }

    console.log('✅ Authenticated successfully');

    // First, check the queue status
    console.log('\n📊 Checking embedding queue status...');
    const statusResponse = await fetch(`${baseUrl}/api/admin/process-embeddings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('Queue status:', status.queueStatus);
      console.log('Embeddings generated:', status.embeddingStats);
      
      const pendingCount = status.queueStatus.pending || 0;
      if (pendingCount === 0) {
        console.log('✅ No pending embeddings to process!');
        return;
      }
      
      console.log(`\n🔄 Found ${pendingCount} pending embeddings to process`);
    }

    // Process embeddings in batches
    let totalProcessed = 0;
    let hasMore = true;
    const batchSize = 10;

    while (hasMore) {
      console.log(`\n🚀 Processing batch of ${batchSize} embeddings...`);
      
      const response = await fetch(`${baseUrl}/api/admin/process-embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ batchSize })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error:', error);
        
        if (error.hint) {
          console.log('💡 Hint:', error.hint);
          console.log('\nTo fix this:');
          console.log('1. Go to your Vercel dashboard');
          console.log('2. Add PRODUCTION_SERVICE_ROLE_KEY environment variable');
          console.log('3. Get the value from: https://supabase.com/dashboard/project/xkxjycccifwyxgtvflxz/settings/api');
          console.log('4. Look for the "service_role" key (be careful, it has full access!)');
        }
        break;
      }

      const result = await response.json();
      console.log('✅ Batch complete:', result);
      
      totalProcessed += result.processed || 0;
      
      if (!result.processed || result.processed === 0) {
        hasMore = false;
        console.log('✅ No more pending items to process');
      } else {
        // Wait 2 seconds between batches
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n🎉 Finished! Total processed: ${totalProcessed} embeddings`);

    // Final status check
    console.log('\n📊 Final status check...');
    const finalStatusResponse = await fetch(`${baseUrl}/api/admin/process-embeddings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (finalStatusResponse.ok) {
      const finalStatus = await finalStatusResponse.json();
      console.log('Final queue status:', finalStatus.queueStatus);
      console.log('Final embeddings:', finalStatus.embeddingStats);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
processEmbeddings().catch(console.error);