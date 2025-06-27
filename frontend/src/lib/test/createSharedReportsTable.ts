#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

async function createSharedReportsTable() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔧 Creating shared_reports table...\n');

  const sql = `
    -- Create shared_reports table for sharing meeting reports with customizable access
    CREATE TABLE IF NOT EXISTS shared_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      share_token VARCHAR(255) UNIQUE NOT NULL,
      shared_tabs TEXT[] NOT NULL DEFAULT '{}',
      message TEXT,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      accessed_count INTEGER DEFAULT 0,
      last_accessed_at TIMESTAMP WITH TIME ZONE
    );

    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS idx_shared_reports_token ON shared_reports(share_token);
    CREATE INDEX IF NOT EXISTS idx_shared_reports_user_id ON shared_reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_shared_reports_session_id ON shared_reports(session_id);
    CREATE INDEX IF NOT EXISTS idx_shared_reports_expires_at ON shared_reports(expires_at);

    -- Enable RLS
    ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can create shares for their sessions" ON shared_reports;
    DROP POLICY IF EXISTS "Users can view their own shares" ON shared_reports;
    DROP POLICY IF EXISTS "Users can update their own shares" ON shared_reports;
    DROP POLICY IF EXISTS "Users can delete their own shares" ON shared_reports;

    -- Users can create shares for their own sessions
    CREATE POLICY "Users can create shares for their sessions" ON shared_reports
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM sessions 
          WHERE sessions.id = shared_reports.session_id 
          AND sessions.user_id = auth.uid()
        )
      );

    -- Users can view their own shares
    CREATE POLICY "Users can view their own shares" ON shared_reports
      FOR SELECT USING (user_id = auth.uid());

    -- Users can update their own shares
    CREATE POLICY "Users can update their own shares" ON shared_reports
      FOR UPDATE USING (user_id = auth.uid());

    -- Users can delete their own shares
    CREATE POLICY "Users can delete their own shares" ON shared_reports
      FOR DELETE USING (user_id = auth.uid());
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If RPC doesn't exist, try direct query (this will only work with service role key)
      console.log('⚠️  exec_sql RPC not available, attempting direct query...');
      
      // Split into individual statements
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.from('shared_reports').select('*').limit(0);
          
          if (stmtError?.code === '42P01') {
            console.error('❌ Table creation failed. Please run the migration manually in Supabase dashboard.');
            console.log('\n📋 Copy this SQL and run it in your Supabase SQL editor:');
            console.log('\n' + sql);
            return;
          }
        }
      }
    }
    
    // Test if table exists
    const { error: testError } = await supabase
      .from('shared_reports')
      .select('*')
      .limit(0);
    
    if (testError) {
      console.error('❌ Table verification failed:', testError);
      console.log('\n📋 Please run this SQL in your Supabase dashboard:');
      console.log('\n' + sql);
    } else {
      console.log('✅ shared_reports table created successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    console.log('\n📋 Please run this SQL in your Supabase dashboard:');
    console.log('\n' + sql);
  }
}

// Run if called directly
if (require.main === module) {
  createSharedReportsTable();
}