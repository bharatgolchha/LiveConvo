import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Test 1: Check plans table
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*');
    
    // Test 2: Check users table structure
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    // Test 3: Check organizations table structure
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    return NextResponse.json({
      plans: { data: plans, error: plansError },
      users: { data: users, error: usersError },
      organizations: { data: orgs, error: orgsError },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 