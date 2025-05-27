import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get all sessions without any filters
    const { data: allSessions, error: allSessionsError } = await supabase
      .from('sessions')
      .select('*');
    
    // Get all users
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, email, current_organization_id, has_completed_onboarding');
    
    // Get all organizations
    const { data: allOrgs, error: allOrgsError } = await supabase
      .from('organizations')
      .select('id, name');
    
    return NextResponse.json({
      sessions: { data: allSessions, error: allSessionsError },
      users: { data: allUsers, error: allUsersError },
      organizations: { data: allOrgs, error: allOrgsError },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 