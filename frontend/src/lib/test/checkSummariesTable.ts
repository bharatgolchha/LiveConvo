#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

async function checkSummariesTable() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Checking summaries table structure...\n');

  try {
    // Get table info
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'summaries' });

    if (tableError) {
      console.error('Error getting table info:', tableError);
      return;
    }

    console.log('Table columns:', tableInfo);

    // Check constraints
    const { data: constraints, error: constraintError } = await supabase
      .rpc('get_table_constraints', { table_name: 'summaries' });

    if (constraintError) {
      console.error('Error getting constraints:', constraintError);
      return;
    }

    console.log('\nTable constraints:', constraints);

    // Check for session_id unique constraint
    const hasSessionIdConstraint = constraints?.some((c: { constraint_type: string; column_name: string }) => 
      c.constraint_type === 'UNIQUE' && c.column_name === 'session_id'
    );

    console.log('\n✅ Has session_id unique constraint:', hasSessionIdConstraint);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  checkSummariesTable();
}